/**
 * GenicUI Server — Elysia HTTP server entry point.
 *
 * @module @genicui/server
 *
 * @see {F9} — Bun + Elysia HTTP server skeleton
 */
import { Elysia } from 'elysia';
const PORT = 3040;
const HOSTNAME = '0.0.0.0';
/**
 * Create and start the GenicUI HTTP server.
 *
 * Listens on port 3040, hostname 0.0.0.0 by default.
 *
 * @returns The configured Elysia application instance
 */
export function createServer() {
    const app = new Elysia().get('/health', () => ({
        status: 'ok'
    }));
    app.listen({ port: PORT, hostname: HOSTNAME });
    // Use stderr for logging — stdout is MCP transport
    console.error(`Server running at ${app.server.url}`);
    return app;
}
/**
 * Start the server when this module is executed directly.
 */
if (import.meta.main) {
    createServer();
}
//# sourceMappingURL=index.js.map