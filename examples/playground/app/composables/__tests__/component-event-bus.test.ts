/**
 * component-event-bus tests.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */

import { describe, it, expect, beforeEach } from 'bun:test';

import {
  on,
  off,
  emit,
  __test_handlerCount,
  __test_reset,
} from '../component-event-bus.ts';

describe('component-event-bus', () => {
  beforeEach(() => {
    __test_reset();
  });

  describe('emit', () => {
    it('invokes a registered handler', () => {
      const received: { action: string; payload?: Record<string, unknown> }[] = [];
      on('cp-1', (e) => received.push(e));
      emit('cp-1', { action: 'submit', payload: { input1: 5 } });
      expect(received).toEqual([{ action: 'submit', payload: { input1: 5 } }]);
    });

    it('returns the number of handlers invoked', () => {
      on('cp-1', () => {});
      on('cp-1', () => {});
      expect(emit('cp-1', { action: 'submit' })).toBe(2);
    });

    it('returns 0 when no handler is registered', () => {
      expect(emit('cp-unknown', { action: 'submit' })).toBe(0);
    });

    it('does not invoke handlers for a different componentId', () => {
      const a: string[] = [];
      const b: string[] = [];
      on('cp-a', (e) => a.push(e.action));
      on('cp-b', (e) => b.push(e.action));
      emit('cp-a', { action: 'submit' });
      expect(a).toEqual(['submit']);
      expect(b).toEqual([]);
    });

    it('catches handler errors and still invokes other handlers', () => {
      const received: string[] = [];
      on('cp-1', () => { throw new Error('boom'); });
      on('cp-1', (e) => received.push(e.action));
      // Suppress the expected console.error in the test output.
      const origError = console.error;
      console.error = () => {};
      try {
        const n = emit('cp-1', { action: 'submit' });
        expect(n).toBe(2);
        expect(received).toEqual(['submit']);
      } finally {
        console.error = origError;
      }
    });
  });

  describe('on', () => {
    it('returns an unsubscribe function', () => {
      const received: string[] = [];
      const unsub = on('cp-1', (e) => received.push(e.action));
      emit('cp-1', { action: 'submit' });
      expect(received).toEqual(['submit']);
      unsub();
      emit('cp-1', { action: 'submit' });
      expect(received).toEqual(['submit']);
    });

    it('handles two subscriptions with different ids independently', () => {
      const a: string[] = [];
      const b: string[] = [];
      on('cp-a', (e) => a.push(e.action));
      on('cp-b', (e) => b.push(e.action));
      emit('cp-a', { action: 'a1' });
      emit('cp-b', { action: 'b1' });
      expect(a).toEqual(['a1']);
      expect(b).toEqual(['b1']);
    });

    it('deduplicates when the same handler is registered twice', () => {
      const handler = () => {};
      on('cp-1', handler);
      on('cp-1', handler);
      expect(__test_handlerCount()).toBe(1);
    });
  });

  describe('off', () => {
    it('removes a specific handler', () => {
      const a: string[] = [];
      const b: string[] = [];
      const handlerA = (e: { action: string }) => a.push(e.action);
      const handlerB = (e: { action: string }) => b.push(e.action);
      on('cp-1', handlerA);
      on('cp-1', handlerB);
      off('cp-1', handlerA);
      emit('cp-1', { action: 'submit' });
      expect(a).toEqual([]);
      expect(b).toEqual(['submit']);
    });

    it('is a no-op for an unknown componentId', () => {
      expect(() => off('cp-nope', () => {})).not.toThrow();
    });

    it('is a no-op for a handler that was never registered', () => {
      on('cp-1', () => {});
      expect(() => off('cp-1', () => {})).not.toThrow();
    });
  });

  describe('handler bookkeeping', () => {
    it('drops the id entry when the last handler is removed', () => {
      const unsub = on('cp-1', () => {});
      expect(__test_handlerCount()).toBe(1);
      unsub();
      expect(__test_handlerCount()).toBe(0);
      // emit returns 0 (no-op) after the id is cleaned up.
      expect(emit('cp-1', { action: 'submit' })).toBe(0);
    });
  });
});
