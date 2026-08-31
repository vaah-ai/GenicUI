// HTTP-level smoke test for the chat routes. Spawns the MCP server
// in-process on a random port, then exercises the three chat
// endpoints via fetch. We never POST a real prompt — the SSE stream
// is fed synthetic events by pushing directly to the broadcaster.
//
// Run with:
//   node poc/server/chat-smoke-test.mjs

import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { broadcaster } from './chat-broadcaster.mjs';

let passed = 0;
let failed = 0;
function expect(label, cond, detail) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// Start the MCP server on a fixed test port. We pick 19877 because
// it's unlikely to be in use and lets the smoke test be reproducible.
const TEST_PORT = 19877;
const TEST_WS_PORT = 19876;
process.env.GENICUI_TRANSPORT = 'http';
process.env.GENICUI_HTTP_PORT = String(TEST_PORT);
process.env.GENICUI_BRIDGE_PORT = String(TEST_WS_PORT);

// Import the server entry AFTER setting env. It will start listening
// on its assigned port — we capture it from the log via console.log
// interception. (See start.sh's pattern.)
const realLog = console.log;
const listenRe = /HTTP listening on http:\/\/localhost:(\d+)/;
let port = null;
console.log = (...args) => {
  realLog(...args);
  const msg = args.join(' ');
  const m = listenRe.exec(msg);
  if (m && !port) port = Number(m[1]);
};

// Free the test ports if a previous run is still around.
for (const port of [TEST_PORT, TEST_WS_PORT]) {
  try { await fetch(`http://localhost:${port}/__poke__`); } catch {}
  try {
    const { execSync } = await import('node:child_process');
    execSync(`lsof -ti :${port} | xargs -r kill -9 2>/dev/null || true`, { stdio: 'ignore' });
  } catch {}
}

// Lazy import — registers the listen() side effect.
await import('./index.mjs');

port = TEST_PORT;
console.log(`\n[smoke] chat server listening on :${port}\n`);

// === Test 1: POST /chat/sessions returns a session id =====================
const sessionRes = await fetch(`http://localhost:${port}/chat/sessions`, { method: 'POST' });
expect('POST /chat/sessions → 201', sessionRes.status === 201);
const { sessionId } = await sessionRes.json();
expect('POST /chat/sessions → sessionId', !!sessionId);

// === Test 2: GET /chat/sessions/:id/stream subscribes before push ========
// Open SSE and accumulate events. Then push synthetic events into the
// broadcaster directly and verify they arrive at the browser-side.
// We can't actually spawn `claude` in this test (no auth/no PATH), so
// we hand-inject events.

const sseEvents = [];
const sseRes = await fetch(`http://localhost:${port}/chat/sessions/${sessionId}/stream`);
expect('GET /chat/sessions/:id/stream → 200 text/event-stream',
  sseRes.status === 200 && /text\/event-stream/.test(sseRes.headers.get('content-type') ?? ''));

// Read the first chunk (should include the 'ready' event and our
// synthetic push once we send it).
const reader = sseRes.body.getReader();
const decoder = new TextDecoder();

// Trigger a user_message event a tick after subscribing so the SSE
// generator has time to emit its `ready` event first.
await sleep(50);
broadcaster.push(sessionId, { type: 'user_message', data: { content: 'hello' } });
await sleep(50);
broadcaster.push(sessionId, { type: 'ai_text', data: { text: 'world' } });
await sleep(50);
broadcaster.close(sessionId, 'complete');

let buf = '';
const deadline = Date.now() + 2000;
while (Date.now() < deadline) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  if (buf.includes('event: complete')) break;
}
// Do NOT cancel the reader here — test 2b continues using the same
// SSE connection to verify that push() after close() still reaches
// subscribers (the multi-turn regression). The reader stays alive
// across the boundary; we cancel it at the end of test 2b.

// Parse the SSE-formatted buffer into events.
const matches = buf.matchAll(/^event: (\w+)\ndata: (.+)$/gm);
for (const m of matches) {
  sseEvents.push({ event: m[1], data: JSON.parse(m[2]) });
}

expect('SSE emitted ready event', sseEvents.some(e => e.event === 'ready'));
expect('SSE emitted user_message event',
  sseEvents.some(e => e.event === 'user_message' && e.data.data?.content === 'hello'));
expect('SSE emitted ai_text event',
  sseEvents.some(e => e.event === 'ai_text' && e.data.data?.text === 'world'));
expect('SSE emitted terminal complete event',
  sseEvents.some(e => e.event === 'complete'));

// === Test 2b: REGRESSION — push after close() still reaches subscribers ===
// In the multi-turn chat model, a session emits a `complete` event when
// a turn ends, then a NEW turn starts and pushes more events. The old
// implementation locked the session on close() (set `closed = true`)
// which made subsequent push() calls no-op, so the second turn never
// reached the browser. We keep the SAME SSE connection open (the
// generator now loops forever instead of unwinding on `complete`) and
// push a fresh turn's events; they must arrive on the open stream.
broadcaster.push(sessionId, { type: 'user_message', data: { content: 'second-turn' } });
await sleep(50);
broadcaster.push(sessionId, { type: 'ai_text', data: { text: 'second-reply' } });

// Read until we see the second reply, or hit the deadline.
let buf2 = '';
const deadline2 = Date.now() + 2000;
while (Date.now() < deadline2) {
  const { value, done } = await reader.read();
  if (done) break;
  buf2 += decoder.decode(value, { stream: true });
  if (buf2.includes('second-reply')) break;
}
// Cancel cleanly to break the persistent SSE generator's loop.
try { await reader.cancel(); } catch {}

for (const m of buf2.matchAll(/^event: (\w+)\ndata: (.+)$/gm)) {
  sseEvents.push({ event: m[1], data: JSON.parse(m[2]) });
}
expect('SECOND-TURN: user_message after close() reaches SSE',
  sseEvents.some(e => e.event === 'user_message' && e.data.data?.content === 'second-turn'));
expect('SECOND-TURN: ai_text after close() reaches SSE',
  sseEvents.some(e => e.event === 'ai_text' && e.data.data?.text === 'second-reply'));

// === Test 3: POST /chat/sessions/:id/messages for unknown session ========
const badRes = await fetch(`http://localhost:${port}/chat/sessions/no-such/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'x' }),
});
expect('POST /chat/sessions/:bogus/messages → 404', badRes.status === 404);

// === Test 4: POST /chat/sessions/:id/messages without content ============
const noContentRes = await fetch(`http://localhost:${port}/chat/sessions/${sessionId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
expect('POST /chat/sessions/:id/messages without content → 400', noContentRes.status === 400);

// === Test 5: GET /chat/sessions/:bogus/stream → 400 ======================
const badStreamRes = await fetch(`http://localhost:${port}/chat/sessions/no-such/stream`);
expect('GET /chat/sessions/:bogus/stream → 400', badStreamRes.status === 400);

// === Test 6: GET /mcp still rejects non-POST (regression) ================
const mcpGet = await fetch(`http://localhost:${port}/mcp`);
expect('GET /mcp → 405 (existing behavior preserved)', mcpGet.status === 405);

// === Done ================================================================
console.log(`\n=== chat smoke: ${passed} passed, ${failed} failed ===`);
process.exit(failed === 0 ? 0 : 1);