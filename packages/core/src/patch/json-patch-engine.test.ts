/**
 * JSON-Patch engine unit tests.
 *
 * @see {F4} — JSON-Patch engine wrapper
 */

import { describe, it, expect } from 'bun:test';
import { JsonPatchEngine } from './json-patch-engine.js';
import { NonSerializableError, hasNonSerializable } from './types.js';

describe('JsonPatchEngine', () => {
  const engine = new JsonPatchEngine();

  // ----------------------------------------------------------------
  // F4-AC1: RFC 6902 patch with { mutate: false }
  // ----------------------------------------------------------------

  describe('F4-AC1: RFC 6902 patch with immutability', () => {
    it('returns RFC 6902 operations', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1, b: 3 };
      const patch = engine.diff(before, after);

      expect(patch).toEqual([
        { op: 'replace', path: '/b', value: 3 },
      ]);
    });

    it('returns empty array for identical objects', () => {
      const obj = { a: 1, b: [1, 2, 3] };
      const patch = engine.diff(obj, obj);
      expect(patch).toEqual([]);
    });

    it('generates add operation for new keys', () => {
      const before = { a: 1 };
      const after = { a: 1, b: 2 };
      const patch = engine.diff(before, after);

      expect(patch).toEqual([
        { op: 'add', path: '/b', value: 2 },
      ]);
    });

    it('generates remove operation for deleted keys', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1 };
      const patch = engine.diff(before, after);

      expect(patch).toEqual([
        { op: 'remove', path: '/b' },
      ]);
    });

    it('generates nested path operations', () => {
      const before = { rows: [{ id: '1', name: 'Alice' }] };
      const after = { rows: [{ id: '1', name: 'Bob' }] };
      const patch = engine.diff(before, after);

      expect(patch).toEqual([
        { op: 'replace', path: '/rows/0/name', value: 'Bob' },
      ]);
    });

    it('does not mutate the original target (immutability)', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1, b: 3 };
      const patch = engine.diff(before, after);

      const originalRef = JSON.stringify(before);
      const result = engine.apply(patch, before);
      const afterApply = JSON.stringify(before);

      // Original must not be mutated
      expect(originalRef).toBe(afterApply);
      // Result must be the new state
      expect(result).toEqual({ a: 1, b: 3 });
    });
  });

  // ----------------------------------------------------------------
  // F4-AC2: apply(patch, before) === after
  // ----------------------------------------------------------------

  describe('F4-AC2: Round-trip equality', () => {
    it('simple object round-trip', () => {
      const before = { a: 1, b: 'hello' };
      const after = { a: 2, b: 'world', c: true };
      const patch = engine.diff(before, after);

      const result = engine.apply(patch, before);
      expect(result).toEqual(after);
    });

    it('nested object round-trip', () => {
      const before = {
        rows: [
          { id: '1', name: 'Alice', score: 100 },
          { id: '2', name: 'Bob', score: 80 },
        ],
        total: 2,
      };
      const after = {
        rows: [
          { id: '1', name: 'Alice', score: 100 },
          { id: '2', name: 'Updated', score: 95 },
        ],
        total: 2,
      };
      const patch = engine.diff(before, after);

      const result = engine.apply(patch, before);
      expect(result).toEqual(after);
    });

    it('array manipulation round-trip', () => {
      const before = [1, 2, 3, 4, 5];
      const after = [1, 10, 3, 4, 5];
      const patch = engine.diff(before, after);

      const result = engine.apply(patch, before);
      expect(result).toEqual(after);
    });

    it('empty object to populated round-trip', () => {
      const before = {};
      const after = { key: 'value' };
      const patch = engine.diff(before, after);

      const result = engine.apply(patch, before);
      expect(result).toEqual(after);
    });

    it('complex GenicUI-like state round-trip', () => {
      const before = {
        rows: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ],
        pageSize: 10,
        selectedRow: null,
      };
      const after = {
        rows: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'updated' },
        ],
        pageSize: 10,
        selectedRow: '2',
      };
      const patch = engine.diff(before, after);

      const result = engine.apply(patch, before);
      expect(result).toEqual(after);
    });
  });

  // ----------------------------------------------------------------
  // F4-AC4: Date/Map → STATE_SNAPSHOT fallback
  // ----------------------------------------------------------------

  describe('F4-AC4: Non-serializable value fallback', () => {
    it('throws NonSerializableError for Date values', () => {
      const before = { created: new Date('2026-01-01') };
      const after = { created: new Date('2026-01-02') };

      expect(() => engine.diff(before, after)).toThrow(NonSerializableError);
      expect(() => engine.diff(before, after)).toThrow('Date');
    });

    it('throws NonSerializableError for Map values', () => {
      const before = { data: new Map([['key', 'value']]) };
      const after = { data: new Map([['key', 'updated']]) };

      expect(() => engine.diff(before, after)).toThrow(NonSerializableError);
    });

    it('throws NonSerializableError for Set values', () => {
      const before = { tags: new Set(['a', 'b']) };
      const after = { tags: new Set(['a', 'c']) };

      expect(() => engine.diff(before, after)).toThrow(NonSerializableError);
    });

    it('throws NonSerializableError for nested Date values', () => {
      const before = {
        user: { name: 'Alice', createdAt: new Date('2026-01-01') },
      };
      const after = {
        user: { name: 'Alice', createdAt: new Date('2026-01-02') },
      };

      expect(() => engine.diff(before, after)).toThrow(NonSerializableError);
    });

    it('throws NonSerializableError for Date in array', () => {
      const before = { timestamps: [new Date('2026-01-01')] };
      const after = { timestamps: [new Date('2026-01-02')] };

      expect(() => engine.diff(before, after)).toThrow(NonSerializableError);
    });

    it('does not throw for plain objects with primitive values', () => {
      const before = { a: 1, b: 'hello', c: true, d: null };
      const after = { a: 2, b: 'world', c: false, d: '' };

      expect(() => engine.diff(before, after)).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // hasNonSerializable utility
  // ----------------------------------------------------------------

  describe('hasNonSerializable', () => {
    it('returns false for null', () => {
      expect(hasNonSerializable(null)).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(hasNonSerializable(42)).toBe(false);
      expect(hasNonSerializable('hello')).toBe(false);
      expect(hasNonSerializable(true)).toBe(false);
    });

    it('returns false for plain objects with primitives', () => {
      expect(hasNonSerializable({ a: 1, b: 'hello' })).toBe(false);
    });

    it('returns true for Date', () => {
      expect(hasNonSerializable(new Date())).toBe(true);
    });

    it('returns true for Map', () => {
      expect(hasNonSerializable(new Map())).toBe(true);
    });

    it('returns true for Set', () => {
      expect(hasNonSerializable(new Set())).toBe(true);
    });

    it('returns true for nested non-serializable values', () => {
      expect(hasNonSerializable({ date: new Date() })).toBe(true);
      expect(hasNonSerializable([{ map: new Map() }])).toBe(true);
    });
  });
});
