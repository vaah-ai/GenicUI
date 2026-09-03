/**
 * WebSocket client composable for connecting to the GenicUI server.
 *
 * Connects to ws://localhost:3040/ws with the genicui.v1 subprotocol.
 * Parses frame envelopes and emits typed events for component lifecycle.
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
 * WebSocket client composable.
 *
 * @returns Reactive state and methods for managing the WebSocket connection.
 */
export function useWebSocket() {
  const state = ref<ConnectionState>('disconnected');
  const sessionId = ref<string | null>(null);
  const serverVersion = ref<string | null>(null);
  const messageCount = ref(0);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Message callback type for subscribers.
   */
  type MessageHandler = (frame: FrameEnvelope) => void;

  const handlers: Set<MessageHandler> = new Set();

  /**
   * Subscribe to incoming frames.
   *
   * @param handler — Called for every parsed frame envelope.
   * @returns Unsubscribe function.
   */
  function onMessage(handler: MessageHandler): () => void {
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
   * @param url — WebSocket URL (defaults to ws://localhost:3040/ws)
   * @param apiKey — API key for authentication (optional in dev mode)
   */
  async function connect(
    url: string = 'ws://localhost:3040/ws',
    apiKey: string | null = null,
  ): Promise<void> {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    state.value = 'connecting';

    try {
      // Build protocol header: genicui.v1, optionally with api-key
      const protocols = ['genicui.v1'];
      if (apiKey) {
        protocols.push(`api-key.${apiKey}`);
      }

      socket = new WebSocket(url, protocols);

      socket.onopen = () => {
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
        state.value = 'disconnected';
        console.log(
          `[useWebSocket] Closed: code=${event.code} reason=${event.reason}`,
        );
        socket = null;

        // Auto-reconnect after 3s
        reconnectTimer = setTimeout(() => {
          console.log('[useWebSocket] Attempting reconnect...');
          connect(url, apiKey);
        }, 3000);
      };

      socket.onerror = () => {
        state.value = 'error';
        console.error('[useWebSocket] Connection error');
      };
    } catch (err) {
      state.value = 'error';
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

  return {
    state: readonly(state),
    sessionId: readonly(sessionId),
    serverVersion: readonly(serverVersion),
    messageCount: readonly(messageCount),
    connect,
    disconnect,
    onMessage,
    send,
  };
}
