/**
 * Chat handler — routes user chat messages through the Agent Bridge to an LLM,
 * then returns component mount instructions via WebSocket frames.
 *
 * @module @genicui/server/chat/chat-handler
 * @see {F43} — Suggestive prompts + registry selector
 */

import type { WsSession } from '../transport/types.js';
import { serializeFrame } from '../transport/frame-handler.js';

/**
 * A chat message from the frontend.
 */
export interface ChatMessage {
  /** The user's prompt text. */
  prompt: string;
  /** Optional: the registry framework the user selected. */
  registry: string | undefined;
}

/**
 * A chat response frame sent back to the frontend.
 */
interface ChatResponsePayload {
  /** The original prompt. */
  prompt: string;
  /** Response text from the LLM. */
  response: string;
  /** Server timestamp. */
  timestamp: string;
}

/**
 * Handle a chat message from the WebSocket client.
 *
 * Currently, this echoes the prompt back as a chat response.
 * In a full implementation, it would route through the Agent Bridge
 * to an LLM, which would call MCP tools to render components.
 *
 * @param session — the WebSocket session
 * @param message — the chat message from the client
 */
export function handleChatMessage(
  session: WsSession,
  message: ChatMessage,
): void {
  // Validate prompt
  if (!message.prompt || message.prompt.trim().length === 0) {
    sendChatError(session, 'Prompt cannot be empty');
    return;
  }

  // Echo the prompt back as a response (placeholder for LLM integration)
  // In a full implementation, this would call agentBridge.execute(prompt)
  const response: ChatResponsePayload = {
    prompt: message.prompt,
    response: `Received prompt: "${message.prompt}"`,
    timestamp: new Date().toISOString(),
  };

  // Send the chat response on the __chat__ channel
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.response',
    payload: response,
    seq: session.seqGenerator.next(),
  };

  session.elysiaWs.send(serializeFrame(frame));

  // Log the chat message
  console.error(
    `[chat] Session ${session.sessionId}: prompt="${message.prompt.slice(0, 80)}"`,
  );
}

/**
 * Send a chat error to the client.
 *
 * @param session — the WebSocket session
 * @param error — the error message
 */
function sendChatError(session: WsSession, error: string): void {
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.error',
    payload: { error },
    seq: session.seqGenerator.next(),
  };

  session.elysiaWs.send(serializeFrame(frame));
}
