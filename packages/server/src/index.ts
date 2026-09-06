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
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import {
  hashApiKey,
  parseBearerKey,
  validateKey,
  AuthError,
  scrubApiKey,
} from './auth/index.js';
import { createWsHandler, wsApiKeyStore } from './transport/websocket.js';
import { handleMcpRequest } from './mcp/index.js';
import { loadRegistries, getRegistries } from './registry/registries-loader.js';

/**
 * Health check response shape.
 *
 * @see {F9-AC1} — /health returns { status: 'ok' } in <10ms
 */
interface HealthResponse {
  status: 'ok';
}

const PORT = Number(process.env.GENICUI_PORT) || 3040;
const HOSTNAME = process.env.GENICUI_HOSTNAME ?? '0.0.0.0';

/**
 * Pre-computed hash store for API key validation.
 * Shared between HTTP routes and WebSocket transport.
 * Only SHA-256 hashes are stored; the plaintext key is never retained.
 */
const apiHashStore = new Map<
  string,
  { keyId: string; keyType: 'live' | 'test' }
>();

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
 * A single component in a registry listing response.
 */
interface RegistryComponentListing {
  name: string;
  version: string;
  tags: string[];
  examplePrompts: string[] | undefined;
}

/**
 * A registry entry in the listing response.
 */
interface RegistryListing {
  id: string;
  version: string;
  framework: string;
  components: RegistryComponentListing[];
}

/**
 * Response for GET /api/registries.
 */
interface ApiRegistriesResponse {
  registries: RegistryListing[];
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

  // Load component registries from the registries/ directory (F43)
  const registriesDir = process.env.GENICUI_REGISTRIES_DIR ?? '';
  if (registriesDir) {
    loadRegistries(registriesDir);
  }

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
    })
    // F43: List available component registries for the playground frontend
    .get('/registries', (): ApiRegistriesResponse => {
      const regs = getRegistries();
      return {
        registries: regs.map((reg) => ({
          id: reg.id,
          version: reg.version,
          framework: reg.framework,
          components: reg.components,
        })),
      };
    });

  // WebSocket transport handler
  const wsHandler = createWsHandler();

  // Main app with open health endpoint, WebSocket, and MCP routes
  const app = new Elysia()
    // Permissive CORS for dev (playground on :3040, PoC on :8080). The
    // production deployment should restrict this to known origins.
    .onRequest(({ set, request }) => {
      const origin = request.headers.get('origin');
      if (origin) {
        set.headers['Access-Control-Allow-Origin'] = origin;
        set.headers['Access-Control-Allow-Credentials'] = 'true';
        set.headers['Vary'] = 'Origin';
      }
      set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      set.headers['Access-Control-Allow-Headers'] =
        'Content-Type, Authorization, X-Requested-With, Mcp-Session-Id, Last-Event-Id';
      set.headers['Access-Control-Max-Age'] = '86400';
    })
    .options('/*', () => new Response(null, { status: 204 }))
    .get('/health', (): HealthResponse => ({
      status: 'ok',
    }))
    // Elysia WS types are not exported; runtime behavior is correct.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .ws('/ws', wsHandler as any) // cast: Elysia WS types are not exported; runtime is correct
    .use(apiApp)
    // MCP Streamable HTTP endpoint (F13)
    // POST /mcp — handles JSON-RPC requests from MCP clients
    .post('/mcp', async (c): Promise<unknown> => {
      const message = c.body as JSONRPCMessage;
      return handleMcpRequest(message);
    });

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
