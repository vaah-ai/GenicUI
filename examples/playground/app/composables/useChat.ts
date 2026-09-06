/**
 * Chat composable — singleton state shared across the playground app.
 *
 * Uses module-level state so any component calling useChat() shares the
 * same reactive history (RenderSurface → ChatPanel stay in sync).
 *
 * @see {F43} — Suggestive prompts + registry selector
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
 * A chat message in the history.
 */
export interface ChatMessage {
  /** The prompt text. */
  prompt: string;
  /** The LLM response text (empty while loading). */
  response: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Assistant bubble state — drives the spinner / typing dots. */
  status: AssistantStatus;
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

    // Add the user prompt immediately so the chat panel shows progress
    history.value.push({
      prompt,
      response: '',
      timestamp: new Date().toISOString(),
      status: 'pending',
    });

    // Send the chat message on the __chat__ channel. The provider block
    // is the new Sub-task B addition — the server ignores it for now but
    // a follow-up task will read it to spawn the right CLI per turn.
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

    // Update the last message with the response (or push if not found)
    const lastIdx = history.value.length - 1;
    if (lastIdx >= 0 && history.value[lastIdx]!.prompt === payload.prompt && !history.value[lastIdx]!.response) {
      history.value[lastIdx] = {
        prompt: payload.prompt,
        response: payload.response,
        timestamp: payload.timestamp,
        status: 'complete',
      };
    } else {
      history.value.push({
        prompt: payload.prompt,
        response: payload.response,
        timestamp: payload.timestamp,
        status: 'complete',
      });
    }

    isLoading.value = false;
  }

  /**
   * Handle a `chat.event` frame from the server — appends a streaming
   * chunk to the assistant bubble for the most recent user prompt.
   *
   * The chat channel events from the Claude Code adaptor carry one of
   * these `event.type` values (see `packages/server/src/chat/providers/
   * claude-code.ts::mapStreamJsonEvent`):
   *  - `ai_text`     — visible assistant text chunk
   *  - `tool_call`   — the agent is calling a tool (e.g. render_component)
   *  - `tool_result` — a tool returned; not displayed
   *  - `status`      — progress markers (init, thinking, complete); ignore
   *  - `error`       — non-fatal error event; surface in chat
   *  - `stderr`      — provider stderr (logged to console)
   *
   * Anything else is ignored so the chat stays focused on the user-facing
   * assistant response.
   */
  function handleEvent(frame: unknown): void {
    const evt = (frame as { payload?: { event?: { type?: string; data?: Record<string, unknown> } } }).payload?.event;
    if (!evt || typeof evt.type !== 'string') return;

    const lastIdx = history.value.length - 1;
    if (lastIdx < 0) return;
    const last = history.value[lastIdx]!;

    switch (evt.type) {
      case 'ai_text': {
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
        const toolName = typeof evt.data?.['name'] === 'string' ? evt.data['name'] : 'tool';
        history.value[lastIdx] = {
          ...last,
          response: last.response + `\n[calling ${toolName}…]`,
          status: 'streaming',
        };
        break;
      }
      case 'tool_result': {
        const result = typeof evt.data?.['result'] === 'string' ? evt.data['result'] : '';
        if (result) {
          history.value[lastIdx] = {
            ...last,
            response: last.response + `\n[tool returned ${result.length} chars]`,
            status: 'streaming',
          };
        }
        break;
      }
      case 'error': {
        const msg = typeof evt.data?.['error'] === 'string'
          ? evt.data['error']
          : typeof evt.data?.['message'] === 'string'
            ? evt.data['message']
            : 'Unknown error';
        history.value[lastIdx] = {
          ...last,
          response: last.response + `\n[error: ${msg}]`,
          status: 'streaming',
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
      // 'status', 'tool_use', 'tool_result' verb-only, and anything else: ignore.
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
