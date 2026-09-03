/**
 * Runtime engine — unit tests for F29 acceptance criteria.
 *
 * Tests:
 * - F29-AC1: STATE_SNAPSHOT → mount within 50ms
 * - F29-AC2: STATE_DELTA → patch within 10ms
 * - F29-AC3: channel.closed → unmount + dispose
 * - F29-AC4: Module isolation — no window globals
 *
 * @module @genicui/client/runtime/runtime.test
 * @see {F29} — Runtime engine (mount, patch, lifecycle)
 */

import { describe, it, expect, afterAll } from 'bun:test';
import { Window } from 'happy-dom';

// ─────────────────────────────────────────────────────────────
// DOM Setup — MUST run before importing GenicElement or RuntimeEngine.
// ─────────────────────────────────────────────────────────────

const testWindow = new Window();
const testDocument = testWindow.document;

// Wire happy-dom globals to globalThis.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Document = testWindow.Document;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLElement = testWindow.HTMLElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).customElements = testWindow.customElements;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).document = testDocument;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Event = testWindow.Event;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).CustomEvent = testWindow.CustomEvent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Node = testWindow.Node;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ShadowRoot = testWindow.ShadowRoot;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).NodeList = testWindow.NodeList;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLDivElement = testWindow.HTMLDivElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).performance = {
  now: () => Date.now(),
};

import { createRuntime, RuntimeEngine } from './index.js';
import type { RuntimeFrame, RuntimeOptions } from './types.js';

afterAll(() => {
  testWindow.close();
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Create a fresh runtime engine with a clean container.
 */
function createTestRuntime(options?: RuntimeOptions): RuntimeEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const container = testDocument.createElement('div') as any as HTMLElement;
  container.id = 'test-root';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (testDocument.body as any).appendChild(container as any);
  return createRuntime({ ...options, container });
}

/**
 * Build a STATE_SNAPSHOT frame.
 */
function snapshotFrame(
  componentId: string,
  props: Record<string, unknown>,
  seq: bigint = 1n,
): RuntimeFrame {
  return {
    v: 1,
    channel: componentId,
    type: 'STATE_SNAPSHOT',
    payload: { componentId, props },
    seq,
  };
}

/**
 * Build a STATE_DELTA frame.
 */
function deltaFrame(
  componentId: string,
  patch: Array<{ op: string; path: string; value: unknown }>,
  seq: bigint = 2n,
): RuntimeFrame {
  return {
    v: 1,
    channel: componentId,
    type: 'STATE_DELTA',
    payload: patch,
    seq,
  };
}

/**
 * Build a channel.closed frame.
 */
function closedFrame(
  componentId: string,
  seq: bigint = 3n,
): RuntimeFrame {
  return {
    v: 1,
    channel: componentId,
    type: 'channel.closed',
    payload: { componentId },
    seq,
  };
}

// ─────────────────────────────────────────────────────────────
// F29-AC1: Mount within 50ms
// ─────────────────────────────────────────────────────────────

describe('F29-AC1: Mount within 50ms', () => {
  it('should mount a component from STATE_SNAPSHOT within 50ms', () => {
    const runtime = createTestRuntime();

    const result = runtime.onMessage(
      snapshotFrame('dt-1', { rows: [{ id: '1', name: 'Alice' }] }),
    );

    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).componentId).toBe('dt-1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).mountTimeMs).toBeLessThan(50);
  });

  it('should mount the element in the container', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(
      snapshotFrame('dt-2', { rows: [{ id: '1' }] }),
    );

    // The element should be in the DOM
    expect(runtime.mountedCount).toBe(1);
    expect(runtime.isMounted('dt-2')).toBe(true);
  });

  it('should handle multiple mounts', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('comp-1', { a: 1 }));
    runtime.onMessage(snapshotFrame('comp-2', { b: 2 }));
    runtime.onMessage(snapshotFrame('comp-3', { c: 3 }));

    expect(runtime.mountedCount).toBe(3);
    expect(runtime.isMounted('comp-1')).toBe(true);
    expect(runtime.isMounted('comp-2')).toBe(true);
    expect(runtime.isMounted('comp-3')).toBe(true);
  });

  it('should return mount result with element reference', () => {
    const runtime = createTestRuntime();

    const result = runtime.onMessage(
      snapshotFrame('dt-3', { rows: [] }),
    );

    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).element).toBeInstanceOf(
      testWindow.HTMLElement,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// F29-AC2: Patch within 10ms
// ─────────────────────────────────────────────────────────────

describe('F29-AC2: Patch within 10ms', () => {
  it('should patch an existing component within 10ms', () => {
    const runtime = createTestRuntime();

    // First mount
    runtime.onMessage(
      snapshotFrame('dt-4', { rows: [{ id: '1', name: 'Alice' }] }),
    );

    // Then patch
    const result = runtime.onMessage(
      deltaFrame('dt-4', [
        { op: 'replace', path: '/rows/0/name', value: 'Alicia' },
      ]),
    );

    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).componentId).toBe('dt-4');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).patchTimeMs).toBeLessThan(10);
  });

  it('should apply the patch to the element props', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(
      snapshotFrame('dt-5', { count: 0 }),
    );

    runtime.onMessage(
      deltaFrame('dt-5', [
        { op: 'replace', path: '/count', value: 42 },
      ]),
    );

    // The element should have the updated props
    const element = testDocument.querySelector('[component-id="dt-5"]');
    expect(element).not.toBeNull();

    // Verify the props-json attribute was updated
    const propsJson = element?.getAttribute('props-json');
    expect(propsJson).toBe(JSON.stringify({ count: 42 }));
  });

  it('should handle patch for unknown component without crashing', () => {
    const runtime = createTestRuntime();

    // Patch a component that was never mounted — should not crash
    const result = runtime.onMessage(
      deltaFrame('unknown-99', [
        { op: 'replace', path: '/x', value: 1 },
      ]),
    );

    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).componentId).toBe('unknown-99');
  });

  it('should handle array append patch', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(
      snapshotFrame('dt-6', { rows: [{ id: '1' }] }),
    );

    runtime.onMessage(
      deltaFrame('dt-6', [
        { op: 'add', path: '/rows/1', value: { id: '2' } },
      ]),
    );

    const element = testDocument.querySelector('[component-id="dt-6"]');
    const propsJson = element?.getAttribute('props-json');
    const parsed = JSON.parse(propsJson ?? '{}') as Record<string, unknown>;

    expect(Array.isArray(parsed.rows)).toBe(true);
    expect((parsed.rows as Array<Record<string, unknown>>).length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// F29-AC3: Unmount on channel.closed
// ─────────────────────────────────────────────────────────────

describe('F29-AC3: Unmount on channel.closed', () => {
  it('should unmount a component on channel.closed', () => {
    const runtime = createTestRuntime();

    // Mount
    runtime.onMessage(
      snapshotFrame('dt-7', { rows: [] }),
    );
    expect(runtime.isMounted('dt-7')).toBe(true);

    // Close
    runtime.onMessage(closedFrame('dt-7'));

    // Should be unmounted
    expect(runtime.isMounted('dt-7')).toBe(false);
    expect(runtime.mountedCount).toBe(0);
  });

  it('should remove the element from the DOM', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(
      snapshotFrame('dt-8', { rows: [] }),
    );

    // Element should be in DOM
    let element = testDocument.querySelector('[component-id="dt-8"]');
    expect(element).not.toBeNull();

    // Close
    runtime.onMessage(closedFrame('dt-8'));

    // Element should be removed
    element = testDocument.querySelector('[component-id="dt-8"]');
    expect(element).toBeNull();
  });

  it('should handle channel.closed for unknown component', () => {
    const runtime = createTestRuntime();

    // Should not crash
    runtime.onMessage(closedFrame('nonexistent'));

    expect(runtime.mountedCount).toBe(0);
  });

  it('should unmount only the specified component', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('a-1', {}));
    runtime.onMessage(snapshotFrame('a-2', {}));
    runtime.onMessage(snapshotFrame('a-3', {}));

    // Unmount only a-2
    runtime.onMessage(closedFrame('a-2'));

    expect(runtime.isMounted('a-1')).toBe(true);
    expect(runtime.isMounted('a-2')).toBe(false);
    expect(runtime.isMounted('a-3')).toBe(true);
    expect(runtime.mountedCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// F29-AC4: Module isolation — no window globals
// ─────────────────────────────────────────────────────────────

describe('F29-AC4: Module isolation', () => {
  it('should not pollute the global namespace', () => {
    // Before creating runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeKeys = Object.keys(globalThis as any).filter(
      (k) =>
        k.includes('runtime') ||
        k.includes('genicui') ||
        k.includes('RuntimeEngine') ||
        k.includes('createRuntime'),
    );

    createTestRuntime();

    // After creating runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterKeys = Object.keys(globalThis as any).filter(
      (k) =>
        k.includes('runtime') ||
        k.includes('genicui') ||
        k.includes('RuntimeEngine') ||
        k.includes('createRuntime'),
    );

    // No new global keys should be added
    expect(afterKeys.length).toBe(beforeKeys.length);
  });

  it('should not set window runtime properties', () => {
    const runtime = createTestRuntime();

    // Verify no global pollution
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globals = globalThis as any;
    expect(globals.runtime).toBeUndefined();
    expect(globals.genicui).toBeUndefined();
    expect(globals.RuntimeEngine).toBeUndefined();
    expect(globals.createRuntime).toBeUndefined();

    runtime.dispose();
  });

  it('should keep all state in module scope', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('isolated-1', {}));

    // The runtime should track the component internally
    expect(runtime.isMounted('isolated-1')).toBe(true);

    // But no global should know about it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((globalThis as any).isolated1).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((globalThis as any)['isolated-1']).toBeUndefined();

    runtime.dispose();
  });
});

// ─────────────────────────────────────────────────────────────
// Runtime lifecycle
// ─────────────────────────────────────────────────────────────

describe('RuntimeEngine lifecycle', () => {
  it('should start with zero mounted components', () => {
    const runtime = createTestRuntime();
    expect(runtime.mountedCount).toBe(0);
    expect(runtime.mountedComponentIds.size).toBe(0);
    runtime.dispose();
  });

  it('should return mountedComponentIds set', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('id-1', {}));
    runtime.onMessage(snapshotFrame('id-2', {}));

    const ids = runtime.mountedComponentIds;
    expect(ids.has('id-1')).toBe(true);
    expect(ids.has('id-2')).toBe(true);
    expect(ids.size).toBe(2);

    runtime.dispose();
  });

  it('should dispose and unmount all components', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('d-1', {}));
    runtime.onMessage(snapshotFrame('d-2', {}));
    runtime.onMessage(snapshotFrame('d-3', {}));

    expect(runtime.mountedCount).toBe(3);

    runtime.dispose();

    expect(runtime.mountedCount).toBe(0);
    expect(runtime.isMounted('d-1')).toBe(false);
    expect(runtime.isMounted('d-2')).toBe(false);
    expect(runtime.isMounted('d-3')).toBe(false);
  });

  it('should ignore messages after dispose', () => {
    const runtime = createTestRuntime();

    runtime.dispose();

    // All messages should return null after dispose
    expect(runtime.onMessage(snapshotFrame('d-4', {}))).toBeNull();
    expect(runtime.onMessage(deltaFrame('d-4', []))).toBeNull();
    expect(runtime.onMessage(closedFrame('d-4'))).toBeNull();

    expect(runtime.mountedCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// server.hello frame handling
// ─────────────────────────────────────────────────────────────

describe('server.hello handling', () => {
  it('should forward server.hello to onHello callback', () => {
    let receivedPayload: Record<string, unknown> | undefined;

    const runtime = createTestRuntime({
      onHello(payload) {
        receivedPayload = payload;
      },
    });

    const frame: RuntimeFrame = {
      v: 1,
      channel: '__session__',
      type: 'server.hello',
      payload: { sessionId: 'sess-123', serverVersion: '0.1.0' },
      seq: 0n,
    };

    const result = runtime.onMessage(frame);

    expect(result).toBeNull();
    expect(receivedPayload).toEqual({
      sessionId: 'sess-123',
      serverVersion: '0.1.0',
    });

    runtime.dispose();
  });
});

// ─────────────────────────────────────────────────────────────
// COMPONENT_EVENT frame handling
// ─────────────────────────────────────────────────────────────

describe('COMPONENT_EVENT handling', () => {
  it('should forward events to onEvent callback', () => {
    const events: Array<{
      componentId: string;
      action: string;
      detail: Record<string, unknown>;
    }> = [];

    const runtime = createTestRuntime({
      onEvent(componentId, action, detail) {
        events.push({ componentId, action, detail });
      },
    });

    const frame: RuntimeFrame = {
      v: 1,
      channel: 'dt-event-1',
      type: 'COMPONENT_EVENT',
      payload: { action: 'row_selected', detail: { rowId: '1' } },
      seq: 5n,
    };

    runtime.onMessage(frame);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      componentId: 'dt-event-1',
      action: 'row_selected',
      detail: { rowId: '1' },
    });

    runtime.dispose();
  });
});

// ─────────────────────────────────────────────────────────────
// Factory function
// ─────────────────────────────────────────────────────────────

describe('createRuntime factory', () => {
  it('should return a RuntimeEngine instance', () => {
    const runtime = createRuntime({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      container: testDocument.body as any as HTMLElement,
    });

    expect(runtime).toBeInstanceOf(RuntimeEngine);
    expect(runtime.mountedCount).toBe(0);

    runtime.dispose();
  });

  it('should work with default options', () => {
    const runtime = createRuntime();

    expect(runtime).toBeInstanceOf(RuntimeEngine);
    runtime.dispose();
  });
});

// ─────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('should handle STATE_SNAPSHOT with empty props', () => {
    const runtime = createTestRuntime();

    const result = runtime.onMessage(
      snapshotFrame('empty-1', {}),
    );

    expect(result).not.toBeNull();
    expect((result as NonNullable<typeof result>).componentId).toBe('empty-1');

    runtime.dispose();
  });

  it('should handle re-mount of same componentId', () => {
    const runtime = createTestRuntime();

    // Mount
    runtime.onMessage(snapshotFrame('remount-1', { v: 1 }));

    // Close
    runtime.onMessage(closedFrame('remount-1'));

    // Re-mount with new state
    const result = runtime.onMessage(
      snapshotFrame('remount-1', { v: 2 }),
    );

    expect(result).not.toBeNull();
    expect(runtime.isMounted('remount-1')).toBe(true);
    expect(runtime.mountedCount).toBe(1);

    runtime.dispose();
  });

  it('should handle rapid mount-patch-unmount sequence', () => {
    const runtime = createTestRuntime();

    runtime.onMessage(snapshotFrame('rapid-1', { count: 0 }));
    runtime.onMessage(deltaFrame('rapid-1', [{ op: 'replace', path: '/count', value: 1 }]));
    runtime.onMessage(deltaFrame('rapid-1', [{ op: 'replace', path: '/count', value: 2 }]));
    runtime.onMessage(closedFrame('rapid-1'));

    expect(runtime.mountedCount).toBe(0);
    expect(runtime.isMounted('rapid-1')).toBe(false);

    runtime.dispose();
  });
});
