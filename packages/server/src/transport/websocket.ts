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
import { SequenceGenerator } from '@genicui/core';
import type { WsSession, ServerHelloPayload } from './types.js';
import {
  GENICUI_SUBPROTOCOL,
  HEARTBEAT_MS,
  PONG_TIMEOUT_MS,
  MAX_MISSED_PONGS,
  CLOSE_CODE_TIMEOUT,
} from './types.js';
import {
  validateKey,
  parseBearerKey,
  validateApiKeyFormat,
  scrubApiKey,
} from '../auth/index.js';
import { parseFrame, serializeFrame, CLOSE_CODE_PROTOCOL_ERROR } from './frame-handler.js';
import { ChannelMultiplexer } from './channel-multiplexer.js';
import { InternalEventBus } from '../bus/event-bus.js';

/** Server version string sent in server.hello. */
const SERVER_VERSION = '0.1.0';

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

/**
 * Extract the API key from a WebSocket upgrade request.
 *
 * The key can be provided in two ways:
 * 1. `Sec-WebSocket-Protocol` header containing `api-key.<key>`
 * 2. `Authorization: Bearer <key>` header
 *
 * @param ctx - The Elysia upgrade context (has `.request` property)
 * @returns The raw API key string, or null if no key was found
 */
function extractApiKey(ctx: UpgradeContext): string | null {
  const request = ctx.request;
  // Try Sec-WebSocket-Protocol for api-key directive
  const protocol = request.headers.get('sec-websocket-protocol');
  if (protocol) {
    const protocols = protocol.split(',').map((p) => p.trim());
    for (const p of protocols) {
      if (p.startsWith('api-key.')) {
        const key = p.slice('api-key.'.length);
        if (key) return key;
      }
    }
  }

  // Fall back to Authorization: Bearer header
  const authHeader = request.headers.get('authorization');
  return parseBearerKey(authHeader ?? undefined);
}

/**
 * Check if the upgrade request includes the `genicui.v1` subprotocol.
 *
 * @param ctx - The Elysia upgrade context (has `.request` property)
 * @returns `true` if `genicui.v1` is present in `Sec-WebSocket-Protocol`
 */
function hasGenicuiSubprotocol(ctx: UpgradeContext): boolean {
  const request = ctx.request;
  const protocol = request.headers.get('sec-websocket-protocol');
  if (!protocol) return false;

  const protocols = protocol.split(',').map((p) => p.trim());
  return protocols.includes(GENICUI_SUBPROTOCOL);
}

/**
 * Send a server.hello frame as the first message on a WebSocket connection.
 *
 * @param sessionId - The session identifier
 * @returns The serialized frame string
 */
function createServerHelloFrame(sessionId: string): string {
  const payload: ServerHelloPayload = {
    sessionId,
    serverVersion: SERVER_VERSION,
    heartbeatMs: HEARTBEAT_MS,
  };

  const frame = {
    v: 1,
    channel: '__session__',
    type: 'server.hello',
    payload,
    seq: 1,
  };

  return JSON.stringify(frame);
}

/**
 * Start the heartbeat timer for a WebSocket session.
 *
 * Every 30s the server sends a ping frame. The client must respond
 * with a pong within 5s. After 2 consecutive missed pongs, the
 * server closes the connection with code 1011.
 *
 * @see {F10-AC4} — 30s ping with 5s pong deadline
 * @see {F10-AC5} — 2 missed pongs -> WS close 1011
 */
function startHeartbeat(session: WsSession): void {
  const ping = () => {
    if (session.destroyed) {
      stopHeartbeat(session);
      return;
    }

    // Send WebSocket ping via ElysiaWS
    session.elysiaWs.ping();

    // Set pong deadline
    session.pongTimeout = setTimeout(() => {
      if (session.destroyed) {
        stopHeartbeat(session);
        return;
      }

      session.missedPongs += 1;

      if (session.missedPongs >= MAX_MISSED_PONGS) {
        // Close connection — heartbeat failure
        console.error(
          `[F10] Session ${session.sessionId} closed: ${session.missedPongs} missed pongs`,
        );
        session.elysiaWs.close(CLOSE_CODE_TIMEOUT, '');
        stopHeartbeat(session);
        return;
      }

      // Retry ping
      ping();
    }, PONG_TIMEOUT_MS);
  };

  // Start heartbeat interval
  session.heartbeatInterval = setInterval(ping, HEARTBEAT_MS);
}

/**
 * Reset the missed pong counter when a valid pong is received.
 */
function onPong(session: WsSession): void {
  if (session.missedPongs > 0) {
    session.missedPongs = 0;
  }

  // Clear the pong timeout if it exists
  if (session.pongTimeout) {
    clearTimeout(session.pongTimeout);
    session.pongTimeout = null;
  }
}

/**
 * Stop all heartbeat timers and clean up resources.
 */
function stopHeartbeat(session: WsSession): void {
  if (session.heartbeatInterval) {
    clearInterval(session.heartbeatInterval);
    session.heartbeatInterval = null;
  }
  if (session.pongTimeout) {
    clearTimeout(session.pongTimeout);
    session.pongTimeout = null;
  }
}

// ElysiaWS type — the wrapped WebSocket object Elysia passes to handlers.
// We access it via `any` because the ElysiaWS type isn't exported.
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
export const wsApiKeyStore = {
  store: null as Map<string, { keyId: string; keyType: 'live' | 'test' }> | null,
  set(s: Map<string, { keyId: string; keyType: 'live' | 'test' }>) { this.store = s; },
  get(): Map<string, { keyId: string; keyType: 'live' | 'test' }> | null { return this.store; },
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
export function createWsHandler(): {
  upgrade: (ctx: UpgradeContext) => string | Response | null | undefined;
  open: (ws: ElysiaWS) => void;
  message: (ws: ElysiaWS, message: unknown) => void;
  close: (ws: ElysiaWS, code: number, reason: string) => void;
  pong: (ws: ElysiaWS) => void;
} {
  const isProd = process.env.GENICUI_ENV === 'production';

  return {
    /**
     * Upgrade validation — runs before WebSocket handshake.
     * Rejects connections that don't include the `genicui.v1` subprotocol
     * or fail API key authentication.
     *
     * @see {F10-AC2} — Invalid key -> HTTP 401
     * @see {F10-AC3} — Missing subprotocol -> HTTP 400
     */
    upgrade(ctx) {
      // Check subprotocol first (F10-AC3)
      if (!hasGenicuiSubprotocol(ctx)) {
        throw new Response('Bad Request', {
          status: 400,
          statusText: 'Missing genicui.v1 subprotocol',
        });
      }

      // Check API key (F10-AC2)
      const apiKey = extractApiKey(ctx);
      if (!apiKey) {
        throw new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' },
        });
      }

      // Validate key format
      if (!validateApiKeyFormat(apiKey)) {
        throw new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' },
        });
      }

      // Reject test keys in production
      if (isProd && apiKey.startsWith('gnc_test_')) {
        throw new Response('Forbidden', { status: 403 });
      }

      // If API key store is configured (not dev mode), validate against stored hashes
      const store = wsApiKeyStore.get();
      if (store && store.size > 0) {
        try {
          validateKey(apiKey, store, isProd);
        } catch {
          throw new Response('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Bearer' },
          });
        }
      }

      // Accept — return the subprotocol to negotiate
      return GENICUI_SUBPROTOCOL;
    },

    /**
     * Fires after successful WebSocket upgrade.
     * Sends `server.hello` and starts the heartbeat timer.
     */
    open(ws) {
      // Generate session ID
      const sessionId = `sess-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

      // Create channel multiplexer and sequence generator
      const multiplexer = new ChannelMultiplexer();
      const seqGenerator = new SequenceGenerator();

      // Create internal event bus (F20) with backpressure support
      const eventBus = new InternalEventBus(
        (data: string) => ws.send(data),
        seqGenerator,
        (code: number, reason: string) => ws.close(code, reason),
      );

      // Create session state
      const session: WsSession = {
        sessionId,
        elysiaWs: ws,
        heartbeatInterval: null,
        pongTimeout: null,
        missedPongs: 0,
        destroyed: false,
        multiplexer,
        seqGenerator,
        eventBus,
      };

      // Store session state on ws.data (Elysia uses ws.data for context)
      ws.data = session;

      // Start heartbeat
      startHeartbeat(session);

      // Log connection (scrub any API key references)
      const logMsg = scrubApiKey(`[F10] WebSocket connected: ${sessionId}`);
      console.error(logMsg);

      // Send server.hello as the first frame
      const helloFrame = createServerHelloFrame(sessionId);
      ws.send(helloFrame);
    },

    /**
     * Handle incoming messages from the client.
     * Parses the frame, validates it, dispatches to the channel multiplexer,
     * and resets the pong counter.
     *
     * @see {F11-AC4} — Malformed frame -> WS close 1003
     */
    message(ws, message) {
      const session = ws.data as WsSession | undefined;
      if (!session) return;

      // Reset pong counter on any inbound message
      onPong(session);

      // Parse the inbound frame
      const frame = parseFrame(message as string);
      if (frame === null) {
        // Malformed frame — close with protocol error (F11-AC4)
        console.error(
          `[F11] Session ${session.sessionId} closed: malformed frame`,
        );
        ws.close(CLOSE_CODE_PROTOCOL_ERROR, 'Invalid frame');
        return;
      }

      // Dispatch frame to channel multiplexer
      const result = session.multiplexer.dispatch(frame);
      if (result === null) {
        // Channel limit exceeded (F11-AC2) — send error and close
        const errorFrame = {
          v: 1,
          channel: frame.channel,
          type: 'error',
          payload: {
            code: -32001,
            message: 'Channel limit exceeded (256 channels per socket)',
          },
          seq: session.seqGenerator.next(),
        };
        // Type assertion safe: FrameEnvelope shape matches
        ws.send(serializeFrame(errorFrame as never));
        return;
      }

      // Log dispatched frames (useful for debugging)
      if (result.frames.length > 0) {
        console.error(
          `[F11] Session ${session.sessionId} dispatched ${result.frames.length} frame(s) on channel "${result.channel}"`,
        );
      }
    },

    /**
     * Handle WebSocket close — clean up heartbeat timers and multiplexer.
     */
    close(ws, _code, _reason) {
      const session = ws.data as WsSession | undefined;
      if (!session) return;

      session.destroyed = true;
      stopHeartbeat(session);

      // Clean up channel multiplexer
      session.multiplexer.destroy();

      // Clean up event bus (F20)
      session.eventBus.dispose();

      // Log disconnection
      const logMsg = scrubApiKey(
        `[F10] WebSocket closed: ${session.sessionId}`,
      );
      console.error(logMsg);
    },

    /**
     * Handle pong response — reset missed pong counter.
     */
    pong(ws) {
      const session = ws.data as WsSession | undefined;
      if (session) {
        onPong(session);
      }
    },
  };
}
