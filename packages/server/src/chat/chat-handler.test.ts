// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for chat handler — F43.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SequenceGenerator } from '@genicui/core';

import { handleChatMessage } from './chat-handler.js';
import type { WsSession } from '../transport/types.js';

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
    multiplexer: {
      dispatch: () => ({ channel: 'test', frames: [] }),
      destroy: () => {},
    } as never,
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
  });
});
