/**
 * Chat composable — singleton state shared across the playground app.
 *
 * Uses module-level state so any component calling useChat() shares the
 * same reactive history (ChatHistory, ChatInput, and ToolCallAccordion
 * all stay in sync).
 *
 * @see {F43} — Suggestive prompts + registry selector
 * @see {F43 follow-up} — Claude Code–style chat panel with structured
 *                        tool-call array (replaces inline `[calling …]`
 *                        text annotations)
 * @see {F43 chat-as-render-surface} — Chat is the only render surface;
 *                                     the old `RenderSurface` center
 *                                     column was removed.
 */

import { ref, readonly } from 'vue';
import type { ProviderWirePayload } from '../providers/types.js';

/**
 * Discriminated union for the assistant bubble state in the chat panel.
 *  - `pending`           — waiting for first chunk (grey "Awaiting response")
 *  - `streaming`         — at least one `chat.event` rendered (typing dots)
 *  - `complete`          — `chat.complete` received; response frozen
 *  - `error`             — `chat.error` received; bubble shows error text
 */
export type AssistantStatus = 'pending' | 'streaming' | 'complete' | 'error';

/**
 * Tool call lifecycle status — drives the accordion's status pill.
 *  - `running` — `tool_call` seen, awaiting `tool_result`
 *  - `done`    — `tool_result` arrived with a payload
 *  - `error`   — tool-level error (set on `toolCalls[i].error`)
 */
export type ToolCallStatus = 'running' | 'done' | 'error';

/**
 * Structured entry for a single tool invocation by the agent.
 *
 * Populated from `chat.event` frames:
 *  - `tool_call`   → push new entry with `status: 'running'`
 *  - `tool_result` → find by `id` (or last running entry), set
 *                    `result`, flip status to `'done'`
 *  - tool-level `error` → flip status to `'error'`, set `error`
 *
 * The MCP wrapper emits bare names like `render_component` or the
 * MCP-prefixed form `mcp__<server>__<tool>` — we preserve whichever
 * the agent sent so the accordion header reflects the wire payload.
 */
export interface ToolCallEntry {
  /** Tool call id from the agent stream; falls back to `name` if absent. */
  id: string;
  /** Bare or MCP-prefixed tool name. */
  name: string;
  /** Raw input the agent passed (JSON-serializable). */
  input: unknown;
  /** Tool result payload; populated when the matching `tool_result` arrives. */
  result?: unknown;
  status: ToolCallStatus;
  /** ISO timestamp for the start of the call. */
  startedAt: string;
  /** Optional error text when status is `'error'`. */
  error?: string;
}

/**
 * A chat message in the history.
 *
 * `response` carries the concatenated visible assistant prose (no
 * longer includes inline `[calling …]` annotations). Tool calls live
 * in `toolCalls` so the chat panel can render each as its own
 * collapsible accordion (Claude Code `--verbose` parity).
 */
export interface ChatMessage {
  /** The prompt text. */
  prompt: string;
  /** The LLM response text (prose only — tool calls are in `toolCalls`). */
  response: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Assistant bubble state — drives the spinner / typing dots. */
  status: AssistantStatus;
  /** Ordered tool calls made during this assistant turn. */
  toolCalls: ToolCallEntry[];
}

/**
 * Module-level singleton state so all callers share one history.
 */
const history = ref<ChatMessage[]>([]);
const isLoading = ref(false);

/**
 * Chat composable for managing chat history and sending messages.
 *
 * @returns Reactive chat state and methods.
 */
export function useChat() {
  /**
   * Send a chat message through the WebSocket.
   *
   * @param prompt — The user's prompt text.
   * @param ws — The WebSocket composable instance.
   * @param registry — Optional registry framework identifier.
   * @param provider — Optional provider wire payload (provider.id + config)
   *                   so the server can route to the right adaptor.
   */
  function sendMessage(
    prompt: string,
    ws: { send: (data: Record<string, unknown>) => void },
    registry?: string,
    provider?: ProviderWirePayload,
  ): void {
    if (prompt.trim().length === 0) {
      return;
    }

    isLoading.value = true;

    // Add the user prompt immediately so the chat panel shows progress.
    // `toolCalls` starts empty per message — events populate it as the
    // turn progresses.
    history.value.push({
      prompt,
      response: '',
      timestamp: new Date().toISOString(),
      status: 'pending',
      toolCalls: [],
    });

    ws.send({
      v: 1,
      channel: '__chat__',
      type: 'chat.message',
      payload: {
        prompt,
        registry,
        provider,
      },
      seq: 0,
    });
  }

  /**
   * Handle a chat.response frame from the server.
   *
   * Replaces the last pending message with the complete response.
   *
   * @param frame — The chat response frame.
   */
  function handleResponse(frame: unknown): void {
    const payload = (frame as { payload?: { prompt: string; response: string; timestamp: string } }).payload;
    if (!payload) return;

    // Update the last message with the response (or push if not found).
    // Pre-existing entries without `toolCalls` (e.g. from old test fixtures
    // or the legacy echo path) get a default empty array.
    const lastIdx = history.value.length - 1;
    if (lastIdx >= 0 && history.value[lastIdx]!.prompt === payload.prompt && !history.value[lastIdx]!.response) {
      const existing = history.value[lastIdx]!;
      history.value[lastIdx] = {
        prompt: payload.prompt,
        response: payload.response,
        timestamp: payload.timestamp,
        status: 'complete',
        toolCalls: existing.toolCalls ?? [],
      };
    } else {
      history.value.push({
        prompt: payload.prompt,
        response: payload.response,
        timestamp: payload.timestamp,
        status: 'complete',
        toolCalls: [],
      });
    }

    isLoading.value = false;
  }

  /**
   * Handle a `chat.event` frame from the server.
   *
   * The chat channel events from the Claude Code adaptor carry one of
   * these `event.type` values (see `packages/server/src/chat/providers/
   * claude-code.ts::mapStreamJsonEvent`):
   *  - `ai_text`     — visible assistant text chunk → appended to `response`
   *  - `tool_call`   — the agent is calling a tool → push to `toolCalls`
   *  - `tool_result` — a tool returned → set result + flip status to `'done'`
   *  - `status`      — progress markers (init, thinking, complete); ignore
   *  - `error`       — non-fatal error event; tool-level → set `toolCalls[i].error`,
   *                    prose-level → append to `response`
   *  - `stderr`      — provider stderr (logged to console)
   *  - `user_event`  — F43: synthetic user bubble after a component
   *                    interaction (e.g. clicked Submit on InputPair).
   *                    Pushed as a new entry with status `complete`.
   *
   * Anything else is ignored so the chat stays focused on the user-facing
   * assistant response.
   */
  function handleEvent(frame: unknown): void {
    const evt = (frame as { payload?: { event?: { type?: string; data?: Record<string, unknown> } } }).payload?.event;
    if (!evt || typeof evt.type !== 'string') return;

    const lastIdx = history.value.length - 1;

    switch (evt.type) {
      case 'ai_text': {
        if (lastIdx < 0) return;
        const last = history.value[lastIdx]!;
        const chunk = typeof evt.data?.['text'] === 'string' ? evt.data['text'] : '';
        if (chunk) {
          history.value[lastIdx] = {
            ...last,
            response: last.response + chunk,
            status: last.status === 'pending' ? 'streaming' : last.status,
          };
        }
        break;
      }
      case 'tool_call': {
        if (lastIdx < 0) return;
        const last = history.value[lastIdx]!;
        const entry = makeToolCallEntry(evt.data ?? {});
        history.value[lastIdx] = {
          ...last,
          toolCalls: [...last.toolCalls, entry],
          status: 'streaming',
        };
        break;
      }
      case 'tool_result': {
        if (lastIdx < 0) return;
        const last = history.value[lastIdx]!;
        const resultId = typeof evt.data?.['id'] === 'string' ? evt.data['id'] : null;
        const resultPayload = evt.data?.['result'];
        const toolCalls = upsertToolCallResult(last.toolCalls, resultId, resultPayload);
        history.value[lastIdx] = {
          ...last,
          toolCalls,
          status: 'streaming',
        };
        break;
      }
      case 'error': {
        if (lastIdx < 0) return;
        const last = history.value[lastIdx]!;
        const msg = typeof evt.data?.['error'] === 'string'
          ? evt.data['error']
          : typeof evt.data?.['message'] === 'string'
            ? evt.data['message']
            : 'Unknown error';
        // If a tool call is currently running, attach the error there
        // instead of polluting the prose. Otherwise fall back to prose.
        const toolCalls = last.toolCalls.some((tc) => tc.status === 'running')
          ? last.toolCalls.map((tc) =>
              tc.status === 'running' ? { ...tc, status: 'error' as ToolCallStatus, error: msg } : tc,
            )
          : last.toolCalls;
        history.value[lastIdx] = {
          ...last,
          response: last.toolCalls.some((tc) => tc.status === 'running')
            ? last.response
            : last.response + `\n[error: ${msg}]`,
          toolCalls,
          status: toolCalls !== last.toolCalls ? 'streaming' : last.status,
        };
        break;
      }
      case 'stderr': {
        const text = typeof evt.data?.['text'] === 'string' ? evt.data['text'] : '';
        if (text) {
          console.warn('[chat] stderr from provider:', text.slice(0, 200));
        }
        break;
      }
      case 'user_event': {
        // F43: a chat-embedded component fired an event. The server
        // synthesizes a follow-up turn, but FIRST it sends this
        // `user_event` so the chat history shows a click bubble
        // before the next assistant response lands.
        //
        // We push a synthetic user entry with a click-description
        // prompt. ChatPanel.vue renders user entries (status
        // `complete` + empty response) as the user bubble; we want
        // this to look like a click event so we prefix the prompt
        // with `[click]`. The actual UI distinguishes user entries
        // from assistant entries via the `prompt`-only shape (no
        // `toolCalls`, `response` empty, status complete).
        //
        // This case is append-only and runs even when history is
        // empty so the synthetic bubble still appears if the user
        // clicked a component before sending any prompt.
        const componentId = typeof evt.data?.['componentId'] === 'string'
          ? (evt.data['componentId'] as string)
          : '?';
        const name = typeof evt.data?.['name'] === 'string'
          ? (evt.data['name'] as string)
          : null;
        const action = typeof evt.data?.['action'] === 'string'
          ? (evt.data['action'] as string)
          : '?';
        const detail = evt.data?.['payload'] as Record<string, unknown> | undefined;

        const prompt = `[click] ${action} on ${name ?? componentId}` +
          (detail ? ` ${JSON.stringify(detail)}` : '');

        history.value.push({
          prompt,
          response: '',
          timestamp: new Date().toISOString(),
          status: 'complete',
          toolCalls: [],
        });
        break;
      }
      // 'status', 'tool_use' verb-only, and anything else: ignore.
    }
  }

  /**
   * Handle a `chat.complete` frame from the server — finalizes the
   * assistant bubble for the most recent prompt and clears isLoading.
   */
  function handleComplete(frame: unknown): void {
    const reason = (frame as { payload?: { reason?: string } }).payload?.reason ?? 'complete';
    const lastIdx = history.value.length - 1;
    if (lastIdx >= 0) {
      const last = history.value[lastIdx]!;
      history.value[lastIdx] = {
        ...last,
        status: reason === 'error' ? 'error' : 'complete',
      };
    }
    isLoading.value = false;
  }

  /**
   * Handle a chat.error frame from the server.
   */
  function handleError(): void {
    isLoading.value = false;
    const lastIdx = history.value.length - 1;
    if (lastIdx >= 0) {
      const last = history.value[lastIdx]!;
      history.value[lastIdx] = {
        ...last,
        status: 'error',
      };
    }
  }

  /**
   * Clear the chat history.
   */
  function clear(): void {
    history.value = [];
    isLoading.value = false;
  }

  return {
    history: readonly(history),
    isLoading: readonly(isLoading),
    sendMessage,
    handleResponse,
    handleEvent,
    handleComplete,
    handleError,
    clear,
  };
}

/**
 * Build a `ToolCallEntry` from a `tool_call` event payload.
 *
 * Provider field-name variance is handled by accepting either
 * `input` or `args` for the call payload and either `name` or
 * omitting it (defaults to 'tool'). The `id` falls back to the
 * name so subsequent `tool_result` events can match by id when the
 * provider doesn't emit one.
 *
 * @internal — exported for unit tests.
 */
export function makeToolCallEntry(data: Record<string, unknown>): ToolCallEntry {
  const name = typeof data['name'] === 'string' && data['name'].length > 0
    ? (data['name'] as string)
    : 'tool';
  const id = typeof data['id'] === 'string' && (data['id'] as string).length > 0
    ? (data['id'] as string)
    : name;
  const input = data['input'] ?? data['args'] ?? {};
  return {
    id,
    name,
    input,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
}

/**
 * Update the matching tool call with a result. If `id` matches an
 * existing entry, attach the result to it; otherwise attach to the
 * most recent running entry. Falls back to no-op if no running call
 * is found (so we never silently drop a tool result).
 *
 * @internal — exported for unit tests.
 */
export function upsertToolCallResult(
  toolCalls: ToolCallEntry[],
  id: string | null,
  result: unknown,
): ToolCallEntry[] {
  if (toolCalls.length === 0) return toolCalls;

  // 1. id match
  if (id !== null) {
    const idx = toolCalls.findIndex((tc) => tc.id === id);
    if (idx >= 0) {
      return toolCalls.map((tc, i) =>
        i === idx ? { ...tc, result, status: 'done' as ToolCallStatus } : tc,
      );
    }
  }

  // 2. last running entry
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const tc = toolCalls[i]!;
    if (tc.status === 'running') {
      return toolCalls.map((entry, j) =>
        j === i ? { ...entry, result, status: 'done' as ToolCallStatus } : entry,
      );
    }
  }

  // 3. no match → return unchanged (don't synthesize an entry)
  return toolCalls;
}
