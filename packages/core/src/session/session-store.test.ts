/**
 * Session store tests — F5 acceptance criteria.
 *
 * @module @genicui/core/session/session-store.test
 * @see {F5-AC1} — set then get returns same reference
 * @see {F5-AC2} — concurrent set last-write-wins
 * @see {F5-AC3} — subscribe fires on set
 */

import { describe, it, expect } from 'bun:test';
import { InMemoryStore } from './in-memory-store.js';

interface SessionState {
  mountedIds: string[];
  lastSeq: number;
}

describe('InMemoryStore', () => {
  /* --------------------------------------------------------------- */
  /*  F5-AC1: set then get returns same object reference             */
  /* --------------------------------------------------------------- */

  describe('F5-AC1: set then get same reference', () => {
    it('returns the same object reference after set', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const value: SessionState = { mountedIds: ['dt-1'], lastSeq: 42 };

      await store.set('session-123', value);
      const result = await store.get('session-123');

      expect(result).toBe(value);
    });

    it('returns undefined for a key that was never set', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const result = await store.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('overwrites previous value on set', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const v1: SessionState = { mountedIds: ['dt-1'], lastSeq: 1 };
      const v2: SessionState = { mountedIds: ['dt-1', 'dt-2'], lastSeq: 2 };

      await store.set('session-123', v1);
      await store.set('session-123', v2);

      const result = await store.get('session-123');
      expect(result).toBe(v2);
    });
  });

  /* --------------------------------------------------------------- */
  /*  F5-AC2: concurrent set last-write-wins                         */
  /* --------------------------------------------------------------- */

  describe('F5-AC2: concurrent set last-write-wins', () => {
    it('last write wins when sets race', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const v1: SessionState = { mountedIds: ['a'], lastSeq: 1 };
      const v2: SessionState = { mountedIds: ['b'], lastSeq: 2 };
      const v3: SessionState = { mountedIds: ['c'], lastSeq: 3 };

      // Concurrent sets — in JS they execute synchronously in order
      await Promise.all([
        store.set('session-123', v1),
        store.set('session-123', v2),
        store.set('session-123', v3),
      ]);

      const result = await store.get('session-123');
      // The last awaited set wins (v3, since it's the last in the array)
      expect(result).toBe(v3);
    });

    it('no torn state after concurrent sets', async () => {
      const store = new InMemoryStore<string, SessionState>();

      // Flood with many concurrent sets
      const values: SessionState[] = [];
      for (let i = 0; i < 1000; i++) {
        const v: SessionState = { mountedIds: [`${i}`], lastSeq: i };
        values.push(v);
        void store.set('session-123', v);
      }
      await Promise.resolve();

      const result = await store.get('session-123');
      expect(result).toBeDefined();
      expect(result!.lastSeq).toBeGreaterThanOrEqual(0);
      expect(result!.mountedIds).toHaveLength(1);
    });
  });

  /* --------------------------------------------------------------- */
  /*  F5-AC3: subscribe fires on set                                  */
  /* --------------------------------------------------------------- */

  describe('F5-AC3: subscribe fires on set', () => {
    it('callback fires with the new value on set', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const received: SessionState[] = [];

      store.subscribe('session-123', (value) => {
        received.push(value);
      });

      const value: SessionState = { mountedIds: ['dt-1'], lastSeq: 42 };
      await store.set('session-123', value);

      expect(received).toHaveLength(1);
      expect(received[0]).toBe(value);
    });

    it('multiple subscribers all fire', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const a: SessionState[] = [];
      const b: SessionState[] = [];

      store.subscribe('session-123', (v) => a.push(v));
      store.subscribe('session-123', (v) => b.push(v));

      const value: SessionState = { mountedIds: ['dt-1'], lastSeq: 1 };
      await store.set('session-123', value);

      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
      expect(a[0]).toBe(value);
      expect(b[0]).toBe(value);
    });

    it('unsubscribe stops callbacks', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const received: SessionState[] = [];

      const unsub = store.subscribe('session-123', (v) => received.push(v));

      await store.set('session-123', { mountedIds: ['a'], lastSeq: 1 });
      unsub();
      await store.set('session-123', { mountedIds: ['b'], lastSeq: 2 });

      expect(received).toHaveLength(1);
    });

    it('subscriber does not fire for other keys', async () => {
      const store = new InMemoryStore<string, SessionState>();
      const received: SessionState[] = [];

      store.subscribe('session-123', (v) => received.push(v));

      await store.set('session-999', { mountedIds: ['x'], lastSeq: 0 });

      expect(received).toHaveLength(0);
    });
  });

  /* --------------------------------------------------------------- */
  /*  append                                                          */
  /* --------------------------------------------------------------- */

  describe('append', () => {
    it('appends items to a log buffer', async () => {
      const store = new InMemoryStore<string, string>();
      const received: string[] = [];

      store.subscribe('key', (v) => received.push(v));

      await store.append('key', 'a');
      await store.append('key', 'b');

      expect(received).toHaveLength(2);
      expect(received[0]).toBe('a');
      expect(received[1]).toBe('b');
    });

    it('append notifies subscribers with each item', async () => {
      const store = new InMemoryStore<string, number>();
      const received: number[] = [];

      store.subscribe('key', (v) => received.push(v));

      await store.append('key', 1);
      await store.append('key', 2);

      expect(received).toEqual([1, 2]);
    });
  });
});
