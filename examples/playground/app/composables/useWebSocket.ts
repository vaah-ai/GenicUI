/**
 * WebSocket client composable for connecting to the GenicUI server.
 *
 * Connects to ws://localhost:3041/ws with the genicui.v1 subprotocol.
 * Parses frame envelopes and emits typed events for component lifecycle.
 *
 * Singleton pattern: the WebSocket connection, handlers, and reactive
 * state are all module-level, so every `useWebSocket()` call returns
 * the SAME instance. Without this, `ConfigPanel.vue` would call
 * `connect()` and store the socket in one instance, while `useChat`
 * in `RenderSurface.vue` would try to send on a different (null)
 * socket — and silently drop messages.
 *
 * @see {F41} — Playground demo app
 */

import { ref, readonly } from 'vue';

/**
 * Frame envelope type matching the GenicUI wire protocol.
 *
 * @see {F11} — Frame envelope serialization + channel multiplexing
 */
interface FrameEnvelope {
  v: number;
  channel: string;
  type: string;
  payload: unknown;
  seq: string;
}

/**
 * Server hello payload received on connect.
 */
interface ServerHello {
  sessionId: string;
  serverVersion: string;
  heartbeatMs: number;
}

/**
 * Connection state.
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Maximum connection retries before marking the connection as failed.
 */
const MAX_RETRIES = 5;

// Module-level singleton state — every `useWebSocket()` call shares these.
const state = ref<ConnectionState>('disconnected');
const sessionId = ref<string | null>(null);
const serverVersion = ref<string | null>(null);
const messageCount = ref(0);
const errorMsg = ref<string | null>(null);
const retryCount = ref(0);

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempts = 0;
const handlers: Set<(frame: FrameEnvelope) => void> = new Set();

/**
 * Subscribe to incoming frames.
 *
 * @param handler — Called for every parsed frame envelope.
 * @returns Unsubscribe function.
 */
function onMessage(handler: (frame: FrameEnvelope) => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Dispatch a parsed frame to all registered handlers.
 */
function dispatch(frame: FrameEnvelope): void {
  messageCount.value++;

  // Handle server.hello
  if (frame.channel === '__session__' && frame.type === 'server.hello') {
    const hello = frame.payload as ServerHello;
    sessionId.value = hello.sessionId;
    serverVersion.value = hello.serverVersion;
  }

  for (const handler of handlers) {
    try {
      handler(frame);
    } catch (err) {
      console.error('[useWebSocket] Handler error:', err);
    }
  }
}

/**
 * Connect to the GenicUI server via WebSocket.
 *
 * @param url — WebSocket URL (defaults to ws://localhost:3041/ws)
 * @param apiKey — API key for authentication (optional in dev mode)
 */
async function connect(
  url: string = 'ws://localhost:3041/ws',
  apiKey: string | null = null,
): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN) {
    return;
  }

  // Reset retry counter on explicit connect attempt
  retryAttempts = 0;
  errorMsg.value = null;
  state.value = 'connecting';
  retryCount.value = 0;

  try {
    // Build protocol header: genicui.v1, optionally with api-key
    const protocols = ['genicui.v1'];
    if (apiKey) {
      protocols.push(`api-key.${apiKey}`);
    }

    socket = new WebSocket(url, protocols);

    socket.onopen = () => {
      retryAttempts = 0;
      errorMsg.value = null;
      state.value = 'connected';
      console.log(`[useWebSocket] Connected to ${url}`);
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const frame = JSON.parse(event.data as string) as FrameEnvelope;
        dispatch(frame);
      } catch (err) {
        console.error('[useWebSocket] Failed to parse frame:', err);
      }
    };

    socket.onclose = (event) => {
      socket = null;

      if (state.value === 'connecting') {
        // Still connecting when socket closed — connection was refused
        state.value = 'error';
        retryCount.value = retryAttempts;
        errorMsg.value =
          event.reason
            ? `Connection failed: ${event.reason}`
            : 'Connection refused — is the GenicUI server running?';
        return;
      }

      state.value = 'disconnected';
      console.log(
        `[useWebSocket] Closed: code=${event.code} reason=${event.reason}`,
      );

      // Auto-reconnect after 3s (max 5 retries)
      if (retryAttempts < MAX_RETRIES) {
        reconnectTimer = setTimeout(() => {
          retryAttempts++;
          retryCount.value = retryAttempts;
          console.log(
            `[useWebSocket] Attempting reconnect (${retryAttempts}/${MAX_RETRIES})...`,
          );
          state.value = 'connecting';
          errorMsg.value = null;
          connect(url, apiKey);
        }, 3000);
      } else {
        state.value = 'error';
        errorMsg.value = `Connection failed after ${MAX_RETRIES} attempts.`;
        console.warn(
          `[useWebSocket] Max retries (${MAX_RETRIES}) reached — giving up.`,
        );
      }
    };

    socket.onerror = () => {
      console.error('[useWebSocket] Connection error');
    };
  } catch (err) {
    state.value = 'error';
    retryCount.value = retryAttempts;
    errorMsg.value =
      err instanceof Error ? err.message : 'Connection failed';
    console.error('[useWebSocket] Connect failed:', err);
  }
}

/**
 * Disconnect from the server.
 */
function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.close(1000, 'Client disconnect');
    socket = null;
  }

  retryAttempts = 0;
  retryCount.value = 0;
  errorMsg.value = null;
  state.value = 'disconnected';
  sessionId.value = null;
}

/**
 * Send a message to the server.
 *
 * @param data — Object to serialize and send.
 */
function send(data: Record<string, unknown>): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  } else {
    console.warn('[useWebSocket] Cannot send — not connected');
  }
}

/**
 * WebSocket client composable.
 *
 * @returns Reactive state and methods for managing the WebSocket connection.
 */
export function useWebSocket() {
  return {
    state: readonly(state),
    sessionId: readonly(sessionId),
    serverVersion: readonly(serverVersion),
    messageCount: readonly(messageCount),
    errorMsg: readonly(errorMsg),
    retryCount: readonly(retryCount),
    connect,
    disconnect,
    onMessage,
    send,
  };
}
