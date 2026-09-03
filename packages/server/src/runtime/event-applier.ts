/**
 * Server-side event applier — F24.
 *
 * Applies inbound UPDATE_COMPONENT ops to canonical state with:
 * - Atomic apply (no torn reads) via per-componentId locks (F24-AC1)
 * - STATE_SNAPSHOT fallback on patch failure (F24-AC2)
 * - Schema validation post-apply with rollback on failure (F24-AC3)
 * - Idempotency by sequence number — duplicates dropped silently (F24-AC4)
 *
 * @module @genicui/server/runtime/event-applier
 *
 * @see {F24} — Server-side event application
 * @see {F24-AC1} — Atomic apply (no torn reads)
 * @see {F24-AC2} — Failed apply -> STATE_SNAPSHOT fallback
 * @see {F24-AC3} — Schema validation post-apply; rollback on failure
 * @see {F24-AC4} — Idempotency by seq (drop duplicates)
 */

import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { JsonPatchEngine } from '@genicui/core';
import type { Operation } from 'fast-json-patch';

import { componentStore } from '../mcp/component-store.js';
import type { InternalEventBus } from '../bus/event-bus.js';
import { GENICUI_ERROR_CODES } from '../mcp/tool-registry.js';
import type {
  ApplyEventOptions,
  ApplyEventResult,
  ApplyEventError,
  ApplyEventOutcome,
} from './types.js';

// ---------------------------------------------------------------------------
// Event Applier
// ---------------------------------------------------------------------------

/**
 * Server-side event applier.
 *
 * Per-session instance that applies JSON patches to component state
 * atomically, validates against registered schemas, and emits
 * frames via the internal event bus.
 *
 * @see {F24} — Server-side event application
 */
export class EventApplier {
  /** Seen sequence numbers per channel — for idempotency (F24-AC4). */
  readonly #seenSeqs = new Map<string, Set<bigint>>();

  /** Schema registry: componentId -> TypeBox schema. */
  readonly #schemas = new Map<string, TSchema>();

  /** Whether the applier has been disposed. */
  #disposed = false;

  /**
   * Create a new event applier.
   *
   * @param bus — the internal event bus for emitting frames
   */
  constructor(private readonly bus: InternalEventBus) {}

  /**
   * Register a TypeBox schema for a component.
   *
   * The schema is used for post-apply validation (F24-AC3).
   * If a patch produces state that violates the schema, the
   * applier rolls back and returns an error.
   *
   * @param componentId — the component to associate with the schema
   * @param schema — the TypeBox schema for the component's props
   */
  registerSchema(componentId: string, schema: TSchema): void {
    this.#schemas.set(componentId, schema);
  }

  /**
   * Apply an event to canonical state.
   *
   * Flow:
   * 1. Idempotency check — drop if seq already seen (F24-AC4)
   * 2. Acquire per-componentId lock (F24-AC1)
   * 3. Apply patches via JsonPatchEngine
   * 4. On patch failure, emit STATE_SNAPSHOT (F24-AC2)
   * 5. Validate new state against schema; rollback on failure (F24-AC3)
   * 6. Update store, broadcast STATE_DELTA, record seq
   * 7. Release lock
   *
   * @param options — the event to apply
   * @returns the application result or error
   */
  async apply(
    options: ApplyEventOptions,
  ): Promise<ApplyEventOutcome> {
    if (this.#disposed) {
      return { error: this.#errorNotFound(options.componentId) };
    }

    const { channel, componentId, seq, patches } = options;

    // F24-AC4: Idempotency — drop duplicates silently
    if (this.hasSeen(channel, seq)) {
      return {
        type: 'STATE_DELTA',
        patch: [],
        seq,
      };
    }

    // Empty patches — nothing to do, record seq and return
    if (patches.length === 0) {
      this.#markSeen(channel, seq);
      return { type: 'STATE_DELTA', patch: [], seq };
    }

    // Get the component — must exist
    const component = componentStore.get(componentId);
    if (!component) {
      return { error: this.#errorNotFound(componentId) };
    }

    // F24-AC1: Acquire per-componentId lock for atomic apply
    await componentStore.acquireLock(componentId);

    try {
      // Re-read current state under the lock (most recent)
      const currentComponent = componentStore.get(componentId);
      if (!currentComponent) {
        return { error: this.#errorNotFound(componentId) };
      }

      const currentProps = currentComponent.props as Record<string, unknown>;

      // F24-AC2: Try to apply patches; on failure, emit STATE_SNAPSHOT
      const engine = new JsonPatchEngine();
      let newProps: Record<string, unknown>;

      try {
        const result = engine.apply(patches, currentProps);
        newProps = result as Record<string, unknown>;
      } catch {
        // Patch failed — fall back to STATE_SNAPSHOT (F24-AC2)
        this.#markSeen(channel, seq);
        this.bus.emit(channel, 'STATE_SNAPSHOT', currentProps);

        return {
          type: 'STATE_SNAPSHOT',
          snapshot: currentProps,
          seq,
        };
      }

      // F24-AC3: Schema validation post-apply
      const schema = this.#schemas.get(componentId);
      if (schema !== undefined) {
        const isValid = Value.Check(schema, newProps);
        if (!isValid) {
          // Rollback: state was never written, so no explicit rollback needed.
          // Return error with field-level details.
          const errors = Value.Errors(schema, newProps);
          return {
            error: {
              code: GENICUI_ERROR_CODES.props_invalid,
              message: `Schema validation failed after applying patches to "${componentId}"`,
              details: [...errors].map((e) => e.toString()),
            },
          };
        }
      }

      // Update the store with new state (immutable)
      await componentStore.update(componentId, newProps);

      // Broadcast STATE_DELTA via event bus
      this.bus.emit(channel, 'STATE_DELTA', patches as unknown);

      // Record seq for idempotency (F24-AC4)
      this.#markSeen(channel, seq);

      return {
        type: 'STATE_DELTA',
        patch: patches as unknown as Operation[],
        seq,
      };
    } finally {
      componentStore.releaseLock(componentId);
    }
  }

  /**
   * Check if a sequence number has been seen for a channel (F24-AC4).
   *
   * @param channel — the component channel
   * @param seq — the sequence number
   * @returns true if already processed
   */
  hasSeen(channel: string, seq: bigint): boolean {
    const seqs = this.#seenSeqs.get(channel);
    return seqs?.has(seq) ?? false;
  }

  /**
   * Mark a sequence number as seen for a channel (F24-AC4).
   */
  #markSeen(channel: string, seq: bigint): void {
    let seqs = this.#seenSeqs.get(channel);
    if (seqs === undefined) {
      seqs = new Set<bigint>();
      this.#seenSeqs.set(channel, seqs);
    }
    seqs.add(seq);
  }

  /**
   * Dispose the applier, preventing further applications.
   */
  dispose(): void {
    this.#disposed = true;
    this.#seenSeqs.clear();
    this.#schemas.clear();
  }

  /**
   * Build a "component not found" error.
   */
  #errorNotFound(componentId: string): ApplyEventError {
    return {
      code: GENICUI_ERROR_CODES.component_not_found,
      message: `Component "${componentId}" not found`,
    };
  }
}
