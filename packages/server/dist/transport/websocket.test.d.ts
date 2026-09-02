/**
 * WebSocket transport tests — F10 acceptance criteria.
 *
 * Tests the upgrade handler, server.hello frame, heartbeat lifecycle,
 * and session management for the WebSocket transport.
 *
 * @module @genicui/server/transport/websocket.test
 * @see {F10-AC1} — Valid upgrade + server.hello within 100ms
 * @see {F10-AC2} — Invalid key -> HTTP 401
 * @see {F10-AC3} — Missing subprotocol -> HTTP 400
 * @see {F10-AC4} — 30s ping with 5s pong deadline
 * @see {F10-AC5} — 2 missed pongs -> WS close 1011
 */
export {};
//# sourceMappingURL=websocket.test.d.ts.map