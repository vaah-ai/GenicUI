/**
 * WebSocket transport — upgrade handler, authentication, server.hello, heartbeat.
 *
 * @module @genicui/server/transport/websocket
 *
 * @see {F10} — WebSocket transport (handshake + auth + heartbeat)
 * @see {F10-AC1} — Valid upgrade + server.hello within 100ms
 * @see {F10-AC2} — Invalid key -> HTTP 401
 * @see {F10-AC3} — Missing subprotocol -> HTTP 400
 * @see {F10-AC4} — 30s ping with 5s pong deadline
 * @see {F10-AC5} — 2 missed pongs -> WS close 1011
 */
import type { ServerWebSocket } from 'bun';
/**
 * Elysia upgrade context — the object passed to the `upgrade` callback.
 * Has `.request` (the Request object) and `.headers` (Record<string, string|undefined>).
 * We read from the underlying `Request` object via `.request`.
 */
interface UpgradeContext {
    request: Request;
    headers: Record<string, string | undefined>;
    [key: string]: unknown;
}
type ElysiaWS = {
    raw: ServerWebSocket<unknown>;
    send(data: string | Buffer, compress?: boolean): void;
    ping(data?: string | Buffer): void;
    pong(data?: string | Buffer): void;
    close(code?: number, reason?: string): void;
    data: unknown;
    id: string;
    remoteAddress: string;
    readyState: number;
};
/**
 * Global reference to the API key hash store, shared between HTTP and WebSocket.
 * Set during server initialization in createServer().
 */
export declare const wsApiKeyStore: {
    store: Map<string, {
        keyId: string;
        keyType: "live" | "test";
    }> | null;
    set(s: Map<string, {
        keyId: string;
        keyType: "live" | "test";
    }>): void;
    get(): Map<string, {
        keyId: string;
        keyType: "live" | "test";
    }> | null;
};
/**
 * Create a WebSocket handler for the `/ws` endpoint.
 *
 * Handles:
 * - Subprotocol validation (must include `genicui.v1`)
 * - API key authentication (delegates to F46 middleware)
 * - Session creation with unique ID
 * - `server.hello` first frame (within 100ms)
 * - 30s heartbeat with 5s pong timeout, 2 missed pongs = close
 *
 * Returns both the `upgrade` function and the WebSocket handlers
 * compatible with Elysia's `.ws()` method.
 */
export declare function createWsHandler(): {
    upgrade: (ctx: UpgradeContext) => string | Response | null | undefined;
    open: (ws: ElysiaWS) => void;
    message: (ws: ElysiaWS, message: unknown) => void;
    close: (ws: ElysiaWS, code: number, reason: string) => void;
    pong: (ws: ElysiaWS) => void;
};
export {};
//# sourceMappingURL=websocket.d.ts.map