// Integration tests — server tool handlers, lifecycle + registry together.
// Run with: bun test poc/server/integration.test.mjs
//
// Tests the full flow: find_ui_component → render_component → update → unmount
// using the real registry, lifecycle, and bridge (with mocked browser).

import { describe, it, expect, beforeEach } from 'bun:test';
import { ComponentRegistry } from './registry.mjs';
import { ComponentLifecycle } from './lifecycle.mjs';
import { counterAdaptor } from '../adaptors/counter.mjs';
import { todoListAdaptor } from '../adaptors/todo-list.mjs';
import { cartViewerAdaptor } from '../adaptors/cart-viewer.mjs';

describe('Integration: tool handlers', () => {
  let registry, lifecycle;

  beforeEach(() => {
    registry = new ComponentRegistry();
    lifecycle = new ComponentLifecycle();
    registry.register(counterAdaptor);
    registry.register(todoListAdaptor);
    registry.register(cartViewerAdaptor);
  });

  describe('find_ui_component → render_component flow', () => {
    it('finds Counter for "counter" intent', () => {
      const matches = registry.search('counter');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].adaptor.schema.name).toBe('Counter');
    });

    it('finds TodoList for "todo list" intent', () => {
      const matches = registry.search('todo list');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].adaptor.schema.name).toBe('TodoList');
    });

    it('finds CartViewer for "cart with items" intent', () => {
      const matches = registry.search('cart with items');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].adaptor.schema.name).toBe('CartViewer');
    });

    it('renders Counter with valid props', () => {
      const adaptor = registry.get('Counter');
      const v = adaptor.validateProps({ value: 0 });
      expect(v.valid).toBe(true);

      const instance = lifecycle.mount(adaptor, { value: 0 });
      expect(instance.componentId).toBeDefined();
      expect(instance.componentName).toBe('Counter');

      const state = lifecycle.getState(instance.componentId);
      expect(state).not.toBeNull();
    });

    it('renders TodoList with valid props', () => {
      const adaptor = registry.get('TodoList');
      const v = adaptor.validateProps({ items: [] });
      expect(v.valid).toBe(true);

      const instance = lifecycle.mount(adaptor, { items: [] });
      expect(instance.componentId).toBeDefined();
    });

    it('renders CartViewer with valid props', () => {
      const adaptor = registry.get('CartViewer');
      const v = adaptor.validateProps({ items: [] });
      expect(v.valid).toBe(true);

      const instance = lifecycle.mount(adaptor, { items: [] });
      expect(instance.componentId).toBeDefined();
    });
  });

  describe('render_component — error paths', () => {
    it('rejects unknown component name', () => {
      const adaptor = registry.get('NonExistent');
      expect(adaptor).toBeUndefined();
    });

    it('rejects Counter with invalid props', () => {
      const adaptor = registry.get('Counter');
      const v = adaptor.validateProps({ value: 'not a number' });
      expect(v.valid).toBe(false);
    });

    it('rejects TodoList with invalid items type', () => {
      const adaptor = registry.get('TodoList');
      const v = adaptor.validateProps({ items: 'not an array' });
      expect(v.valid).toBe(false);
    });
  });

  describe('update_component flow', () => {
    it('updates Counter value', () => {
      const adaptor = registry.get('Counter');
      const instance = lifecycle.mount(adaptor, { value: 0 });
      const updated = lifecycle.update(instance.componentId, { value: 42 });
      expect(updated.props.value).toBe(42);
    });

    it('rejects update for unknown componentId', () => {
      expect(lifecycle.update('ghost', { count: 1 })).toBeNull();
    });
  });

  describe('unmount_component flow', () => {
    it('unmounts and removes instance', () => {
      const adaptor = registry.get('Counter');
      const instance = lifecycle.mount(adaptor, { value: 0 });
      const removed = lifecycle.unmount(instance.componentId);
      expect(removed).toBe(instance);
      expect(lifecycle.get(instance.componentId)).toBeUndefined();
    });

    it('returns null for unknown componentId', () => {
      expect(lifecycle.unmount('ghost')).toBeNull();
    });
  });

  describe('get_component_state flow', () => {
    it('returns structured state for Counter', () => {
      const adaptor = registry.get('Counter');
      const instance = lifecycle.mount(adaptor, { value: 5 });
      const state = lifecycle.getState(instance.componentId);
      expect(state).not.toBeNull();
    });

    it('returns null for unknown componentId', () => {
      expect(lifecycle.getState('ghost')).toBeNull();
    });
  });

  describe('invoke_action flow', () => {
    it('invokes action on Counter', () => {
      const adaptor = registry.get('Counter');
      const instance = lifecycle.mount(adaptor, { value: 0 });
      const result = lifecycle.invoke(instance.componentId, 'increment', {});
      expect(result).not.toBeNull();
      expect(result.instance).toBe(instance);
      expect(result.action).toBe('increment');
    });

    it('returns null for unknown componentId', () => {
      expect(lifecycle.invoke('ghost', 'action', {})).toBeNull();
    });
  });

  describe('list — full lifecycle', () => {
    it('tracks mounted components', () => {
      const adaptor1 = registry.get('Counter');
      const adaptor2 = registry.get('TodoList');
      const a = lifecycle.mount(adaptor1, { value: 0 });
      const b = lifecycle.mount(adaptor2, { items: [] });

      const list = lifecycle.list();
      expect(list.length).toBe(2);

      lifecycle.unmount(a.componentId);
      expect(lifecycle.list().length).toBe(1);

      lifecycle.unmount(b.componentId);
      expect(lifecycle.list()).toEqual([]);
    });
  });
});

// ===================================================================
// Integration: search + validation round-trip
// ===================================================================
describe('Integration: search and validate round-trip', () => {
  it('search → get → validate → mount → update → state → unmount', () => {
    const registry = new ComponentRegistry();
    registry.register(counterAdaptor);

    // Search
    const results = registry.search('counter');
    expect(results.length).toBeGreaterThan(0);

    // Get
    const adaptor = registry.get(results[0].adaptor.schema.name);
    expect(adaptor).toBeDefined();

    // Validate
    const v = adaptor.validateProps({ value: 0 });
    expect(v.valid).toBe(true);

    // Mount
    const lifecycle = new ComponentLifecycle();
    const instance = lifecycle.mount(adaptor, { value: 0 });
    expect(instance).toBeDefined();

    // Update
    lifecycle.update(instance.componentId, { value: 100 });
    expect(lifecycle.get(instance.componentId).props.value).toBe(100);

    // State
    const state = lifecycle.getState(instance.componentId);
    expect(state).not.toBeNull();

    // Unmount
    lifecycle.unmount(instance.componentId);
    expect(lifecycle.get(instance.componentId)).toBeUndefined();
  });
});
