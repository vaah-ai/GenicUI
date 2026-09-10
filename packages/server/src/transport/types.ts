/**
 * WebSocket transport types.
 *
 * @module @genicui/server/transport
 *
 * @see {F10} — WebSocket transport (handshake + auth + heartbeat)
 */


/** WebSocket subprotocol required for all GenicUI connections. */
export const GENICUI_SUBPROTOCOL = 'genicui.v1' as const;

/** Heartbeat ping interval in milliseconds. */
export const HEARTBEAT_MS = 30_000;

/** Maximum time (ms) a client has to respond to a ping. */
export const PONG_TIMEOUT_MS = 5_000;

/** Number of missed pongs before the server closes the connection. */
export const MAX_MISSED_PONGS = 2;

/** WS close code for server timeout (heartbeat failure). */
export const CLOSE_CODE_TIMEOUT = 1011;

/** Maximum channels per socket. */
export const MAX_CHANNELS = 256;

/**
 * Parsed API key from WebSocket upgrade headers.
 */
export interface WsApiKey {
  /** The raw API key string extracted from the upgrade request. */
  key: string;
}

/**
 * Server.hello payload sent as the first frame on a successful connection.
 *
 * @see {F10-AC1} — server.hello within 100ms
 */
export interface ServerHelloPayload {
  /** Unique session identifier. */
  sessionId: string;
  /** Server version string. */
  serverVersion: string;
  /** Heartbeat interval in milliseconds. */
  heartbeatMs: number;
}

/**
 * ElysiaWS — the wrapped WebSocket object Elysia passes to handlers.
 * Defined here because the type is not exported from the elysia package.
 */
export interface ElysiaWS {
  raw: unknown;
  send(data: string | Buffer, compress?: boolean): void;
  ping(data?: string | Buffer): void;
  pong(data?: string | Buffer): void;
  close(code?: number, reason?: string): void;
  data: unknown;
  id: string;
  remoteAddress: string;
  readyState: number;
}

/**
 * Payload of a `chat.component_event` frame the client sends when a
 * user interacts with a chat-embedded GenicUI component (F43).
 *
 * The wire shape mirrors what `useComponents.sendComponentEvent()`
 * produces on the playground side:
 *   { componentId, name, action, payload }
 *
 * - `componentId` identifies which mounted component the event came
 *   from. Required.
 * - `name` is the registered component name (e.g. "InputPair"). Optional
 *   — the server can resolve it from the component store if the client
 *   omits it.
 * - `action` is the event name (e.g. "submit"). Required.
 * - `payload` is the component-specific event detail, JSON-serializable.
 *   Optional.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export interface ChatComponentEventPayload {
  componentId: string;
  name?: string;
  action: string;
  payload?: Record<string, unknown>;
}

/**
 * State tracked per WebSocket connection.
 */
export interface WsSession {
  /** Unique session identifier. */
  sessionId: string;

  /** The Elysia-wrapped WebSocket. */
  elysiaWs: ElysiaWS;

  /** Interval ID for heartbeat pings. */
  heartbeatInterval: ReturnType<typeof setInterval> | null;

  /** Timeout ID for the current pong deadline. */
  pongTimeout: ReturnType<typeof setTimeout> | null;

  /** Count of consecutive missed pongs. */
  missedPongs: number;

  /** Whether the connection has been cleaned up. */
  destroyed: boolean;

  /** Channel multiplexer for frame dispatch. */
  multiplexer: import('./channel-multiplexer.js').ChannelMultiplexer;

  /** Sequence number generator for outbound frames. */
  seqGenerator: import('@genicui/core').SequenceGenerator;

  /** Internal event bus for outbound frame emission and backpressure. */
  eventBus: import('../bus/event-bus.js').InternalEventBus;

  /** Message buffer for session recovery (F33). */
  recoveryBuffer: import('../session-recovery/message-buffer.js').MessageBuffer;
}
