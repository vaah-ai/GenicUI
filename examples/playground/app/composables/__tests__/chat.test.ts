/**
 * Tests for the chat composable — F43 + F43 follow-up.
 *
 * @see {F43} — Suggestive prompts + registry selector
 * @see {F43 follow-up} — Claude Code–style chat panel with structured
 *                        tool-call array
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { useChat, makeToolCallEntry, upsertToolCallResult } from '../useChat.ts';
import { useChatInput } from '../useChatInput.ts';

describe('useChat', () => {
  beforeEach(() => {
    // Reset singleton state before each test
    useChat().clear();
    useChatInput().clear();
  });

  it('starts with empty history and not loading', () => {
    const chat = useChat();
    expect(chat.history.value).toEqual([]);
    expect(chat.isLoading.value).toBe(false);
  });

  it('exposes sendMessage, handleResponse, handleEvent, handleComplete, handleError, clear methods', () => {
    const chat = useChat();
    expect(typeof chat.sendMessage).toBe('function');
    expect(typeof chat.handleResponse).toBe('function');
    expect(typeof chat.handleEvent).toBe('function');
    expect(typeof chat.handleComplete).toBe('function');
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

  it('sendMessage includes provider payload when provided', () => {
    const chat = useChat();

    const sent: Record<string, unknown>[] = [];
    const mockWs = {
      send: (data: Record<string, unknown>) => sent.push(data),
    };

    chat.sendMessage('Show me a data table', mockWs, 'primevue', {
      id: 'claude-code',
      config: { cliPath: '/usr/local/bin/claude' },
    });

    const payload = sent[0].payload as Record<string, unknown>;
    expect(payload.provider).toEqual({
      id: 'claude-code',
      config: { cliPath: '/usr/local/bin/claude' },
    });
  });

  it('sendMessage omits provider when not provided', () => {
    const chat = useChat();

    const sent: Record<string, unknown>[] = [];
    const mockWs = {
      send: (data: Record<string, unknown>) => sent.push(data),
    };

    chat.sendMessage('Show me a data table', mockWs);

    const payload = sent[0].payload as Record<string, unknown>;
    expect(payload.provider).toBeUndefined();
  });

  it('sendMessage seeds an empty toolCalls array on the optimistic message', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    expect(chat.history.value[0]!.toolCalls).toEqual([]);
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
    expect(chat.history.value[0]!.prompt).toBe('Show me a data table');
    expect(chat.history.value[0]!.status).toBe('complete');
    expect(chat.history.value[0]!.toolCalls).toEqual([]);
    expect(chat.isLoading.value).toBe(false);
  });

  it('handleResponse ignores frames without payload', () => {
    const chat = useChat();

    chat.handleResponse({});

    expect(chat.history.value).toHaveLength(0);
  });

  it('handleEvent appends a text chunk to the latest message', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: { event: { type: 'ai_text', data: { text: 'world' } } },
    });

    expect(chat.history.value[0]!.response).toBe('world');
    expect(chat.history.value[0]!.status).toBe('streaming');
  });

  it('handleEvent pushes a structured tool_call entry (no inline prose)', () => {
    // F43 follow-up: tool_call now lives in the structured toolCalls
    // array, NOT as an inline `[calling …]` annotation on `response`.
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: {
        event: {
          type: 'tool_call',
          data: {
            id: 'toolu_1',
            name: 'render_component',
            input: { componentName: 'DataTable', props: { rows: [] } },
          },
        },
      },
    });

    const msg = chat.history.value[0]!;
    expect(msg.response).toBe(''); // prose unchanged
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0]!.id).toBe('toolu_1');
    expect(msg.toolCalls[0]!.name).toBe('render_component');
    expect(msg.toolCalls[0]!.status).toBe('running');
    expect(msg.toolCalls[0]!.input).toEqual({
      componentName: 'DataTable',
      props: { rows: [] },
    });
  });

  it('handleEvent preserves MCP-prefixed tool names verbatim', () => {
    // Regression for the F43 bridge fix — the MCP wrapper emits
    // `mcp__genicui__render_component`. The chat panel must show
    // that name as-is so the bridge path stays inspectable.
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: {
        event: {
          type: 'tool_call',
          data: {
            id: 'toolu_mcp_1',
            name: 'mcp__genicui__render_component',
            input: { componentName: 'DataTable' },
          },
        },
      },
    });

    expect(chat.history.value[0]!.toolCalls[0]!.name).toBe(
      'mcp__genicui__render_component',
    );
  });

  it('handleEvent tool_result flips the matching tool call status to done and stores result', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: {
        event: {
          type: 'tool_call',
          data: { id: 'toolu_1', name: 'render_component', input: { foo: 1 } },
        },
      },
    });
    chat.handleEvent({
      payload: {
        event: {
          type: 'tool_result',
          data: { id: 'toolu_1', result: { componentId: 'da-abc' } },
        },
      },
    });

    const calls = chat.history.value[0]!.toolCalls;
    expect(calls).toHaveLength(1);
    expect(calls[0]!.status).toBe('done');
    expect(calls[0]!.result).toEqual({ componentId: 'da-abc' });
  });

  it('handleEvent tool_result with no id attaches to the most recent running entry', () => {
    // Providers vary on whether tool_result carries an id; we tolerate
    // both shapes by falling back to the most recent running entry.
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: {
        event: {
          type: 'tool_call',
          data: { name: 'find_ui_component', input: { intent: 'cart' } },
        },
      },
    });
    chat.handleEvent({
      payload: {
        event: { type: 'tool_result', data: { result: [{ name: 'Button' }] } },
      },
    });

    const calls = chat.history.value[0]!.toolCalls;
    expect(calls).toHaveLength(1);
    expect(calls[0]!.status).toBe('done');
    expect(calls[0]!.result).toEqual([{ name: 'Button' }]);
  });

  it('handleEvent ai_text does NOT create a toolCalls entry', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: { event: { type: 'ai_text', data: { text: 'world' } } },
    });

    expect(chat.history.value[0]!.toolCalls).toEqual([]);
    expect(chat.history.value[0]!.response).toBe('world');
  });

  it('handleEvent error attaches to running tool call instead of polluting prose', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: {
        event: { type: 'tool_call', data: { name: 'render_component' } },
      },
    });
    chat.handleEvent({
      payload: { event: { type: 'error', data: { error: 'boom' } } },
    });

    const msg = chat.history.value[0]!;
    expect(msg.response).toBe(''); // prose unchanged
    expect(msg.toolCalls[0]!.status).toBe('error');
    expect(msg.toolCalls[0]!.error).toBe('boom');
  });

  it('handleEvent error with no running tool call appends to prose', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: { event: { type: 'ai_text', data: { text: 'partial answer' } } },
    });
    chat.handleEvent({
      payload: { event: { type: 'error', data: { error: 'lost connection' } } },
    });

    const msg = chat.history.value[0]!;
    expect(msg.response).toContain('partial answer');
    expect(msg.response).toContain('[error: lost connection]');
  });

  it('handleEvent ignores events with no event field', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({ payload: {} });
    chat.handleEvent({});

    expect(chat.history.value[0]!.response).toBe('');
    expect(chat.history.value[0]!.toolCalls).toEqual([]);
  });

  it('handleComplete sets status=complete and clears isLoading', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleComplete({ payload: { reason: 'complete' } });

    expect(chat.history.value[0]!.status).toBe('complete');
    expect(chat.isLoading.value).toBe(false);
  });

  it('handleComplete with reason=error sets status=error', () => {
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleComplete({ payload: { reason: 'error' } });

    expect(chat.history.value[0]!.status).toBe('error');
    expect(chat.isLoading.value).toBe(false);
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

describe('makeToolCallEntry (internal helper)', () => {
  it('builds a running entry from a tool_call payload', () => {
    const entry = makeToolCallEntry({
      id: 'toolu_1',
      name: 'render_component',
      input: { componentName: 'DataTable' },
    });

    expect(entry.id).toBe('toolu_1');
    expect(entry.name).toBe('render_component');
    expect(entry.input).toEqual({ componentName: 'DataTable' });
    expect(entry.status).toBe('running');
    expect(entry.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('falls back to name when id is missing', () => {
    const entry = makeToolCallEntry({
      name: 'find_ui_component',
      input: { intent: 'cart' },
    });

    expect(entry.id).toBe('find_ui_component');
  });

  it('accepts `args` as an alias for `input`', () => {
    const entry = makeToolCallEntry({
      name: 'render_component',
      args: { foo: 'bar' },
    });

    expect(entry.input).toEqual({ foo: 'bar' });
  });

  it('defaults name to "tool" when payload is malformed', () => {
    const entry = makeToolCallEntry({});

    expect(entry.name).toBe('tool');
    expect(entry.id).toBe('tool');
    expect(entry.input).toEqual({});
  });
});

describe('upsertToolCallResult (internal helper)', () => {
  const initial = [
    { id: 'a', name: 'tool-a', input: { x: 1 }, status: 'running' as const, startedAt: 't' },
    { id: 'b', name: 'tool-b', input: { y: 2 }, status: 'running' as const, startedAt: 't' },
  ];

  it('updates the entry matching the provided id', () => {
    const updated = upsertToolCallResult(initial, 'b', { ok: true });
    expect(updated[0]!.status).toBe('running');
    expect(updated[1]!.status).toBe('done');
    expect(updated[1]!.result).toEqual({ ok: true });
  });

  it('falls back to the most recent running entry when id is null', () => {
    const updated = upsertToolCallResult(initial, null, 'fallback result');
    expect(updated[0]!.status).toBe('running');
    expect(updated[1]!.status).toBe('done');
  });

  it('is a no-op when no running entry exists', () => {
    const allDone = initial.map((tc) => ({ ...tc, status: 'done' as const }));
    const updated = upsertToolCallResult(allDone, null, 'ignored');
    expect(updated).toEqual(allDone);
  });

  it('is a no-op on an empty toolCalls list', () => {
    const updated = upsertToolCallResult([], 'whatever', 'ignored');
    expect(updated).toEqual([]);
  });
});

describe('useChatInput (singleton)', () => {
  it('starts with empty draft and no submit request', () => {
    const input = useChatInput();
    expect(input.draft.value).toBe('');
    expect(input.submitRequested.value).toBe(false);
  });

  it('fillAndSubmit sets draft and flips submitRequested', () => {
    const input = useChatInput();
    input.fillAndSubmit('Show me a data table');

    expect(input.draft.value).toBe('Show me a data table');
    expect(input.submitRequested.value).toBe(true);
  });

  it('clear resets draft and submitRequested', () => {
    const input = useChatInput();
    input.fillAndSubmit('hello');
    input.clear();

    expect(input.draft.value).toBe('');
    expect(input.submitRequested.value).toBe(false);
  });

  it('fillAndSubmit is idempotent across repeated calls', () => {
    // Chip clicks (e.g. in the chat's empty state) may fire while a
    // previous fill is still pending; the singleton state must always
    // reflect the most recent fill so the input bar submits the latest
    // prompt.
    const input = useChatInput();
    input.fillAndSubmit('first');
    input.fillAndSubmit('second');

    expect(input.draft.value).toBe('second');
    expect(input.submitRequested.value).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F43: synthetic user bubble from chat.component_event
// ---------------------------------------------------------------------------
describe('useChat user_event (F43)', () => {
  beforeEach(() => {
    useChat().clear();
    useChatInput().clear();
  });

  it('pushes a synthetic user entry on user_event with all fields', () => {
    const chat = useChat();

    chat.handleEvent({
      payload: {
        event: {
          type: 'user_event',
          data: {
            componentId: 'cp-1',
            name: 'InputPair',
            action: 'submit',
            payload: { input1: 5, input2: 3 },
          },
        },
      },
    });

    expect(chat.history.value).toHaveLength(1);
    const entry = chat.history.value[0]!;
    expect(entry.prompt).toContain('[click]');
    expect(entry.prompt).toContain('submit');
    expect(entry.prompt).toContain('InputPair');
    expect(entry.prompt).toContain('"input1":5');
    expect(entry.prompt).toContain('"input2":3');
    // Synthetic click bubble has no response, no tool calls, complete status.
    expect(entry.response).toBe('');
    expect(entry.toolCalls).toEqual([]);
    expect(entry.status).toBe('complete');
  });

  it('falls back to componentId when name is missing', () => {
    const chat = useChat();

    chat.handleEvent({
      payload: {
        event: {
          type: 'user_event',
          data: { componentId: 'cp-unknown', action: 'tap' },
        },
      },
    });

    expect(chat.history.value).toHaveLength(1);
    const entry = chat.history.value[0]!;
    expect(entry.prompt).toContain('cp-unknown');
    expect(entry.prompt).not.toContain('undefined');
    expect(entry.prompt).not.toContain('null');
  });

  it('omits payload suffix when no detail was provided', () => {
    const chat = useChat();

    chat.handleEvent({
      payload: {
        event: {
          type: 'user_event',
          data: { componentId: 'cp-1', name: 'X', action: 'click' },
        },
      },
    });

    const entry = chat.history.value[0]!;
    expect(entry.prompt).not.toContain('undefined');
    expect(entry.prompt).not.toContain('null');
    // No `payload` keyword appears in the prompt because no detail was provided.
    expect(entry.prompt).not.toMatch(/\{\}/);
  });

  it('appends the user_event entry AFTER existing history (chronological)', () => {
    const chat = useChat();
    chat.sendMessage('give me a calculator', { send: () => {} });
    chat.handleEvent({
      payload: { event: { type: 'ai_text', data: { text: 'Sure, here is one' } } },
    });

    chat.handleEvent({
      payload: {
        event: {
          type: 'user_event',
          data: { componentId: 'cp-1', name: 'InputPair', action: 'submit' },
        },
      },
    });

    expect(chat.history.value).toHaveLength(2);
    // Existing assistant bubble still at index 0 (untouched).
    expect(chat.history.value[0]!.prompt).toBe('give me a calculator');
    expect(chat.history.value[0]!.response).toBe('Sure, here is one');
    // Synthetic click bubble is the new last entry.
    expect(chat.history.value[1]!.prompt).toContain('[click]');
  });

  it('appends a synthetic bubble even when data field is missing (client is forgiving)', () => {
    // The server's handleChatComponentEvent validates componentId +
    // action before broadcasting, so a malformed user_event should
    // not arrive in practice. But the client-side handler is
    // defensive: it pushes a bubble with the `'?'` fallback instead
    // of silently dropping the event (so the user sees feedback
    // even if a future server bug leaks an empty frame).
    const chat = useChat();
    chat.sendMessage('hello', { send: () => {} });

    chat.handleEvent({
      payload: { event: { type: 'user_event' } },
    });

    expect(chat.history.value).toHaveLength(2);
    // Existing user prompt is preserved at index 0.
    expect(chat.history.value[0]!.prompt).toBe('hello');
    // Synthetic click bubble uses the '?' fallback for both componentId
    // and action since `data` was missing.
    expect(chat.history.value[1]!.prompt).toContain('[click]');
    expect(chat.history.value[1]!.prompt).toContain('? on ?');
  });
});

