/**
 * GenicUI Server — Elysia HTTP server entry point.
 *
 * @module @genicui/server
 *
 * @see {F9} — Bun + Elysia HTTP server skeleton
 */
import { Elysia } from 'elysia';
/**
 * Health check response shape.
 *
 * @see {F9-AC1} — /health returns { status: 'ok' } in <10ms
 */
interface HealthResponse {
    status: 'ok';
}
/**
 * Create and start the GenicUI HTTP server.
 *
 * Listens on port 3040, hostname 0.0.0.0 by default.
 *
 * @returns The configured Elysia application instance
 */
export declare function createServer(): Elysia<"", {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    typebox: {};
    error: {};
}, {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
}, {
    health: {
        get: {
            body: unknown;
            params: {};
            query: unknown;
            headers: unknown;
            response: {
                200: HealthResponse;
            };
        };
    };
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export {};
//# sourceMappingURL=index.d.ts.map