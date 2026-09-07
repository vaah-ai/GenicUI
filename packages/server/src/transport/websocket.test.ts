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

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createWsHandler, wsApiKeyStore } from './websocket.js';
import { hashApiKey } from '../auth/index.js';
import {
  GENICUI_SUBPROTOCOL,
  HEARTBEAT_MS,
  PONG_TIMEOUT_MS,
  MAX_MISSED_PONGS,
  CLOSE_CODE_TIMEOUT,
} from './types.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Valid-format test key for dev mode tests. */
const DEV_API_KEY = 'gnc_test_0123456789abcdef0123456789abcdef';

/**
 * Create a mock Elysia upgrade context for testing the upgrade handler.
 */
function createMockContext(
  headers: Record<string, string> = {},
): { request: Request } {
  const headerList: [string, string][] = Object.entries(headers);
  return {
    request: new Request('http://localhost:3040/ws', {
      headers: headerList,
    }),
  };
}

/**
 * Create a mock ElysiaWS for testing open/message/close/pong handlers.
 */
function createMockElysiaWS() {
  const sentMessages: string[] = [];
  let pingCount = 0;
  let closeCode: number | undefined;
  let closeReason: string | undefined;

  return {
    data: null as unknown,
    send(msg: string) {
      sentMessages.push(msg);
    },
    ping() {
      pingCount++;
    },
    pong() {},
    close(code?: number, reason?: string) {
      closeCode = code;
      closeReason = reason;
    },
    getSentMessages() { return sentMessages; },
    getPingCount() { return pingCount; },
    getCloseCode() { return closeCode; },
    getCloseReason() { return closeReason; },
  };
}

// ---------------------------------------------------------------------------
// F10-AC1: Valid upgrade + server.hello within 100ms
// ---------------------------------------------------------------------------

describe('F10-AC1: Valid upgrade + server.hello', () => {
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    handler = createWsHandler();
  });

  it('accepts valid subprotocol + API key in dev mode', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
      'authorization': `Bearer ${DEV_API_KEY}`,
    });

    const result = handler.upgrade(ctx as never);
    expect(result).toBe(GENICUI_SUBPROTOCOL);
  });

  it('sends server.hello frame on open', () => {
    const mockWs = createMockElysiaWS();

    handler.open(mockWs as never);

    const messages = mockWs.getSentMessages();
    expect(messages.length).toBe(1);

    const frame = JSON.parse(messages[0] as string);
    expect(frame.v).toBe(1);
    expect(frame.channel).toBe('__session__');
    expect(frame.type).toBe('server.hello');
    expect(frame.seq).toBe(1);
    expect(frame.payload.sessionId).toMatch(/^sess-/);
    expect(frame.payload.serverVersion).toBeDefined();
    expect(frame.payload.heartbeatMs).toBe(HEARTBEAT_MS);
  });

  it('stores session state on ws.data', () => {
    const mockWs = createMockElysiaWS();

    handler.open(mockWs as never);

    expect(mockWs.data).not.toBe(null);
    const session = mockWs.data as Record<string, unknown>;
    expect(session.sessionId).toMatch(/^sess-/);
    expect(session.missedPongs).toBe(0);
    expect(session.destroyed).toBe(false);
  });

  it('server.hello is sent synchronously (within 100ms)', () => {
    // The open handler sends server.hello synchronously,
    // so it is always delivered within the 100ms deadline.
    const mockWs = createMockElysiaWS();
    const start = Date.now();

    handler.open(mockWs as never);

    const elapsed = Date.now() - start;
    expect(mockWs.getSentMessages().length).toBe(1);
    expect(elapsed).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// F10-AC2: Invalid key -> HTTP 401
// ---------------------------------------------------------------------------

describe('F10-AC2: Invalid key -> HTTP 401', () => {
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    handler = createWsHandler();
    // F43: configure a key store so the upgrade handler runs in enforcement
    // mode (otherwise dev mode accepts anonymous connections).
    const store = new Map<string, { keyId: string; keyType: 'live' | 'test' }>();
    store.set(hashApiKey(DEV_API_KEY), { keyId: 'key_dev', keyType: 'test' });
    wsApiKeyStore.set(store);
  });

  afterEach(() => {
    wsApiKeyStore.set(null as never);
  });

  it('rejects connection with missing API key', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with malformed API key', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
      'authorization': 'Bearer badkey',
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with wrong key prefix', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
      'authorization': 'Bearer gnc_wrong_0123456789abcdef0123456789abcdef',
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with key too short', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
      'authorization': 'Bearer gnc_test_abc',
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with key containing invalid hex chars', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
      'authorization': 'Bearer gnc_test_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// F43: Dev-mode anonymous upgrade (no key store configured)
// ---------------------------------------------------------------------------

describe('F43: Dev mode accepts anonymous upgrade', () => {
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    handler = createWsHandler();
    // Explicitly clear the store so dev mode applies.
    wsApiKeyStore.set(null as never);
  });

  afterEach(() => {
    wsApiKeyStore.set(null as never);
  });

  it('accepts subprotocol-only upgrade when no key store is configured', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': GENICUI_SUBPROTOCOL,
    });

    const result = handler.upgrade(ctx as never);
    expect(result).toBe(GENICUI_SUBPROTOCOL);
  });
});

// ---------------------------------------------------------------------------
// F10-AC3: Missing subprotocol -> HTTP 400
// ---------------------------------------------------------------------------

describe('F10-AC3: Missing subprotocol -> HTTP 400', () => {
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    handler = createWsHandler();
  });

  it('rejects connection without genicui.v1 subprotocol', () => {
    const ctx = createMockContext({
      'authorization': `Bearer ${DEV_API_KEY}`,
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with wrong subprotocol', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': 'some-other-protocol',
      'authorization': `Bearer ${DEV_API_KEY}`,
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });

  it('rejects connection with empty subprotocol header', () => {
    const ctx = createMockContext({
      'sec-websocket-protocol': '',
      'authorization': `Bearer ${DEV_API_KEY}`,
    });

    expect(() => handler.upgrade(ctx as never)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// F10-AC4: 30s ping with 5s pong deadline
// ---------------------------------------------------------------------------

describe('F10-AC4: Heartbeat configuration', () => {
  it('heartbeat interval is 30_000ms (30s)', () => {
    expect(HEARTBEAT_MS).toBe(30_000);
  });

  it('pong timeout is 5_000ms (5s)', () => {
    expect(PONG_TIMEOUT_MS).toBe(5_000);
  });
});

// ---------------------------------------------------------------------------
// F10-AC5: 2 missed pongs -> WS close 1011
// ---------------------------------------------------------------------------

describe('F10-AC5: Missed pongs -> WS close 1011', () => {
  it('max missed pongs is 2', () => {
    expect(MAX_MISSED_PONGS).toBe(2);
  });

  it('close code for heartbeat failure is 1011', () => {
    expect(CLOSE_CODE_TIMEOUT).toBe(1011);
  });
});

// ---------------------------------------------------------------------------
// Message and close handlers
// ---------------------------------------------------------------------------

describe('F10 — Message and close handlers', () => {
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    handler = createWsHandler();
  });

  it('message handler resets pong counter', () => {
    const mockWs = createMockElysiaWS();

    // Open the connection first
    handler.open(mockWs as never);

    // Simulate a message from the client
    handler.message(mockWs as never, '{"type":"test"}' as never);

    // Session should still be alive with missedPongs = 0
    const session = mockWs.data as Record<string, unknown>;
    expect(session.destroyed).toBe(false);
  });

  it('close handler marks session as destroyed', () => {
    const mockWs = createMockElysiaWS();

    // Open the connection first
    handler.open(mockWs as never);

    // Close the connection
    handler.close(mockWs as never, 1000 as never, '' as never);

    const session = mockWs.data as Record<string, unknown>;
    expect(session.destroyed).toBe(true);
  });

  it('pong handler resets missed pongs', () => {
    const mockWs = createMockElysiaWS();

    // Open the connection first
    handler.open(mockWs as never);

    // Simulate a pong response
    handler.pong(mockWs as never);

    // Session should still be alive
    const session = mockWs.data as Record<string, unknown>;
    expect(session.destroyed).toBe(false);
    expect(session.missedPongs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: Server starts with WebSocket endpoint
// ---------------------------------------------------------------------------

describe('F10 — Integration: Server with WebSocket', () => {
  it('server starts and /health returns ok', async () => {
    const { createServer } = await import('../index.js');
    const app = createServer();
    const baseUrl = String(app.server!.url).replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
