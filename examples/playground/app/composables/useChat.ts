/**
 * Chat composable — manages chat history and sends chat messages via WebSocket.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { ref, readonly } from 'vue';

/**
 * A chat message in the history.
 */
export interface ChatMessage {
  /** The prompt text. */
  prompt: string;
  /** The LLM response text. */
  response: string;
  /** ISO timestamp. */
  timestamp: string;
}

/**
 * Chat composable for managing chat history and sending messages.
 *
 * @returns Reactive chat state and methods.
 */
export function useChat() {
  const history = ref<ChatMessage[]>([]);
  const isLoading = ref(false);

  /**
   * Send a chat message through the WebSocket.
   *
   * @param prompt — The user's prompt text.
   * @param ws — The WebSocket composable instance.
   * @param registry — Optional registry framework identifier.
   */
  function sendMessage(
    prompt: string,
    ws: { send: (data: Record<string, unknown>) => void },
    registry?: string,
  ): void {
    if (prompt.trim().length === 0) {
      return;
    }

    isLoading.value = true;

    // Send the chat message on the __chat__ channel
    ws.send({
      v: 1,
      channel: '__chat__',
      type: 'chat.message',
      payload: {
        prompt,
        registry,
      },
      seq: 0,
    });

    // Add the prompt to history as a placeholder (will be replaced with response)
    // The actual response will come via chat.response frames
  }

  /**
   * Handle a chat.response frame from the server.
   *
   * @param frame — The chat response frame.
   */
  function handleResponse(frame: unknown): void {
    const payload = (frame as { payload?: { prompt: string; response: string; timestamp: string } }).payload;
    if (!payload) return;

    // Add the complete message to history
    history.value.push({
      prompt: payload.prompt,
      response: payload.response,
      timestamp: payload.timestamp,
    });

    isLoading.value = false;
  }

  /**
   * Handle a chat.error frame from the server.
   */
  function handleError(): void {
    isLoading.value = false;
  }

  /**
   * Clear the chat history.
   */
  function clear(): void {
    history.value = [];
  }

  return {
    history: readonly(history),
    isLoading: readonly(isLoading),
    sendMessage,
    handleResponse,
    handleError,
    clear,
  };
}
