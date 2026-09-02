/**
 * GenicUI Server — Elysia HTTP server entry point.
 *
 * @module @genicui/server
 *
 * @see {F9} — Bun + Elysia HTTP server skeleton
 * @see {F46} — API key auth
 */

import { Elysia } from 'elysia';

import {
  hashApiKey,
  parseBearerKey,
  validateKey,
  AuthError,
  scrubApiKey,
} from './auth/index.js';

/**
 * Health check response shape.
 *
 * @see {F9-AC1} — /health returns { status: 'ok' } in <10ms
 */
interface HealthResponse {
  status: 'ok';
}

const PORT = 3040;
const HOSTNAME = '0.0.0.0';

/**
 * Pre-computed hash store for API key validation.
 *
 * Populated from the `GENICUI_API_KEY` environment variable at startup.
 * Only SHA-256 hashes are stored; the plaintext key is never retained.
 */
const apiHashStore = new Map<
  string,
  { keyId: string; keyType: 'live' | 'test' }
>();

/**
 * Initialise the API key hash store from the environment.
 */
function initApiKeys(): void {
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
export function createServer() {
  // Initialise API key store from environment
  initApiKeys();

  // Authenticated API app — guard applies only to /api/* routes
  const apiApp = new Elysia({ prefix: '/api' })
    .onRequest(() => {
      // This hook runs for every request in this app (only /api/* routes)
      // Access headers via the Elysia context
    })
    .get('/status', (c): ApiStatusResponse => {
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
      } catch (err) {
        if (err instanceof AuthError) {
          c.set.status = err.statusCode;
          throw err;
        }
        c.set.status = 401;
        throw new AuthError('Unauthorized', 401);
      }
    });

  // Main app with open health endpoint
  const app = new Elysia()
    .get('/health', (): HealthResponse => ({
      status: 'ok',
    }))
    .use(apiApp);

  app.listen({ port: PORT, hostname: HOSTNAME });

  // Use stderr for logging — stdout is MCP transport
  // Scrub any API key references from log output (F46-AC3)
  const url = scrubApiKey(String(app.server!.url));
  console.error(`Server running at ${url}`);

  return app;
}

/**
 * Start the server when this module is executed directly.
 */
if (import.meta.main) {
  createServer();
}
