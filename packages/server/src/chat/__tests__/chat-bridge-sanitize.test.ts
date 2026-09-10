// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for the chat-bridge prop sanitizer (F43b).
 *
 * The sanitizer runs inside `bridgeRenderComponent`
 * (`packages/server/src/chat/chat-handler.ts`) before
 * `renderComponent()` validates props. It normalizes two known MCP
 * wire-format quirks so the chat-bridge path renders on the first
 * attempt instead of triggering Claude Code's MCP retry loop:
 *
 *   1. `{ item: [...] }` → `[...]` (MCP-wrapped array envelope)
 *   2. Numeric strings → numbers (`pageSize: "10"` → `pageSize: 10`)
 *
 * @see {F43b} — Chat-bridge prop sanitization
 * @see {F16}  — render_component tool (trust boundary; sanitizer is internal)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SequenceGenerator } from '@genicui/core';
import { __test_handleParsedLine, __test_sanitizeBridge } from '../chat-handler.js';
import { componentStore } from '../../mcp/component-store.js';
import { renderComponent } from '../../mcp/render-handler.js';
import type { WsSession } from '../../transport/types.js';

const sanitizeProps = __test_sanitizeBridge.props;
const sanitizeValue = __test_sanitizeBridge.value;

// ---------------------------------------------------------------------------
// Mock session helpers (mirror chat-handler.test.ts)
// ---------------------------------------------------------------------------

class MockElysiaWs {
  sentMessages: string[] = [];

  send(data: string | Buffer): void {
    this.sentMessages.push(typeof data === 'string' ? data : data.toString());
  }

  ping(): void {}

  close(): void {}
}

/**
 * Recording channel multiplexer — captures every dispatched frame
 * instead of forwarding through Elysia.
 */
class RecordingMultiplexer {
  frames: unknown[] = [];

  destroy(): void {}

  dispatch(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }

  // F43 follow-up: bridge uses the new dispatchServerFrame() path.
  dispatchServerFrame(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }

  registerChannel(): null { return null; }
  hasChannel(): boolean { return true; }
  getChannels(): string[] { return []; }
  get channelCount(): number { return 0; }
}

function createMockSession(): WsSession & { ws: MockElysiaWs; mul: RecordingMultiplexer } {
  const ws = new MockElysiaWs();
  const mul = new RecordingMultiplexer();
  const seqGenerator = new SequenceGenerator();

  return {
    sessionId: `sess-test-${Math.random().toString(36).slice(2, 8)}`,
    elysiaWs: ws as never,
    heartbeatInterval: null,
    pongTimeout: null,
    missedPongs: 0,
    destroyed: false,
    multiplexer: mul as never,
    seqGenerator,
    eventBus: {
      emit: () => {},
      subscribe: () => () => {},
      dispose: () => {},
    } as never,
    recoveryBuffer: {
      add: () => {},
      get: () => [],
      size: 0,
      clear: () => {},
      lastEventId: null,
    } as never,
    ws,
    mul,
  };
}

// ---------------------------------------------------------------------------
// F43b-AC1..AC4 — sanitizer unit tests
// ---------------------------------------------------------------------------

describe('sanitizeBridgeProps (F43b)', () => {
  it('AC1: unwraps MCP-wrapped {item:[..]} arrays at the top level', () => {
    const out = sanitizeProps({
      rows: { item: [{ id: 'r1' }, { id: 'r2' }] },
    });
    expect(out).toEqual({
      rows: [{ id: 'r1' }, { id: 'r2' }],
    });
  });

  it('AC1: unwraps nested MCP-wrapped arrays recursively', () => {
    const out = sanitizeProps({
      rows: {
        item: [
          { id: 'r1', tags: { item: ['a', 'b'] } },
          { id: 'r2', tags: { item: ['c'] } },
        ],
      },
    });
    expect(out).toEqual({
      rows: [
        { id: 'r1', tags: ['a', 'b'] },
        { id: 'r2', tags: ['c'] },
      ],
    });
  });

  it('AC1: does NOT unwrap objects whose single key is not "item"', () => {
    const out = sanitizeProps({
      config: { url: 'https://example.com' },
    });
    expect(out).toEqual({ config: { url: 'https://example.com' } });
  });

  it('AC1: does NOT unwrap objects with multiple keys, even if one is "item"', () => {
    const out = sanitizeProps({
      rows: { item: [1, 2], count: 2 },
    });
    // Two-key object → not the MCP envelope → recurse normally.
    expect(out).toEqual({ rows: { item: [1, 2], count: 2 } });
  });

  it('AC2: coerces finite-number strings to numbers', () => {
    const out = sanitizeProps({ pageSize: '10' });
    expect(out).toEqual({ pageSize: 10 });
    expect(typeof out['pageSize']).toBe('number');
  });

  it('AC2: coerces negative and decimal strings', () => {
    expect(sanitizeProps({ v: '-3' })).toEqual({ v: -3 });
    expect(sanitizeProps({ v: '1.5' })).toEqual({ v: 1.5 });
  });

  it('AC2: does NOT coerce empty strings, non-numeric strings, or oversized strings', () => {
    expect(sanitizeProps({ v: '' })).toEqual({ v: '' });
    expect(sanitizeProps({ v: 'abc' })).toEqual({ v: 'abc' });
    // 17-digit string — exceeds the 16-char safety cap.
    expect(sanitizeProps({ v: '12345678901234567' })).toEqual({ v: '12345678901234567' });
    // Exponent form — regex `/^-?\d+(?:\.\d+)?$/` rejects "1e10".
    expect(sanitizeProps({ v: '1e10' })).toEqual({ v: '1e10' });
  });

  it('AC2: does NOT coerce hex / version-like strings', () => {
    expect(sanitizeProps({ v: '0x10' })).toEqual({ v: '0x10' });
    expect(sanitizeProps({ v: 'v1.2.3' })).toEqual({ v: 'v1.2.3' });
  });

  it('AC3: preserves flat arrays of objects, recursing into each item', () => {
    const out = sanitizeProps({
      rows: [
        { id: 'r1', children: { item: [{ name: 'a' }] } },
        { id: 'r2', children: { item: [{ name: 'b' }] } },
      ],
    });
    expect(out).toEqual({
      rows: [
        { id: 'r1', children: [{ name: 'a' }] },
        { id: 'r2', children: [{ name: 'b' }] },
      ],
    });
  });

  it('AC4: passes through non-numeric / arbitrary strings unchanged', () => {
    const out = sanitizeProps({
      label: 'ORD-1001',
      status: 'Shipped',
      currency: '$248.00',
      date: '2026-09-01',
    });
    expect(out).toEqual({
      label: 'ORD-1001',
      status: 'Shipped',
      currency: '$248.00',
      date: '2026-09-01',
    });
  });

  it('does not mutate the input object', () => {
    const input = {
      rows: { item: [{ id: 'r1' }] },
      pageSize: '10',
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    sanitizeProps(input);
    expect(input).toEqual(snapshot);
  });

  it('handles the canonical real-world failing payload from the bridge log', () => {
    // Captured verbatim from /tmp/genicui-playground-server.log when
    // the agent produced an MCP-wrapped array + quoted scalar.
    const out = sanitizeProps({
      pageSize: '10',
      rows: {
        item: [
          { id: 'ORD-1001', customer: 'Olivia Martin', date: '2026-09-01', status: 'Shipped', total: '$248.00' },
          { id: 'ORD-1002', customer: 'Jackson Lee', date: '2026-09-02', status: 'Processing', total: '$129.50' },
        ],
      },
    });
    expect(out).toEqual({
      pageSize: 10,
      rows: [
        { id: 'ORD-1001', customer: 'Olivia Martin', date: '2026-09-01', status: 'Shipped', total: '$248.00' },
        { id: 'ORD-1002', customer: 'Jackson Lee', date: '2026-09-02', status: 'Processing', total: '$129.50' },
      ],
    });
    expect(Array.isArray(out['rows'])).toBe(true);
    expect(typeof out['pageSize']).toBe('number');
  });

  it('handles empty and zero-key objects', () => {
    expect(sanitizeProps({})).toEqual({});
    expect(sanitizeProps({ rows: [] })).toEqual({ rows: [] });
    expect(sanitizeProps({ rows: { item: [] } })).toEqual({ rows: [] });
  });
});

// ---------------------------------------------------------------------------
// sanitizeBridgeValue — lower-level coverage
// ---------------------------------------------------------------------------

describe('sanitizeBridgeValue (F43b helpers)', () => {
  it('returns null and undefined as-is', () => {
    expect(sanitizeValue(null)).toBe(null);
    expect(sanitizeValue(undefined)).toBe(undefined);
  });

  it('returns numbers and booleans unchanged', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(0)).toBe(0);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(false)).toBe(false);
  });

  it('trims whitespace before coercing numbers', () => {
    expect(sanitizeValue('  42  ')).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// F43b-AC5 — full bridge round-trip: single-attempt mount
// ---------------------------------------------------------------------------

describe('chat bridge round-trip (F43b-AC5)', () => {
  beforeEach(() => {
    componentStore.clear();
  });

  it('bridges a render_component with MCP-wrapped rows + quoted pageSize on the first attempt', () => {
    const session = createMockSession();

    // The exact shape that triggered 26 retries before the fix.
    const line = JSON.stringify({
      type: 'tool_use',
      id: 'toolu_f43b_1',
      name: 'render_component',
      input: {
        componentName: 'DataTable',
        props: {
          pageSize: '10',
          rows: { item: [{ id: 'r1', name: 'Alice' }] },
        },
      },
    });

    __test_handleParsedLine(session, line, 'claude-code');

    const mounted = session.ws.sentMessages
      .map((m) => JSON.parse(m) as Record<string, unknown>)
      .find((f) => f.type === 'COMPONENT_MOUNTED');

    expect(mounted).toBeDefined();
    const payload = mounted!.payload as Record<string, unknown>;
    expect(payload['name']).toBe('DataTable');
    // Sanitized initialState: rows is a flat array, pageSize is a number.
    expect(payload['initialState']).toEqual({
      pageSize: 10,
      rows: [{ id: 'r1', name: 'Alice' }],
    });

    // No bridge-failure log assertion here (logs go to console.error),
    // but the single COMPONENT_MOUNTED + zero failed-attempt round
    // trips is the externally observable signature of the fix.
  });

  it('still bridges a clean (non-MCP-wrapped) payload unchanged', () => {
    const session = createMockSession();

    const line = JSON.stringify({
      type: 'tool_use',
      id: 'toolu_f43b_2',
      name: 'render_component',
      input: {
        componentName: 'DataTable',
        props: { rows: [{ id: 'r2', name: 'Bob' }] },
      },
    });

    __test_handleParsedLine(session, line, 'claude-code');

    const mounted = session.ws.sentMessages
      .map((m) => JSON.parse(m) as Record<string, unknown>)
      .find((f) => f.type === 'COMPONENT_MOUNTED');
    expect(mounted).toBeDefined();
    const payload = mounted!.payload as Record<string, unknown>;
    expect(payload['initialState']).toEqual({ rows: [{ id: 'r2', name: 'Bob' }] });
  });
});

// ---------------------------------------------------------------------------
// F43b-AC6 — MCP-direct trust boundary is unchanged
// ---------------------------------------------------------------------------

describe('MCP-direct trust boundary (F43 follow-up)', () => {
  it('unwraps MCP-wrapped rows and accepts the render', () => {
    // F43 follow-up: renderComponent now applies the same
    // `unwrapMcpArrayProps` normalizer the chat-bridge uses, so an MCP
    // client that sends `{ item: [...] }` for an array prop mounts
    // successfully instead of failing with -32003.
    const result = renderComponent({
      name: 'DataTable',
      props: {
        pageSize: '10',
        rows: { item: [{ id: 'r1', name: 'Alice' }] },
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.initialState).toEqual({
      pageSize: 10,
      rows: [{ id: 'r1', name: 'Alice' }],
    });
  });

  it('coerces quoted scalar pageSize on MCP-direct path (F43 follow-up)', () => {
    // The MCP-direct path now runs the same `unwrapMcpArrayProps`
    // sanitizer the chat-bridge uses, so `pageSize: '10'` is coerced
    // to `10` and the component mounts. The MCP-array unwrap step is
    // no longer bridge-only — both surfaces share one normalizer.
    const result = renderComponent({
      name: 'DataTable',
      props: {
        pageSize: '10',
        rows: [{ id: 'r1', name: 'Alice' }],
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.initialState).toEqual({
      pageSize: 10,
      rows: [{ id: 'r1', name: 'Alice' }],
    });
  });

  it('accepts sanitized props when MCP-direct caller sends them already-flat', () => {
    const result = renderComponent({
      name: 'DataTable',
      props: {
        pageSize: 10,
        rows: [{ id: 'r1', name: 'Alice' }],
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.name).toBe('DataTable');
    expect(result.initialState).toEqual({
      pageSize: 10,
      rows: [{ id: 'r1', name: 'Alice' }],
    });
  });
});
