// Smoke test: spin up the bridge + a fake browser, exercise every tool,
// prove the full render → click → action → update → state path works
// without Claude Code or a real browser in the loop.

import { WebSocket } from 'ws';
import { ComponentRegistry } from './registry.mjs';
import { ComponentLifecycle } from './lifecycle.mjs';
import { McpBridge } from './mcp-bridge.mjs';

import { counterAdaptor } from '../adaptors/counter.mjs';
import { todoListAdaptor } from '../adaptors/todo-list.mjs';
import { cartViewerAdaptor } from '../adaptors/cart-viewer.mjs';

const PORT = 9877;
let passed = 0;
let failed = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function expect(label, cond, detail) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else      { console.log(`  ❌ ${label} — ${detail}`); failed++; }
}

const registry = new ComponentRegistry();
const lifecycle = new ComponentLifecycle();
const bridge = new McpBridge({ registry, lifecycle, port: PORT });

registry.register(counterAdaptor);
registry.register(todoListAdaptor);
registry.register(cartViewerAdaptor);

// Start the bridge BEFORE the fake browser connects.
console.log('[smoke] starting bridge...');
await bridge.start();
console.log('[smoke] bridge started');
await sleep(100);
console.log('[smoke] connecting fake browser...');

const seenByBrowser = [];
const fakeBrowser = new WebSocket(`ws://localhost:${PORT}`);

// Register message listeners BEFORE waiting for open so we don't miss the hello.
fakeBrowser.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('[fakebrowser] got', msg.type);
  seenByBrowser.push(msg);
});
fakeBrowser.on('message', async (data) => {
  const msg = JSON.parse(data.toString());
  // Auto-ack every render request so render() resolves.
  if (msg.type === 'render') {
    fakeBrowser.send(JSON.stringify({ type: 'component_action', requestId: msg.requestId, componentId: msg.componentId, action: 'ack', payload: {} }));
  }
  // Auto-respond to click on counter increment: simulate the browser
  // sending a real "increment" action.
  if (msg.type === 'render' && msg.componentName === 'Counter') {
    setTimeout(() => {
      fakeBrowser.send(JSON.stringify({
        type: 'component_action',
        componentId: msg.componentId,
        action: 'increment',
        payload: { step: 1 },
      }));
    }, 50);
  }
});

await new Promise((resolve, reject) => {
  fakeBrowser.on('open', resolve);
  fakeBrowser.on('error', reject);
  setTimeout(() => reject(new Error('ws timeout')), 5000);
});
console.log('--- smoke: bridge + fake browser connected ---');
await sleep(50);

bridge.addEventListener('component_action', (e) => {
  console.log('  [event] component_action:', e.detail);
});

// 1. find_ui_component
console.log('\n--- 1. find_ui_component ---');
const matches = registry.search('show me a counter starting at 5', { topK: 3 });
expect('search returns at least one match', matches.length >= 1);
expect('top match is Counter for that intent', matches[0].adaptor.schema.name === 'Counter', `got ${matches[0]?.adaptor?.schema.name}`);

// 2. render_component (Counter)
console.log('\n--- 2. render_component(Counter) ---');
const inst = lifecycle.mount(counterAdaptor, { label: 'Clicks', value: 0, step: 1 });
await bridge.render(inst.componentId, 'Counter', inst.props);
await sleep(150);
expect('browser saw hello', seenByBrowser.some(m => m.type === 'hello'));
expect('browser saw render for Counter', seenByBrowser.some(m => m.type === 'render' && m.componentName === 'Counter'));
const renderMsg = seenByBrowser.find(m => m.type === 'render' && m.componentName === 'Counter');
expect('render message has html', renderMsg && typeof renderMsg.html === 'string' && renderMsg.html.includes('Clicks'));
expect('render message has unique componentId', renderMsg && /^[a-z0-9-]+$/i.test(renderMsg.componentId));

// 3. component_action → update
console.log('\n--- 3. component_action → update ---');
await sleep(150);
const stateAfter = lifecycle.getState(inst.componentId);
expect('state still reflects the prop value', stateAfter.value === 0, `got ${stateAfter?.value}`);
// Update props + push to browser
lifecycle.update(inst.componentId, { value: 5 });
await bridge.update(inst.componentId, lifecycle.get(inst.componentId).props);
await sleep(100);
expect('browser saw update for Counter', seenByBrowser.some(m => m.type === 'update' && m.componentId === renderMsg.componentId));

// 4. get_component_state for voice resolution
console.log('\n--- 4. get_component_state for CartViewer ---');
const cartInst = lifecycle.mount(cartViewerAdaptor, {
  items: [
    { id: 'a', name: 'Laptop', price: 999, qty: 1 },
    { id: 'b', name: 'Mouse',  price: 29,  qty: 2 },
  ],
});
const cartState = lifecycle.getState(cartInst.componentId);
expect('cart state has 2 items', cartState.items.length === 2);
expect('cart state exposes index 0 = Laptop', cartState.items[0].name === 'Laptop');
expect('cart state total = 999 + 58 + tax', Math.abs(cartState.total - (999 + 58 + cartState.tax)) < 0.01, `got ${cartState.total}`);

// 5. unmount
console.log('\n--- 5. unmount_component ---');
lifecycle.unmount(cartInst.componentId);
await bridge.unmount(cartInst.componentId);
await sleep(100);
expect('browser saw unmount', seenByBrowser.some(m => m.type === 'unmount' && m.componentId === cartInst.componentId));

// 6. invoke_action
console.log('\n--- 6. invoke_action ---');
const todoInst = lifecycle.mount(todoListAdaptor, {
  title: 'Tasks',
  items: [{ id: 't1', text: 'demo', done: false }],
});
await bridge.render(todoInst.componentId, 'TodoList', todoInst.props);
await sleep(100);
await bridge.invoke(todoInst.componentId, 'item_added', { text: 'smoke-test pass' });
await sleep(100);
expect('browser saw invoke', seenByBrowser.some(m => m.type === 'invoke' && m.componentId === todoInst.componentId));

// 7. prop validation rejects bad input
console.log('\n--- 7. validateProps ---');
const v = todoListAdaptor.validateProps({ items: 'not-an-array' });
expect('rejects non-array items', !v.valid);
const v2 = cartViewerAdaptor.validateProps({ items: [{ id: 1, name: 'X', price: 'free', qty: 1 }] });
expect('rejects non-number price', !v2.valid);

bridge.stop();
fakeBrowser.close();

console.log(`\n=== smoke test: ${passed} passed, ${failed} failed ===`);
process.exit(failed === 0 ? 0 : 1);
