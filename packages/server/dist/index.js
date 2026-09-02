/**
 * GenicUI Server — Elysia HTTP + WebSocket server entry point.
 *
 * @module @genicui/server
 *
 * @see {F9} — Bun + Elysia HTTP server skeleton
 * @see {F46} — API key auth
 * @see {F10} — WebSocket transport
 */
import { Elysia } from 'elysia';
import { hashApiKey, parseBearerKey, validateKey, AuthError, scrubApiKey, } from './auth/index.js';
import { createWsHandler, wsApiKeyStore } from './transport/websocket.js';
const PORT = 3040;
const HOSTNAME = '0.0.0.0';
/**
 * Pre-computed hash store for API key validation.
 * Shared between HTTP routes and WebSocket transport.
 * Only SHA-256 hashes are stored; the plaintext key is never retained.
 */
const apiHashStore = new Map();
/**
 * Make the hash store accessible to the WebSocket transport for validation.
 * The WS transport reads it from the wsApiKeyStore singleton during upgrade validation.
 *
 * @see {F10-AC2} — Invalid key -> HTTP 401
 */
wsApiKeyStore.set(apiHashStore);
/**
 * Initialise the API key hash store from the environment.
 */
function initApiKeys() {
    const rawKey = process.env.GENICUI_API_KEY;
    if (!rawKey) {
        // No API key configured — allow all requests (dev mode)
        return;
    }
    const hash = hashApiKey(rawKey);
    const keyType = rawKey.startsWith('gnc_test_') ? 'test' : 'live';
    const firstUnderscore = rawKey.indexOf('_');
    const visible = rawKey.slice(firstUnderscore + 1, firstUnderscore + 5);
    const keyId = `${rawKey.slice(0, firstUnderscore + 1)}${visible}****`;
    apiHashStore.set(hash, { keyId, keyType });
}
/**
 * Create and start the GenicUI HTTP + WebSocket server.
 *
 * Listens on port 3040, hostname 0.0.0.0 by default.
 * Routes under `/api/*` require valid API key authentication.
 * The `/health` endpoint is always open.
 * The `/ws` endpoint requires WebSocket subprotocol and API key auth.
 *
 * @returns The configured Elysia application instance
 */
export function createServer() {
    // Initialise API key store from environment
    initApiKeys();
    // Authenticated API app — guard applies only to /api/* routes
    const apiApp = new Elysia({ prefix: '/api' })
        .onRequest(() => {
        // This hook runs for every request in this app (only /api/* routes)
        // Access headers via the Elysia context
    })
        .get('/status', (c) => {
        const authHeader = c.request.headers.get('authorization');
        const rawKey = parseBearerKey(authHeader ?? undefined);
        if (!rawKey) {
            c.set.status = 401;
            throw new AuthError('Unauthorized', 401);
        }
        const isProd = process.env.GENICUI_ENV === 'production';
        try {
            const info = validateKey(rawKey, apiHashStore, isProd);
            return { auth: 'ok', keyId: info.keyId };
        }
        catch (err) {
            if (err instanceof AuthError) {
                c.set.status = err.statusCode;
                throw err;
            }
            c.set.status = 401;
            throw new AuthError('Unauthorized', 401);
        }
    });
    // WebSocket transport handler
    const wsHandler = createWsHandler();
    // Main app with open health endpoint and WebSocket
    const app = new Elysia()
        .get('/health', () => ({
        status: 'ok',
    }))
        // Elysia WS types are not exported; runtime behavior is correct.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .ws('/ws', wsHandler) // cast: Elysia WS types are not exported; runtime is correct
        .use(apiApp);
    app.listen({ port: PORT, hostname: HOSTNAME });
    // Use stderr for logging — stdout is MCP transport
    // Scrub any API key references from log output (F46-AC3)
    const url = scrubApiKey(String(app.server.url));
    console.error(`Server running at ${url}`);
    return app;
}
/**
 * Start the server when this module is executed directly.
 */
if (import.meta.main) {
    createServer();
}
//# sourceMappingURL=index.js.map