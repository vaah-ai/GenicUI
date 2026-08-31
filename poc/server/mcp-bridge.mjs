// WebSocket bridge — speaks to the browser chat surface.
// Owns a long-lived WebSocket connection to one or more browsers, plus
// a pendingRequests map for correlating tool calls with browser
// confirmations. (For PoC we only need a single browser tab.)

import { WebSocketServer } from 'ws';

let idCounter = 0;

export class McpBridge extends EventTarget {
  /**
   * @param {object} opts
   * @param {import('./registry.mjs').ComponentRegistry} opts.registry
   * @param {import('./lifecycle.mjs').ComponentLifecycle} opts.lifecycle
   * @param {number} [opts.port=9876]
   */
  constructor({ registry, lifecycle, port = 9876 }) {
    super();
    this.registry = registry;
    this.lifecycle = lifecycle;
    this.port = port;
    /** @type {import('ws').WebSocket | null} */
    this.browser = null;
    /** @type {Map<string, {resolve, reject}>} */
    this.pendingComponents = new Map();
    this.wss = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port });
      this.wss.on('connection', ws => {
        console.log(`[bridge] browser connected (ws://localhost:${this.port})`);
        this.browser = ws;
        ws.on('message', (data) => this.handleBrowserMessage(data.toString()));
        ws.on('close', () => {
          console.log('[bridge] browser disconnected');
          if (this.browser === ws) this.browser = null;
          // Fail any pending render requests — their acks will never arrive
          // on this socket. Without this, render() sits for the full 5s
          // timeout and Claude treats it as a render failure.
          for (const [requestId, { reject }] of this.pendingComponents) {
            reject(new Error(`Browser disconnected before ${requestId} was acknowledged`));
          }
          this.pendingComponents.clear();
        });
        ws.on('error', err => console.error('[bridge] ws error', err));
        // Send hello once the server-side socket has finished upgrading.
// On the server side, `open` is fired once the handshake completes and
// readyState becomes OPEN (1). Until then, sends are silently dropped.
ws.send(JSON.stringify({
  type: 'hello',
  adaptors: this.registry.list().map(a => a.schema.name),
}));
      });
      this.wss.on('error', reject);
      // Resolve as soon as the server is listening, not when a client connects.
      this.wss.on('listening', () => {
        console.log(`[bridge] WebSocket listening on ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    this.wss?.close();
  }

  sendToBrowser(msg) {
    if (this.browser && this.browser.readyState === 1) {
      this.browser.send(JSON.stringify(msg));
    }
  }

  async handleBrowserMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'component_action') {
      // User clicked something — this gets forwarded to the agent.
      // Also used by the browser to ack a render() call on mount.
      const { requestId, componentId, action, payload } = msg;
      console.log(`[bridge] action from ${componentId}: ${action}`, payload);
      this.dispatchEvent(new CustomEvent('component_action', {
        detail: { componentId, action, payload },
      }));
      if (requestId && this.pendingComponents.has(requestId)) {
        this.pendingComponents.get(requestId).resolve({ acknowledged: true });
        this.pendingComponents.delete(requestId);
      }
    }
  }

  // Send a render command to the browser; resolve only after the browser
  // mounts the DOM and acknowledges (or rejects with the error).
  async render(componentId, componentName, props, layout = 'default') {
    const requestId = `r${++idCounter}`;
    const adaptor = this.registry.get(componentName);
    if (!adaptor) throw new Error(`Unknown component: ${componentName}`);
    const html = adaptor.component.html(props);
    this.sendToBrowser({
      type: 'render',
      requestId,
      componentId,
      componentName,
      html,
      layout,
    });
    // If no browser is connected, fail fast — don't sit on a 5s timeout
    // that the agent will interpret as a render failure.
    if (!this.browser || this.browser.readyState !== 1) {
      throw new Error('No browser connected to the GenicUI bridge. Open the chat surface and wait for "connected" before rendering.');
    }
    return this.awaitAck(requestId);
  }

  async update(componentId, props) {
    const instance = this.lifecycle.get(componentId);
    if (!instance) throw new Error(`Unknown component: ${componentId}`);
    // The browser doesn't need to re-render from scratch if the new props
    // are partial; we ship the merged props + HTML for simplicity.
    const html = instance.adaptor.component.html(instance.props);
    this.sendToBrowser({
      type: 'update',
      componentId,
      componentName: instance.componentName,
      html,
    });
    // No ack needed — update is fire-and-forget for the PoC.
    return { updated: true };
  }

  async unmount(componentId) {
    this.sendToBrowser({ type: 'unmount', componentId });
    return { unmounted: true };
  }

  async invoke(componentId, action, payload) {
    this.sendToBrowser({ type: 'invoke', componentId, action, payload });
    return { invoked: true };
  }

  awaitAck(requestId, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pendingComponents.delete(requestId);
        reject(new Error(`Browser did not acknowledge ${requestId} in ${timeoutMs}ms`));
      }, timeoutMs);
      this.pendingComponents.set(requestId, {
        resolve: (v) => { clearTimeout(t); resolve(v); },
        reject: (e) => { clearTimeout(t); reject(e); },
      });
    });
  }
}
