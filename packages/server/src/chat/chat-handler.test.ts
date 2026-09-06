// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for chat handler — F43.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SequenceGenerator } from '@genicui/core';

import { handleChatMessage, __test_handleParsedLine } from './chat-handler.js';
import type { WsSession } from '../transport/types.js';
import { componentStore } from '../mcp/component-store.js';

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
      expect(payload['initialState']).toEqual({ rows: [{ id: '2', name: 'Bob' }] });
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
});
