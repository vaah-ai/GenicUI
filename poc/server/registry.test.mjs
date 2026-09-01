// ComponentRegistry — unit tests for register, get, list, search.
// Run with: bun test poc/server/registry.test.mjs

import { describe, it, expect, beforeEach } from 'bun:test';
import { ComponentRegistry } from './registry.mjs';

// Fake adaptor for tests.
function makeAdaptor(opts) {
  return {
    schema: {
      name: opts.name,
      description: opts.description || '',
      category: opts.category || 'widget',
      whenToUse: opts.whenToUse || [],
    },
  };
}

describe('ComponentRegistry', () => {
  let reg;

  beforeEach(() => {
    reg = new ComponentRegistry();
  });

  describe('register', () => {
    it('registers an adaptor', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      expect(reg.get('Counter')).toBeDefined();
    });

    it('throws for adaptor without schema.name', () => {
      expect(() => reg.register({ schema: {} })).toThrow(
        'Adaptor must have a schema.name'
      );
    });

    it('throws for null adaptor', () => {
      expect(() => reg.register(null)).toThrow(
        'Adaptor must have a schema.name'
      );
    });

    it('throws for duplicate name', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      expect(() => reg.register(makeAdaptor({ name: 'Counter' }))).toThrow(
        'Duplicate adaptor registered: Counter'
      );
    });
  });

  describe('get', () => {
    it('returns the adaptor by name', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      expect(reg.get('Counter')).toBeDefined();
    });

    it('returns undefined for unknown name', () => {
      expect(reg.get('Nope')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns all registered adaptors', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      reg.register(makeAdaptor({ name: 'TodoList' }));
      expect(reg.list().length).toBe(2);
    });

    it('empty list when nothing registered', () => {
      expect(reg.list()).toEqual([]);
    });
  });

  describe('search', () => {
    it('returns results matching intent', () => {
      reg.register(makeAdaptor({
        name: 'Counter',
        description: 'count up and down',
        whenToUse: ['counting', 'increment', 'decrement'],
      }));
      reg.register(makeAdaptor({
        name: 'TodoList',
        description: 'show a list of tasks',
        whenToUse: ['tasks', 'todo', 'list'],
      }));

      const results = reg.search('counting increment');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].adaptor.schema.name).toBe('Counter');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('returns empty for no match', () => {
      reg.register(makeAdaptor({ name: 'Counter', description: 'counts' }));
      expect(reg.search('something totally unrelated xyz')).toEqual([]);
    });

    it('returns empty for empty intent', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      expect(reg.search('')).toEqual([]);
      expect(reg.search(null)).toEqual([]);
      expect(reg.search(undefined)).toEqual([]);
    });

    it('respects topK limit', () => {
      reg.register(makeAdaptor({
        name: 'Counter',
        whenToUse: ['count', 'number', 'increment', 'decrement'],
      }));
      reg.register(makeAdaptor({
        name: 'TodoList',
        whenToUse: ['count', 'list'],
      }));
      const results = reg.search('count', { topK: 1 });
      expect(results.length).toBe(1);
    });

    it('ranks by score descending', () => {
      reg.register(makeAdaptor({
        name: 'Count',
        description: 'count',
        whenToUse: ['count'],
      }));
      reg.register(makeAdaptor({
        name: 'Widget',
        description: 'has count in description',
        whenToUse: [],
      }));
      const results = reg.search('count');
      expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score || 0);
    });

    it('name match gets higher score (score +2)', () => {
      reg.register(makeAdaptor({
        name: 'Count',
        whenToUse: [],
      }));
      reg.register(makeAdaptor({
        name: 'Widget',
        description: 'count something',
        whenToUse: [],
      }));
      const results = reg.search('count');
      expect(results[0].adaptor.schema.name).toBe('Count');
    });

    it('filters out single-character terms', () => {
      reg.register(makeAdaptor({ name: 'Counter' }));
      expect(reg.search('a b c')).toEqual([]);
    });
  });
});
