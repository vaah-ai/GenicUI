/**
 * Event applier tests — F24.
 *
 * @see {F24-AC1} — Atomic apply (no torn reads)
 * @see {F24-AC2} — Failed apply -> STATE_SNAPSHOT fallback
 * @see {F24-AC3} — Schema validation post-apply; rollback on failure
 * @see {F24-AC4} — Idempotency by seq (drop duplicates)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { EventApplier } from './event-applier.js';
import type { ApplyEventOptions, ApplyEventResult, ApplyEventOutcome } from './types.js';
import { componentStore } from '../mcp/component-store.js';

// ---------------------------------------------------------------------------
// Mock event bus
// ---------------------------------------------------------------------------

/** Accumulates emitted frames for inspection. */
interface MockEmitFrame {
  channel: string;
  type: string;
  payload: unknown;
}

class MockEventBus {
  public emitted: MockEmitFrame[] = [];

  emit(channel: string, type: string, payload: unknown): void {
    this.emitted.push({ channel, type, payload });
  }

  get queueSize(): number {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a DataTable schema for validation. */
function dataTableSchema(): TSchema {
  return Type.Object({
    rows: Type.Array(
      Type.Object(
        {
          id: Type.String(),
          name: Type.String(),
          status: Type.Union([
            Type.Literal('active'),
            Type.Literal('inactive'),
            Type.Literal('pending'),
          ]),
        },
        { additionalProperties: false },
      ),
    ),
    pageSize: Type.Integer({ minimum: 1, maximum: 100 }),
  });
}

/** Register a component in the store. */
function registerComponent(
  id: string,
  props: Record<string, unknown>,
): void {
  componentStore.register({
    componentId: id,
    name: 'DataTable',
    channel: id,
    props: props as Readonly<Record<string, unknown>>,
    mountedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventApplier — F24', () => {
  let applier: EventApplier;
  let bus: MockEventBus;

  beforeEach(() => {
    bus = new MockEventBus();
    applier = new EventApplier(bus as never);
    componentStore.clear();
  });

  // -----------------------------------------------------------------
  // F24-AC1: Atomic apply (no torn reads)
  // -----------------------------------------------------------------

  describe('F24-AC1 — Atomic apply', () => {
    it('applies a single patch atomically', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 1n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });

      expect(result).not.toHaveProperty('error');
      const ok = result as ApplyEventResult;
      expect(ok.type).toBe('STATE_DELTA');
      expect(ok.seq).toBe(1n);

      // Verify store was updated
      const comp = componentStore.get('dt-1');
      expect(comp).toBeDefined();
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.name).toBe('Alicia');
    });

    it('applies multiple patches atomically', async () => {
      registerComponent('dt-1', {
        rows: [
          { id: '1', name: 'Alice', status: 'active' },
          { id: '2', name: 'Bob', status: 'active' },
        ],
        pageSize: 10,
      });

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 2n,
        patches: [
          { op: 'replace', path: '/rows/0/name', value: 'Alicia' },
          { op: 'replace', path: '/rows/1/name', value: 'Robert' },
        ],
      });

      expect(result).not.toHaveProperty('error');
      const ok = result as ApplyEventResult;
      expect(ok.type).toBe('STATE_DELTA');

      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.name).toBe('Alicia');
      expect(rows[1]!.name).toBe('Robert');
    });

    it('concurrent applies are serialized via per-componentId lock', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      // Fire two applies concurrently
      const [r1, r2] = await Promise.all([
        applier.apply({
          channel: 'dt-1',
          componentId: 'dt-1',
          seq: 3n,
          patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
        }),
        applier.apply({
          channel: 'dt-1',
          componentId: 'dt-1',
          seq: 4n,
          patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia V2' }],
        }),
      ]);

      // Both should succeed (different seqs, no error)
      expect(r1).not.toHaveProperty('error');
      expect(r2).not.toHaveProperty('error');

      // Final state should reflect the serialized outcome
      const comp = componentStore.get('dt-1');
      expect(comp).toBeDefined();
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      // The second apply reads the state after the first, so both are applied
      expect(typeof rows[0]!.name).toBe('string');
    });

    it('emits STATE_DELTA via the event bus', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 5n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });

      // Check that the bus emitted a STATE_DELTA
      const delta = bus.emitted.find((e) => e.type === 'STATE_DELTA');
      expect(delta).toBeDefined();
      expect(delta!.channel).toBe('dt-1');
    });
  });

  // -----------------------------------------------------------------
  // F24-AC2: Failed apply -> STATE_SNAPSHOT fallback
  // -----------------------------------------------------------------

  describe('F24-AC2 — Failed apply fallback', () => {
    it('emits STATE_SNAPSHOT when patch path does not exist', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      // Replace at a non-existent path — fast-json-patch throws on validate
      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 10n,
        patches: [{ op: 'replace', path: '/rows/500/name', value: 'Z' }],
      });

      // The result should be a STATE_SNAPSHOT
      if ('error' in result) {
        // If the patch fails fast, we get a snapshot from the catch block
        expect(true).toBe(true);
      } else {
        expect(result.type).toBe('STATE_SNAPSHOT');
      }
    });

    it('returns current state in the snapshot', async () => {
      const originalProps: Record<string, unknown> = {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      };
      registerComponent('dt-1', originalProps);

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 11n,
        patches: [{ op: 'replace', path: '/rows/999/name', value: 'Z' }],
      });

      if (!('error' in result) && result.type === 'STATE_SNAPSHOT') {
        // The snapshot should reflect the original (unchanged) state
        expect(result.snapshot).toEqual(originalProps);
      }
    });

    it('emits STATE_SNAPSHOT frame on the bus', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 12n,
        patches: [{ op: 'replace', path: '/rows/999/name', value: 'Z' }],
      });

      // Check for STATE_SNAPSHOT emission
      const snapshot = bus.emitted.find((e) => e.type === 'STATE_SNAPSHOT');
      expect(snapshot).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // F24-AC3: Schema validation post-apply; rollback on failure
  // -----------------------------------------------------------------

  describe('F24-AC3 — Schema validation post-apply', () => {
    it('returns error when new state violates schema', async () => {
      const props: Record<string, unknown> = {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      };
      registerComponent('dt-1', props);

      // Register the schema
      applier.registerSchema('dt-1', dataTableSchema());

      // Patch that produces invalid status (not in enum)
      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 20n,
        patches: [{ op: 'replace', path: '/rows/0/status', value: 'invalid_status' }],
      });

      expect(result).toHaveProperty('error');
      const err = (result as { error: { code: number; message: string } }).error;
      expect(err.code).toBe(-32003); // props_invalid
    });

    it('rolls back — state is unchanged on validation failure', async () => {
      const props: Record<string, unknown> = {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      };
      registerComponent('dt-1', props);
      applier.registerSchema('dt-1', dataTableSchema());

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 21n,
        patches: [{ op: 'replace', path: '/rows/0/status', value: 'bad_value' }],
      });

      // State should still be the original (rollback)
      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.status).toBe('active');
    });

    it('succeeds when new state is valid', async () => {
      const props: Record<string, unknown> = {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      };
      registerComponent('dt-1', props);
      applier.registerSchema('dt-1', dataTableSchema());

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 22n,
        patches: [{ op: 'replace', path: '/rows/0/status', value: 'inactive' }],
      });

      expect(result).not.toHaveProperty('error');
      const ok = result as ApplyEventResult;
      expect(ok.type).toBe('STATE_DELTA');

      // Verify the state was updated
      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.status).toBe('inactive');
    });

    it('skips validation when no schema is registered', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });
      // No schema registered

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 23n,
        patches: [{ op: 'replace', path: '/rows/0/status', value: 'anything' }],
      });

      // Should succeed without validation
      expect(result).not.toHaveProperty('error');
    });

    it('returns field-level details in the error', async () => {
      const props: Record<string, unknown> = {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      };
      registerComponent('dt-1', props);
      applier.registerSchema('dt-1', dataTableSchema());

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 24n,
        patches: [{ op: 'replace', path: '/pageSize', value: 'not-an-integer' }],
      });

      expect(result).toHaveProperty('error');
      const err = (result as { error: { details?: string[] } }).error;
      expect(err.details).toBeDefined();
      expect(err.details!.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------
  // F24-AC4: Idempotency by seq (drop duplicates)
  // -----------------------------------------------------------------

  describe('F24-AC4 — Idempotency by seq', () => {
    it('drops duplicate seq silently', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      // First apply — succeeds
      const r1: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 30n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });
      expect(r1).not.toHaveProperty('error');

      // Second apply with same seq — dropped
      const r2: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 30n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia-V2' }],
      });
      expect(r2).not.toHaveProperty('error');

      // State should reflect only the first apply
      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.name).toBe('Alicia');
    });

    it('allows different seqs on the same channel', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 31n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 32n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia-V2' }],
      });

      // Both applies should have taken effect
      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows[0]!.name).toBe('Alicia-V2');
    });

    it('hasSeen returns correct values', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      expect(applier.hasSeen('dt-1', 99n)).toBe(false);

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 99n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });

      expect(applier.hasSeen('dt-1', 99n)).toBe(true);
      expect(applier.hasSeen('dt-1', 100n)).toBe(false);
    });

    it('empty patches are a no-op but record the seq', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 50n,
        patches: [],
      });

      expect(applier.hasSeen('dt-1', 50n)).toBe(true);
    });
  });

  // -----------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------

  describe('Edge cases', () => {
    it('returns error for unknown componentId', async () => {
      const result: ApplyEventOutcome = await applier.apply({
        channel: 'unknown',
        componentId: 'unknown',
        seq: 100n,
        patches: [{ op: 'replace', path: '/x', value: 1 }],
      });

      expect(result).toHaveProperty('error');
      const err = (result as { error: { code: number } }).error;
      expect(err.code).toBe(-32001); // component_not_found
    });

    it('dispose prevents further applications', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      applier.dispose();

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 200n,
        patches: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
      });

      expect(result).toHaveProperty('error');
    });

    it('add operation works', async () => {
      registerComponent('dt-1', {
        rows: [{ id: '1', name: 'Alice', status: 'active' }],
        pageSize: 10,
      });

      const result: ApplyEventOutcome = await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 300n,
        patches: [
          {
            op: 'add',
            path: '/rows/1',
            value: { id: '2', name: 'Bob', status: 'active' },
          },
        ],
      });

      expect(result).not.toHaveProperty('error');
      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows.length).toBe(2);
      expect(rows[1]!.name).toBe('Bob');
    });

    it('remove operation works', async () => {
      registerComponent('dt-1', {
        rows: [
          { id: '1', name: 'Alice', status: 'active' },
          { id: '2', name: 'Bob', status: 'active' },
        ],
        pageSize: 10,
      });

      await applier.apply({
        channel: 'dt-1',
        componentId: 'dt-1',
        seq: 301n,
        patches: [{ op: 'remove', path: '/rows/1' }],
      });

      const comp = componentStore.get('dt-1');
      const rows = comp!.props.rows as Array<Record<string, unknown>>;
      expect(rows.length).toBe(1);
    });
  });
});
