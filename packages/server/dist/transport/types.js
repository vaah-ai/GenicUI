/**
 * WebSocket transport types.
 *
 * @module @genicui/server/transport
 *
 * @see {F10} — WebSocket transport (handshake + auth + heartbeat)
 */
/** WebSocket subprotocol required for all GenicUI connections. */
export const GENICUI_SUBPROTOCOL = 'genicui.v1';
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
//# sourceMappingURL=types.js.map