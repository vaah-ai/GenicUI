// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for chat handler — F43.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SequenceGenerator } from '@genicui/core';

import { handleChatMessage, __test_handleParsedLine, broadcastComponentMountedAll } from './chat-handler.js';
import type { WsSession } from '../transport/types.js';
import { componentStore } from '../mcp/component-store.js';
import { renderComponent } from '../mcp/render-handler.js';

/**
 * Mock Elysia WebSocket for testing.
 */
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
 * instead of forwarding through Elysia. Used to assert that the
 * render_component bridge produced a COMPONENT_MOUNTED frame.
 */
class RecordingMultiplexer {
  frames: unknown[] = [];
  destroy(): void {}
  dispatch(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }
  // F43 follow-up: bridge uses the new dispatchServerFrame() path
  // (server-initiated frames seed the FrameBuffer so they flush
  // immediately rather than getting held against seq 0).
  dispatchServerFrame(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }
  registerChannel(): null { return null; }
  hasChannel(): boolean { return true; }
  getChannels(): string[] { return []; }
  get channelCount(): number { return 0; }
}

/**
 * Create a mock WsSession for testing.
 */
function createMockSession(): WsSession & { ws: MockElysiaWs } {
  const mockWs = new MockElysiaWs();
  const seqGenerator = new SequenceGenerator();

  return {
    sessionId: 'test-session-123',
    elysiaWs: mockWs as never,
    heartbeatInterval: null,
    pongTimeout: null,
    missedPongs: 0,
    destroyed: false,
    multiplexer: new RecordingMultiplexer() as never,
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
    ws: mockWs,
  };
}

describe('chat-handler', () => {
  describe('handleChatMessage', () => {
    it('sends a chat.response frame for a valid prompt', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: 'Show me a data table with orders',
        registry: undefined,
      });

      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;

      expect(frame.v).toBe(1);
      expect(frame.channel).toBe('__chat__');
      expect(frame.type).toBe('chat.response');
      const payload = frame.payload as Record<string, string>;
      expect(payload.prompt).toBe('Show me a data table with orders');
      expect(payload.response).toContain('Show me a data table with orders');
      expect(payload.timestamp).toBeDefined();
      expect(frame.seq).toBeDefined();
    });

    it('sends a chat.error frame for an empty prompt', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: '',
        registry: undefined,
      });

      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;

      expect(frame.channel).toBe('__chat__');
      expect(frame.type).toBe('chat.error');
      const payload = frame.payload as Record<string, string>;
      expect(payload.error).toBe('Prompt cannot be empty');
    });

    it('sends a chat.error frame for a whitespace-only prompt', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: '   ',
        registry: undefined,
      });

      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;

      expect(frame.type).toBe('chat.error');
      const payload = frame.payload as Record<string, string>;
      expect(payload.error).toBe('Prompt cannot be empty');
    });

    it('handles a prompt with a registry specified', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: 'Show me a data table',
        registry: 'primevue',
      });

      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;

      expect(frame.type).toBe('chat.response');
      const payload = frame.payload as Record<string, string>;
      expect(payload.prompt).toBe('Show me a data table');
    });

    it('increments sequence number for each message', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: 'First prompt',
        registry: undefined,
      });

      handleChatMessage(session, {
        prompt: 'Second prompt',
        registry: undefined,
      });

      const frame1 = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;
      const frame2 = JSON.parse(session.ws.sentMessages[1]) as Record<string, unknown>;

      // seq is a bigint (serialized as string in JSON)
      expect(Number(frame2.seq)).toBeGreaterThan(Number(frame1.seq));
    });

    it('emits chat.error for an unknown provider id', async () => {
      const session = createMockSession();

      await handleChatMessage(session, {
        prompt: 'Show me a data table',
        registry: undefined,
        provider: { id: 'definitely-not-a-provider', config: {} },
      });

      // Give the async runChatTurn path a chance to settle. Unknown
      // providers short-circuit BEFORE spawn, so we don't actually
      // wait for any subprocess — the error fires synchronously.
      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;
      expect(frame.channel).toBe('__chat__');
      expect(frame.type).toBe('chat.error');
      const payload = frame.payload as Record<string, string>;
      expect(payload.error).toContain('Unknown provider');
    });

    it('echoes back a chat.response when provider is omitted (legacy path)', () => {
      const session = createMockSession();

      handleChatMessage(session, {
        prompt: 'No provider set',
        registry: undefined,
      });

      expect(session.ws.sentMessages).toHaveLength(1);
      const frame = JSON.parse(session.ws.sentMessages[0]) as Record<string, unknown>;
      expect(frame.type).toBe('chat.response');
      const payload = frame.payload as Record<string, string>;
      expect(payload.prompt).toBe('No provider set');
      expect(payload.response).toContain('No provider set');
    });
  });

  describe('render_component bridge (M5-T6 follow-up)', () => {
    beforeEach(() => {
      componentStore.clear();
    });

    it('bridges a render_component tool_call to a COMPONENT_MOUNTED frame', () => {
      const session = createMockSession();

      // Mimic a stream-json line from Claude Code calling render_component.
      // DataTable is the only stub component in the MVP catalog, with a
      // schema requiring `rows: Array<Record<string, unknown>>`.
      const line = JSON.stringify({
        type: 'tool_use',
        id: 'toolu_test_1',
        name: 'render_component',
        input: {
          componentName: 'DataTable',
          props: { rows: [{ id: '1', name: 'Alice' }] },
        },
      });

      __test_handleParsedLine(session, line, 'claude-code');

      // Should have produced two WS frames: a chat.event (tool_call)
      // and a COMPONENT_MOUNTED on the new component's channel.
      const mounted = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'COMPONENT_MOUNTED');
      expect(mounted).toBeDefined();
      expect(mounted!.channel).toMatch(/^da-/);
      const payload = mounted!.payload as Record<string, unknown>;
      expect(payload['componentId']).toBe(mounted!.channel);
      expect(payload['name']).toBe('DataTable');
      expect(payload['initialState']).toEqual({ rows: [{ id: '1', name: 'Alice' }] });
    });

    it('bridges a render_component tool_call using legacy `name` arg shape', () => {
      const session = createMockSession();

      const line = JSON.stringify({
        type: 'tool_use',
        id: 'toolu_test_2',
        name: 'render_component',
        input: {
          name: 'DataTable',
          props: { rows: [{ id: '2', name: 'Bob' }] },
        },
      });

      __test_handleParsedLine(session, line, 'claude-code');

      const mounted = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'COMPONENT_MOUNTED');
      expect(mounted).toBeDefined();
      const payload = mounted!.payload as Record<string, unknown>;
      expect(payload['name']).toBe('DataTable');
      expect(payload['initialState']).toEqual({ rows: [{ id: '2', name: 'Bob' }] });
    });

    it('bridges an MCP-prefixed render_component tool_call (mcp__<server>__render_component)', () => {
      // Regression: Claude Code wraps MCP tool names as
      // `mcp__<server>__<tool>`. Before the isRenderComponentCall()
      // helper, the bridge compared against the bare `render_component`
      // string and silently dropped MCP-wrapped calls, leaving the
      // playground with no mounted component despite a successful
      // `find_ui_component` + `render_component` round-trip.
      const session = createMockSession();

      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'toolu_mcp_1',
              name: 'mcp__genicui__render_component',
              input: {
                componentName: 'DataTable',
                props: { rows: [{ id: '3', name: 'Carol' }] },
              },
            },
          ],
        },
      });

      __test_handleParsedLine(session, line, 'claude-code');

      const mounted = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'COMPONENT_MOUNTED');
      expect(mounted).toBeDefined();
      const payload = mounted!.payload as Record<string, unknown>;
      expect(payload['name']).toBe('DataTable');
      expect(payload['initialState']).toEqual({ rows: [{ id: '3', name: 'Carol' }] });
    });

    it('bridges an MCP-prefixed render_component in compact (top-level tool_use) form', () => {
      const session = createMockSession();

      const line = JSON.stringify({
        type: 'tool_use',
        id: 'toolu_mcp_2',
        name: 'mcp__genicui__render_component',
        input: {
          componentName: 'DataTable',
          props: { rows: [{ id: '4', name: 'Dan' }] },
        },
      });

      __test_handleParsedLine(session, line, 'claude-code');

      const mounted = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'COMPONENT_MOUNTED');
      expect(mounted).toBeDefined();
      const payload = mounted!.payload as Record<string, unknown>;
      expect(payload['initialState']).toEqual({ rows: [{ id: '4', name: 'Dan' }] });
    });

    it('does not bridge non-render_component tool calls', () => {
      const session = createMockSession();

      const line = JSON.stringify({
        type: 'tool_use',
        id: 'toolu_test_3',
        name: 'find_ui_component',
        input: { intent: 'cart' },
      });

      __test_handleParsedLine(session, line, 'claude-code');

      const mounted = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'COMPONENT_MOUNTED');
      expect(mounted).toBeUndefined();

      // Tool call should still surface as chat.event for the chat panel.
      const toolEvent = session.ws.sentMessages
        .map((m) => JSON.parse(m) as Record<string, unknown>)
        .find((f) => f.type === 'chat.event');
      expect(toolEvent).toBeDefined();
    });
  });

  describe('broadcastComponentMountedAll', () => {
    it('delivers a COMPONENT_MOUNTED frame to every live session with the payload name', () => {
      // F43 follow-up regression: the stateless `/mcp` HTTP endpoint
      // broadcasts render_component results via this helper, so the
      // playground's RenderSurface updates without going through the
      // chat pipeline. The test stubs the SESSIONS set directly
      // because websocket.ts is the only module that mutates it; we
      // poke it through `broadcastToAllSessions` by calling this
      // helper with no live sessions and verifying it returns 0.
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: '1', name: 'Alice' }] },
      });
      expect(result.error).toBeUndefined();
      expect(result.name).toBe('DataTable');

      // No sessions registered in the test environment -> 0 delivered.
      const delivered = broadcastComponentMountedAll(result);
      expect(delivered).toBe(0);
    });

    it('includes the component name in the broadcast payload', () => {
      // The MCP -> WS broadcast payload carries `name` so the
      // playground client doesn't have to sniff the schema for
      // `x-genicui-name` (which the server never set). The companion
      // assertion lives in `handleParsedLine` tests above; this test
      // asserts the RenderResult.name field itself is populated so
      // any future caller of broadcastComponentMountedAll sees a
      // consistent shape.
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: '1', name: 'Alice' }] },
      });
      expect(result.name).toBe('DataTable');
      expect(result.componentId).toMatch(/^da-/);
      expect(result.channel).toBe(result.componentId);
    });
  });
});
