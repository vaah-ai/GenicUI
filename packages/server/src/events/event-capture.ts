/**
 * Event capture from Custom Elements — F19.
 *
 * Validates inbound component events against the trust boundary:
 * - F19-AC1: Requires `composed: true` for cross-Shadow-DOM capture
 * - F19-AC2: Validates event payload against declared event schema
 * - F19-AC3: Rate-limits to 200 events/sec per component
 *
 * On success, produces a `COMPONENT_EVENT` frame that is forwarded
 * to matching subscriptions via the `EventSubscriptionManager`.
 *
 * @module @genicui/server/events/event-capture
 * @see {F19} — Event capture from Custom Elements
 */

import { Errors } from "@sinclair/typebox/errors";
import type { TSchema } from "@sinclair/typebox";
import type { ValueErrorIterator } from "@sinclair/typebox/errors";

import type { ComponentEvent } from "../mcp/subscribe-handler.js";
import { TokenBucket } from "./rate-limiter.js";

/**
 * Count the number of errors in a ValueErrorIterator.
 */
function countErrors(iterator: ValueErrorIterator): number {
  let count = 0;
  for (const _ of iterator) {
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single event drop reason.
 */
export type DropReason = "not_composed" | "schema_invalid" | "rate_limited";

/**
 * Result of capturing a component event.
 */
export interface CaptureResult {
  /** True if the event was captured successfully. */
  readonly captured: boolean;

  /** The component event (only when captured is true). */
  readonly event?: ComponentEvent;

  /** Reason the event was dropped (only when captured is false). */
  readonly reason?: DropReason;

  /** Number of events dropped for this component (accumulated). */
  readonly dropCount: number;
}

/**
 * Event schema declaration for a component.
 * Maps event action names to TypeBox schemas for the event detail payload.
 */
export interface ComponentEventSchemas {
  /** The action name (e.g., "row_selected"). */
  readonly [actionName: string]: TSchema;
}

// ---------------------------------------------------------------------------
// EventCapture
// ---------------------------------------------------------------------------

/**
 * Captures and validates component events from Custom Elements.
 *
 * Each component registers its event schemas once. On each inbound
 * event, the capture flow:
 * 1. Checks `composed: true` (F19-AC1)
 * 2. Rate-limits via TokenBucket (F19-AC3)
 * 3. Validates payload against the declared schema (F19-AC2)
 * 4. Returns the validated ComponentEvent for downstream routing
 *
 * @see {F19} — Event capture from Custom Elements
 */
export class EventCapture {
  /** Event schemas per component: componentId -> actionName -> TSchema. */
  private readonly schemas = new Map<string, Map<string, TSchema>>();

  /** Per-component rate limiter: componentId -> TokenBucket. */
  private readonly rateLimiters = new Map<string, TokenBucket>();

  /**
   * Register event schemas for a component.
   *
   * @param componentId — the component to register schemas for
   * @param eventSchemas — a map of action name to TypeBox schema
   */
  public registerComponentEvents(
    componentId: string,
    eventSchemas: ComponentEventSchemas,
  ): void {
    const schemaMap = new Map<string, TSchema>();

    for (const [actionName, schema] of Object.entries(eventSchemas)) {
      schemaMap.set(actionName, schema);
    }

    this.schemas.set(componentId, schemaMap);

    // Initialize rate limiter if not already present
    if (!this.rateLimiters.has(componentId)) {
      this.rateLimiters.set(componentId, new TokenBucket());
    }
  }

  /**
   * Capture a component event.
   *
   * Validates:
   * 1. `composed: true` — required for cross-Shadow-DOM capture (F19-AC1)
   * 2. Rate limit — 200 events/sec per component (F19-AC3)
   * 3. Schema — payload must match the declared event schema (F19-AC2)
   *
   * @param componentId — the component that emitted the event
   * @param action — the event action name (e.g., "row_selected")
   * @param detail — the event detail payload
   * @param composed — whether the event was dispatched with `composed: true`
   * @returns the capture result with event data or drop reason
   */
  public capture(
    componentId: string,
    action: string,
    detail: Record<string, unknown>,
    composed: boolean,
  ): CaptureResult {
    // F19-AC1: composed:true required for cross-Shadow-DOM capture
    if (!composed) {
      const dropCount = this.getDropCount(componentId);
      return {
        captured: false,
        reason: "not_composed",
        dropCount,
      };
    }

    // F19-AC3: Per-component rate limit (200/s)
    const limiter = this.getOrCreateRateLimiter(componentId);
    const rateResult = limiter.allow();

    if (!rateResult.allowed) {
      return {
        captured: false,
        reason: "rate_limited",
        dropCount: rateResult.dropCount,
      };
    }

    // F19-AC2: Validate payload against declared schema
    const schema = this.getSchema(componentId, action);

    if (schema !== undefined) {
      // Schema is declared — validate the payload
      const errors: ValueErrorIterator = Errors(schema, detail);
      const errorCount = countErrors(errors);

      if (errorCount > 0) {
        const dropCount = this.getDropCount(componentId);
        return {
          captured: false,
          reason: "schema_invalid",
          dropCount,
        };
      }
    }
    // If no schema is registered, allow the event through (YAGNI —
    // components may emit events not pre-registered in the catalog)

    // Event passed all checks — return validated component event
    return {
      captured: true,
      event: { componentId, action, detail },
      dropCount: rateResult.dropCount,
    };
  }

  /**
   * Get the total drop count for a component (from its rate limiter).
   */
  private getDropCount(componentId: string): number {
    return this.rateLimiters.get(componentId)?.dropCount ?? 0;
  }

  /**
   * Get or create a rate limiter for the given component.
   */
  private getOrCreateRateLimiter(componentId: string): TokenBucket {
    let limiter = this.rateLimiters.get(componentId);
    if (!limiter) {
      limiter = new TokenBucket();
      this.rateLimiters.set(componentId, limiter);
    }
    return limiter;
  }

  /**
   * Get the schema for a specific action of a component.
   */
  private getSchema(componentId: string, action: string): TSchema | undefined {
    const schemaMap = this.schemas.get(componentId);
    if (!schemaMap) {
      return undefined;
    }
    return schemaMap.get(action);
  }

  /**
   * Remove all state for a component (called on unmount).
   */
  public onComponentUnmount(componentId: string): void {
    this.schemas.delete(componentId);
    const limiter = this.rateLimiters.get(componentId);
    if (limiter) {
      limiter.stop();
      this.rateLimiters.delete(componentId);
    }
  }

  /**
   * Clear all state. Useful for testing.
   */
  public clear(): void {
    for (const limiter of this.rateLimiters.values()) {
      limiter.stop();
    }
    this.schemas.clear();
    this.rateLimiters.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Global event capture instance.
 *
 * For WS transport (future), create a new EventCapture per session.
 */
export const eventCapture = new EventCapture();
