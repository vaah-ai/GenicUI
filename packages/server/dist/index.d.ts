/**
 * GenicUI Server — Elysia HTTP server entry point.
 *
 * @module @genicui/server
 *
 * @see {F9} — Bun + Elysia HTTP server skeleton
 * @see {F46} — API key auth
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
 * Status response for /api/status endpoint.
 */
interface ApiStatusResponse {
    auth: 'ok';
    keyId: string;
}
/**
 * Create and start the GenicUI HTTP server.
 *
 * Listens on port 3040, hostname 0.0.0.0 by default.
 * Routes under `/api/*` require valid API key authentication.
 * The `/health` endpoint is always open.
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
} & {
    api: {
        status: {
            get: {
                body: unknown;
                params: {};
                query: unknown;
                headers: unknown;
                response: {
                    200: ApiStatusResponse;
                };
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
} & {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
}>;
export {};
//# sourceMappingURL=index.d.ts.map