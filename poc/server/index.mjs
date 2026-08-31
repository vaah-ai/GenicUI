// MCP server entry point. Speaks JSON-RPC over stdio to Claude Code.
// Bridges each tool call to the browser via McpBridge.
//
// CRITICAL: stdout is the MCP transport. ALL logging goes to stderr.
// Any non-JSON bytes on stdout break the handshake.

console.log = (...args) => process.stderr.write(args.join(' ') + '\n');

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { ComponentRegistry } from './registry.mjs';
import { ComponentLifecycle } from './lifecycle.mjs';
import { McpBridge } from './mcp-bridge.mjs';
import {
  createSession,
  sessionExists,
  appendMessage,
  sseEventGenerator,
} from './chat-handler.mjs';

import { counterAdaptor } from '../adaptors/counter.mjs';
import { todoListAdaptor } from '../adaptors/todo-list.mjs';
import { cartViewerAdaptor } from '../adaptors/cart-viewer.mjs';

const PORT = Number(process.env.GENICUI_BRIDGE_PORT || 9876);
const HTTP_PORT = Number(process.env.GENICUI_HTTP_PORT || 9877);
const TRANSPORT = (process.env.GENICUI_TRANSPORT || 'stdio').toLowerCase();
// 'stdio'  → single-shot stdio MCP transport (Claude Code spawns us per session)
// 'http'  → long-running HTTP server with stateless /mcp endpoint, paired
//           with the WebSocket bridge so .mcp.json can use `mcp-remote`
//           (llmkb-style). No stdio in this mode.

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
const VERSION = packageJson.version;

const registry = new ComponentRegistry();
const lifecycle = new ComponentLifecycle();
const bridge = new McpBridge({ registry, lifecycle, port: PORT });

registry.register(counterAdaptor);
registry.register(todoListAdaptor);
registry.register(cartViewerAdaptor);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Build the system-prompt block for the agent.
function buildAgentPrompt() {
  const list = registry.list().map(a =>
    `  - ${a.schema.name}: ${a.schema.description}\n` +
    `    Use when: ${a.schema.whenToUse.slice(0, 4).join('; ')}\n` +
    `    Actions: ${a.schema.actions.map(x => x.name).join(', ')}`
  ).join('\n');
  return `You can render UI components inside the conversation using the GenicUI tools. Always call find_ui_component first (or know the exact name) before rendering. Read each component's actions list to know what events to expect. When the user clicks, you'll get the action in the next turn — react conversationally and call update_component to refresh.\n\nAvailable components:\n${list}`;
}

function propsHint(adaptor) {
  const out = {};
  for (const d of adaptor.schema.propDescriptors || []) {
    out[d.name] = d.required
      ? `<${d.type}${d.itemShape ? '<' + Object.keys(d.itemShape).join(',') + '>' : ''}, required>`
      : `<${d.type}, optional>`;
  }
  return out;
}

// Wrap tool handlers in a small helper that adds consistent logging
// and error envelopes. Each handler returns the same MCP call result
// shape: { content: [{ type: 'text', text }] }.
function makeServer() {
  const server = new McpServer({
    name: 'genicui-poc',
    version: VERSION,
  }, {
    instructions: buildAgentPrompt(),
  });

  server.tool('find_ui_component',
    'Search GenicUI\'s component registry. Provide a natural-language ' +
    'intent; get back the best-matching component plus its props schema ' +
    'and action list.',
    {
      intent: z.string().describe('What the user wants to show. e.g. "cart with items and total"'),
    },
    async ({ intent }) => {
      const matches = registry.search(intent, { topK: 3 });
      if (!matches.length) return { content: [{ type: 'text', text: 'No matching component found.' }] };
      const [top, ...rest] = matches;
      const lines = [
        `Best match: ${top.adaptor.schema.name} (score ${top.score.toFixed(2)})`,
        top.adaptor.schema.description,
        `Props:`,
        '```json',
        JSON.stringify({ [top.adaptor.schema.name]: propsHint(top.adaptor) }, null, 2),
        '```',
        `Actions: ${top.adaptor.schema.actions.map(a => a.name).join(', ')}`,
      ];
      if (rest.length) {
        lines.push('', 'Alternatives:');
        for (const r of rest) lines.push(`  - ${r.adaptor.schema.name} (score ${r.score.toFixed(2)})`);
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  server.tool('render_component',
    'Render a GenicUI component in the user\'s chat surface. ' +
    'Returns a componentId for later update / unmount / state queries.',
    {
      componentName: z.string().describe('e.g. Counter, TodoList, CartViewer'),
      props: z.object({}).passthrough().describe('Props matching the component schema'),
      layout: z.enum(['default', 'compact']).optional().describe('Layout hint'),
    },
    async ({ componentName, props, layout }) => {
      const adaptor = registry.get(componentName);
      if (!adaptor) return { content: [{ type: 'text', text: `Unknown component: ${componentName}` }], isError: true };
      const v = adaptor.validateProps(props);
      if (!v.valid) return { content: [{ type: 'text', text: `Invalid props:\n - ${v.errors.join('\n - ')}` }], isError: true };
      const instance = lifecycle.mount(adaptor, props);
      try {
        await bridge.render(instance.componentId, instance.componentName, instance.props, layout);
      } catch (err) {
        return { content: [{ type: 'text', text: `Render failed (browser not connected?): ${err.message}` }], isError: true };
      }
      return { content: [{
        type: 'text',
        text: `Rendered ${componentName}. componentId=${instance.componentId}. ` +
              `Use update_component to change props, unmount_component to remove it, ` +
              `or get_component_state to read its current state for voice-style resolutions.`,
      }] };
    },
  );

  server.tool('update_component',
    'Update props of an already-rendered component (shallow merge with existing props).',
    {
      componentId: z.string(),
      props: z.object({}).passthrough(),
    },
    async ({ componentId, props }) => {
      const inst = lifecycle.get(componentId);
      if (!inst) return { content: [{ type: 'text', text: `Unknown componentId: ${componentId}` }], isError: true };
      const merged = { ...inst.props, ...props };
      const v = inst.adaptor.validateProps(merged);
      if (!v.valid) return { content: [{ type: 'text', text: `Invalid merged props:\n - ${v.errors.join('\n - ')}` }], isError: true };
      lifecycle.update(componentId, props);
      const updated = lifecycle.get(componentId);
      try {
        await bridge.update(componentId, updated.props);
      } catch (err) {
        return { content: [{ type: 'text', text: `Update failed: ${err.message}` }], isError: true };
      }
      return { content: [{ type: 'text', text: `Updated ${componentId}.` }] };
    },
  );

  server.tool('unmount_component',
    'Remove a component from the chat surface.',
    { componentId: z.string() },
    async ({ componentId }) => {
      const inst = lifecycle.unmount(componentId);
      if (!inst) return { content: [{ type: 'text', text: `Unknown componentId: ${componentId}` }], isError: true };
      try { await bridge.unmount(componentId); } catch {}
      return { content: [{ type: 'text', text: `Unmounted ${componentId}.` }] };
    },
  );

  server.tool('get_component_state',
    'Read the current structured state of a mounted component. ' +
    'Use for voice-style resolutions — e.g. "remove the first item" — ' +
    'because the agent needs to resolve "first" to a specific index/id ' +
    'before acting on it.',
    { componentId: z.string() },
    async ({ componentId }) => {
      const state = lifecycle.getState(componentId);
      if (state === null) return { content: [{ type: 'text', text: `Unknown or unmounted componentId: ${componentId}` }], isError: true };
      return { content: [{ type: 'text', text: '```json\n' + JSON.stringify(state, null, 2) + '\n```' }] };
    },
  );

  server.tool('invoke_action',
    'Programmatically trigger a component action from the agent ' +
    '(e.g. select a row in a DataTable).',
    {
      componentId: z.string(),
      action: z.string(),
      payload: z.object({}).passthrough().optional(),
    },
    async ({ componentId, action, payload }) => {
      try { await bridge.invoke(componentId, action, payload || {}); } catch {}
      return { content: [{ type: 'text', text: `Invoked ${action} on ${componentId}.` }] };
    },
  );

  return server;
}

async function main() {
  await bridge.start();
  console.log(`[mcp] bridge ws://localhost:${PORT}`);

  const server = makeServer();

  if (TRANSPORT === 'http') {
    // Stateless HTTP server (sessionIdGenerator: undefined). The SDK
    // *requires* a fresh transport per request in stateless mode —
    // reusing one across requests throws "Stateless transport cannot
    // be reused across requests" and surfaces as 500. We also build a
    // fresh McpServer per request (mirroring the SDK's
    // simpleStatelessStreamableHttp example) so request-scoped state
    // (message IDs, transports) is clean. The shared singletons
    // (`registry`, `lifecycle`, `bridge`) persist across requests.
    const httpServer = http.createServer(async (req, res) => {
      // Mount the chat surface (POST /chat/*, GET /chat/*/stream)
      // alongside the MCP endpoint. Anything under /chat/* is
      // answered here and never reaches the /mcp handler below.
      if (req.url?.startsWith('/chat/')) {
        return handleChatRequest(req, res);
      }

      // Only POST is supported for stateless /mcp.
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' }).end(JSON.stringify({
          jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null,
        }));
        return;
      }
      const requestServer = makeServer();
      const requestTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      try {
        await requestServer.connect(requestTransport);
        // Collect body (streamable HTTP wants the parsed body).
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const parsedBody = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
        await requestTransport.handleRequest(req, res, parsedBody);
        res.on('close', () => {
          requestTransport.close().catch(() => {});
          requestServer.close().catch(() => {});
        });
      } catch (err) {
        console.error('[mcp] request error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({
            jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null,
          }));
        }
      }
    });
    httpServer.listen(HTTP_PORT, () => {
      console.log(`[mcp] HTTP listening on http://localhost:${HTTP_PORT}/mcp  (stateless, per-request server)`);
      console.log(`[chat] HTTP listening on http://localhost:${HTTP_PORT}/chat/sessions  (browser-driven Claude turns)`);
    });
    return;
  }

  // Default: stdio (single-shot, per-session).
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('[mcp] connected to Claude Code via stdio');
}

main().catch(err => {
  console.error('[mcp] fatal', err);
  process.exit(1);
});

// Silence browser action events from showing as unhandled errors.
// (They get pushed into the queue, but we don't expose that here.)
bridge.addEventListener('component_action', (e) => {
  console.log('[event] component_action:', JSON.stringify(e.detail));
});

// ── Chat surface HTTP routes ─────────────────────────────────────────
// Three endpoints let the browser drive Claude Code per turn:
//
//   POST /chat/sessions                  → { sessionId }
//   POST /chat/sessions/:id/messages     → { ok: true }
//   GET  /chat/sessions/:id/stream       → SSE event stream
//
// Each POST /messages spawns
//   claude --print --output-format stream-json --mcp-config <path>
//           --resume <sid> -- <prompt>
// as a child process; stdout lines are parsed into typed events and
// pushed through the broadcaster for SSE delivery. The GenicUI MCP
// server stays the same — Claude Code discovers it via --mcp-config
// just like it does in the existing terminal flow.
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function handleChatRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // The chat surface runs on :8080 (static) and the backend on :9877,
  // so every chat request is cross-origin. Browsers block fetch() with
  // JSON bodies unless we echo ACAO back. EventSource ignores CORS,
  // but the preflight on POST /messages still needs the headers.
  // PoC scope: allow any localhost origin. Don't expose this beyond dev.
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };

  // Short-circuit CORS preflight.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders).end();
    return;
  }

  // POST /chat/sessions
  if (req.method === 'POST' && path === '/chat/sessions') {
    const sessionId = createSession();
    res.writeHead(201, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ sessionId }));
    return;
  }

  // POST /chat/sessions/:id/messages
  const msgMatch = path.match(/^\/chat\/sessions\/([^/]+)\/messages$/);
  if (req.method === 'POST' && msgMatch) {
    const sessionId = msgMatch[1];
    if (!sessionExists(sessionId)) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: `Unknown session ${sessionId}` }));
      return;
    }
    const body = await readJsonBody(req);
    const content = (body.content ?? '').toString().trim();
    if (!content) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'content is required' }));
      return;
    }
    try {
      appendMessage(sessionId, content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    res.writeHead(202, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /chat/sessions/:id/stream  (SSE)
  const streamMatch = path.match(/^\/chat\/sessions\/([^/]+)\/stream$/);
  if (req.method === 'GET' && streamMatch) {
    const sessionId = streamMatch[1];
    if (!sessionExists(sessionId)) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: `No queue for session ${sessionId}` }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders,
    });
    res.flushHeaders?.();
    try {
      for await (const chunk of sseEventGenerator(sessionId)) {
        res.write(chunk);
      }
    } catch (err) {
      console.error('[chat] stream error:', err.message);
    } finally {
      res.end();
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify({ error: 'Not found' }));
}

export { registry, lifecycle, bridge };
export { broadcaster as chatBroadcaster } from './chat-broadcaster.mjs';
