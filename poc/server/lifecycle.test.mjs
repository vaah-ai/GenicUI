// ComponentLifecycle — unit tests for mount, update, unmount, getState, invoke, list.
// Run with: bun test poc/server/lifecycle.test.mjs

import { describe, it, expect, beforeEach } from 'bun:test';
import { ComponentLifecycle } from './lifecycle.mjs';

// Fake adaptor for tests — mimics BaseAdaptor shape.
function makeAdaptor(name) {
  return {
    schema: { name },
    getState(props) {
      return { ...props, _state: 'ok' };
    },
    component: {
      html(props) { return `<div>${JSON.stringify(props)}</div>`; },
    },
  };
}

describe('ComponentLifecycle', () => {
  let lc;

  beforeEach(() => {
    lc = new ComponentLifecycle();
  });

  describe('mount', () => {
    it('returns an instance with componentId', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0 });
      expect(instance.componentId).toBeDefined();
      expect(typeof instance.componentId).toBe('string');
      expect(instance.componentName).toBe('Counter');
      expect(instance.props).toEqual({ count: 0 });
      expect(instance.mountedAt).toBeGreaterThan(0);
    });

    it('generates unique componentIds', () => {
      const a = lc.mount(makeAdaptor('Counter'), { count: 0 });
      const b = lc.mount(makeAdaptor('Counter'), { count: 1 });
      expect(a.componentId).not.toBe(b.componentId);
    });

    it('stores clone of props (structuredClone)', () => {
      const props = { count: 0 };
      const instance = lc.mount(makeAdaptor('Counter'), props);
      props.count = 99;
      expect(instance.props.count).toBe(0);
    });
  });

  describe('update', () => {
    it('shallow merges new props', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0 });
      const updated = lc.update(instance.componentId, { count: 42 });
      expect(updated.props).toEqual({ count: 42 });
    });

    it('returns null for unknown componentId', () => {
      expect(lc.update('ghost', { foo: 1 })).toBeNull();
    });

    it('preserves existing props not in update', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0, label: 'X' });
      lc.update(instance.componentId, { count: 10 });
      const updated = lc.get(instance.componentId);
      expect(updated.props).toEqual({ count: 10, label: 'X' });
    });
  });

  describe('unmount', () => {
    it('removes the instance and returns it', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0 });
      const removed = lc.unmount(instance.componentId);
      expect(removed).toBe(instance);
      expect(lc.get(instance.componentId)).toBeUndefined();
    });

    it('returns null for unknown componentId', () => {
      expect(lc.unmount('ghost')).toBeNull();
    });
  });

  describe('get', () => {
    it('returns the instance', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0 });
      expect(lc.get(instance.componentId)).toBe(instance);
    });

    it('returns undefined for unknown componentId', () => {
      expect(lc.get('nope')).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('returns adaptor state', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 5 });
      const state = lc.getState(instance.componentId);
      expect(state).toEqual({ count: 5, _state: 'ok' });
    });

    it('returns null for unknown componentId', () => {
      expect(lc.getState('nope')).toBeNull();
    });
  });

  describe('invoke', () => {
    it('returns {instance, action, payload}', () => {
      const instance = lc.mount(makeAdaptor('Counter'), { count: 0 });
      const result = lc.invoke(instance.componentId, 'increment', { by: 1 });
      expect(result.instance).toBe(instance);
      expect(result.action).toBe('increment');
      expect(result.payload).toEqual({ by: 1 });
    });

    it('returns null for unknown componentId', () => {
      expect(lc.invoke('nope', 'action', {})).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all instances', () => {
      const a = lc.mount(makeAdaptor('Counter'), {});
      const b = lc.mount(makeAdaptor('TodoList'), {});
      const list = lc.list();
      expect(list.length).toBe(2);
      expect(list[0].componentId).toBe(a.componentId);
      expect(list[1].componentName).toBe('TodoList');
    });

    it('empty list for new lifecycle', () => {
      expect(lc.list()).toEqual([]);
    });
  });
});
