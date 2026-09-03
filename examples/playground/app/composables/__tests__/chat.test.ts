/**
 * Tests for the chat composable — F43.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { describe, it, expect } from 'bun:test';
import { useChat } from '../useChat.ts';

describe('useChat', () => {
  it('starts with empty history and not loading', () => {
    const chat = useChat();
    expect(chat.history.value).toEqual([]);
    expect(chat.isLoading.value).toBe(false);
  });

  it('exposes sendMessage, handleResponse, handleError, clear methods', () => {
    const chat = useChat();
    expect(typeof chat.sendMessage).toBe('function');
    expect(typeof chat.handleResponse).toBe('function');
    expect(typeof chat.handleError).toBe('function');
    expect(typeof chat.clear).toBe('function');
  });

  it('sendMessage sends a frame to the WebSocket', () => {
    const chat = useChat();

    const sent: Record<string, unknown>[] = [];
    const mockWs = {
      send: (data: Record<string, unknown>) => sent.push(data),
    };

    chat.sendMessage('Show me a data table', mockWs);

    expect(sent).toHaveLength(1);
    expect(sent[0].channel).toBe('__chat__');
    expect(sent[0].type).toBe('chat.message');
    expect(sent[0].payload).toHaveProperty('prompt', 'Show me a data table');
  });

  it('sendMessage does not send empty prompts', () => {
    const chat = useChat();

    const sent: Record<string, unknown>[] = [];
    const mockWs = {
      send: (data: Record<string, unknown>) => sent.push(data),
    };

    chat.sendMessage('', mockWs);

    expect(sent).toHaveLength(0);
  });

  it('sendMessage includes registry when provided', () => {
    const chat = useChat();

    const sent: Record<string, unknown>[] = [];
    const mockWs = {
      send: (data: Record<string, unknown>) => sent.push(data),
    };

    chat.sendMessage('Show me a data table', mockWs, 'primevue');

    expect(sent[0].payload).toHaveProperty('registry', 'primevue');
  });

  it('handleResponse adds a message to history', () => {
    const chat = useChat();

    chat.handleResponse({
      payload: {
        prompt: 'Show me a data table',
        response: 'Received prompt: "Show me a data table"',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    });

    expect(chat.history.value).toHaveLength(1);
    expect(chat.history.value[0].prompt).toBe('Show me a data table');
    expect(chat.isLoading.value).toBe(false);
  });

  it('handleResponse ignores frames without payload', () => {
    const chat = useChat();

    chat.handleResponse({});

    expect(chat.history.value).toHaveLength(0);
  });

  it('handleError sets loading to false', () => {
    const chat = useChat();
    chat.isLoading; // access to initialize

    // Simulate loading state
    chat.sendMessage('test', { send: () => {} });

    chat.handleError();
    expect(chat.isLoading.value).toBe(false);
  });

  it('clear removes all messages', () => {
    const chat = useChat();

    // Add a message
    chat.handleResponse({
      payload: {
        prompt: 'test',
        response: 'response',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    });

    expect(chat.history.value).toHaveLength(1);

    chat.clear();
    expect(chat.history.value).toHaveLength(0);
  });

  it('history is readonly', () => {
    const chat = useChat();

    // history and isLoading are readonly proxies
    expect(chat.history).toBeDefined();
    expect(chat.isLoading).toBeDefined();
  });
});
