// Long-lived stand-in for the browser chat surface. Used when running
// Claude Code non-interactively (--print). It auto-acks renders so tool
// calls return successfully. Reconnects if the bridge restarts.

import { WebSocket } from 'ws';

const PORT = Number(process.env.GENICUI_BRIDGE_PORT || 9876);
const URL = `ws://localhost:${PORT}`;
let ws;
let backoff = 250;

function log(...args) { process.stderr.write('[fakebrowser] ' + args.join(' ') + '\n'); }

function connect() {
  log(`dialing ${URL}`);
  ws = new WebSocket(URL);
  ws.on('open', () => {
    log('connected');
    backoff = 250;
  });
  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (msg.type === 'hello') {
      log(`hello: ${msg.components?.length ?? 0} components`);
      return;
    }
    log(`got ${msg.type} (${msg.componentName ?? msg.componentId})`);
    // Auto-ack renders so render_component() in the MCP server resolves.
    if (msg.type === 'render' && msg.requestId) {
      ws.send(JSON.stringify({
        type: 'component_action',
        requestId: msg.requestId,
        componentId: msg.componentId,
        action: 'ack',
        payload: {},
      }));
      log(`acked render ${msg.componentId}`);
    }
  });
  ws.on('close', () => {
    log('disconnected, retrying in ' + backoff + 'ms');
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 5000);
  });
  ws.on('error', (e) => log('error:', e.message));
}

connect();

// Stay alive.
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
