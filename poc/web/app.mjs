// Browser chat surface — single web page that:
//   1. Lets the user type prompts in a composer box
//   2. Sends them to the GenicUI chat backend (POST /chat/.../messages)
//   3. Listens to a per-session SSE stream (/chat/.../stream)
//   4. Renders Claude Code's text + tool calls inline
//   5. Keeps the existing WebSocket bridge (port 9876) for GenicUI
//      component renders — components mount inline within the chat
//      transcript.
//
// Architecture lifted from vaahagents-v2/frontend/app/composables/useChatStream.ts
// and simplified for vanilla JS.

const HTTP_HOST = location.hostname || 'localhost';
const CHAT_PORT = 9877; // matches start.sh / index.mjs GENICUI_HTTP_PORT
const WS_BRIDGE_URL = `ws://${HTTP_HOST}:9876`;
const CHAT_BASE = `http://${HTTP_HOST}:${CHAT_PORT}`;

// === DOM refs ============================================================
const messagesEl = document.getElementById('messages');
const statusEl = document.getElementById('status');
const composerEl = document.getElementById('composer');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');

// === WebSocket bridge (existing component rendering) =====================
// The GenicUI MCP server pushes render/update/unmount commands to this
// socket. We mount those components inline in the chat transcript —
// the component HTML lands in the most-recent assistant bubble, just
// after its trailing tool_call card.
const ws = new WebSocket(WS_BRIDGE_URL);
ws.onopen = () => updateStatus('🟢 bridge connected');
ws.onclose = () => updateStatus('🔴 bridge disconnected');
ws.onerror = () => updateStatus('🔴 bridge error');

/** Live registry of mounted GenicUI components, keyed by componentId. */
const mounted = new Map();
/**
 * Per-component local state. The bridge ships HTML, not state — so the
 * browser tracks the user's edits itself for the "Submit to Claude"
 * flow. Seeded from the initial render props via the adaptor's
 * `seedState()` and updated on every user action via `setState`.
 */
const localState = new Map();
/** Per-render pending acks. */
const pendingAcks = new Map();
/** The latest assistant bubble — components attach to the end of it. */
let currentAssistantBubble = null;

function updateStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// === Chat transcript =====================================================
let sessionId = null;
let eventSource = null;
let sending = false;

// One assistant message bubble at a time (multi-turn UX is one bubble
// per assistant response). The bubble has .text (rolling), .tool-calls
// (list), and .component-mounts (list). Streaming uses 50ms text
// batching (vaahagents-v2 pattern) to avoid render storms.
let assistantBubble = null;
let textBuffer = '';
let flushTimer = null;
// Typing indicator — shown from send-time until the first ai_text
// chunk arrives (or the turn settles via complete/error/stall). The
// "thinking…" gap between Send and the first streamed token is the
// longest in the chat, so without this the user has no feedback.
let typingIndicator = null;

const FLUSH_INTERVAL_MS = 50;
const STALL_TIMEOUT_MS = 15000;

// === Helpers =============================================================
function appendSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-system';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToEnd();
}

function appendUserBubble(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToEnd();
  return el;
}

function beginAssistantBubble() {
  assistantBubble = document.createElement('div');
  assistantBubble.className = 'msg msg-assistant';
  assistantBubble.innerHTML =
    '<div class="assistant-text"></div>' +
    '<div class="assistant-tools"></div>' +
    '<div class="assistant-mounts"></div>';
  messagesEl.appendChild(assistantBubble);
  currentAssistantBubble = assistantBubble;
  scrollToEnd();
  return assistantBubble;
}

function flushAssistantText() {
  if (!assistantBubble) return;
  const textEl = assistantBubble.querySelector('.assistant-text');
  if (!textEl) return;
  if (textBuffer) {
    textEl.textContent += textBuffer;
    textBuffer = '';
    scrollToEnd();
  }
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAssistantText();
  }, FLUSH_INTERVAL_MS);
}

function appendToolCallCard({ name, args, id }) {
  if (!assistantBubble) beginAssistantBubble();
  const toolsEl = assistantBubble.querySelector('.assistant-tools');
  const card = document.createElement('div');
  card.className = 'tool-call';
  const argsText = formatJson(args);
  card.innerHTML = `
    <div class="tool-call-header">
      <span class="tool-icon">⚙</span>
      <span class="tool-name"></span>
    </div>
    <pre class="tool-args"></pre>`;
  card.querySelector('.tool-name').textContent = name || 'tool_call';
  card.querySelector('.tool-args').textContent = argsText;
  toolsEl.appendChild(card);
  scrollToEnd();
}

function appendToolResultCard({ name, result, id }) {
  if (!assistantBubble) beginAssistantBubble();
  const toolsEl = assistantBubble.querySelector('.assistant-tools');
  const card = document.createElement('div');
  card.className = 'tool-result';
  card.innerHTML = `
    <div class="tool-result-header">
      <span class="tool-icon">↩</span>
      <span class="tool-name"></span>
    </div>
    <pre class="tool-result-body"></pre>`;
  card.querySelector('.tool-name').textContent =
    (name && name !== '') ? `${name} → result` : 'result';
  card.querySelector('.tool-result-body').textContent = truncate(formatJson(result), 2000);
  toolsEl.appendChild(card);
  scrollToEnd();
}

function appendAssistantError({ error }) {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  flushAssistantText();
  if (!assistantBubble) beginAssistantBubble();
  const textEl = assistantBubble.querySelector('.assistant-text');
  const errEl = document.createElement('div');
  errEl.className = 'assistant-error';
  errEl.textContent = `⚠ ${error}`;
  assistantBubble.appendChild(errEl);
  scrollToEnd();
}

function formatJson(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n… [${text.length - max} more chars]`;
}

function scrollToEnd() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Show a "thinking…" bubble with three pulsing dots. Idempotent —
// if one is already up, leave it. Always appended last so it sits
// right above the composer.
function showTypingIndicator() {
  if (typingIndicator) return;
  typingIndicator = document.createElement('div');
  typingIndicator.className = 'msg msg-assistant msg-typing';
  typingIndicator.innerHTML =
    '<span class="typing-dot"></span>' +
    '<span class="typing-dot"></span>' +
    '<span class="typing-dot"></span>' +
    '<span class="typing-label">Claude is thinking…</span>';
  messagesEl.appendChild(typingIndicator);
  scrollToEnd();
}

// Remove the typing indicator if it's currently visible. Safe to
// call when there's nothing to remove.
function hideTypingIndicator() {
  if (!typingIndicator) return;
  if (typingIndicator.parentNode) {
    typingIndicator.parentNode.removeChild(typingIndicator);
  }
  typingIndicator = null;
}

// === Component rendering (existing WebSocket bridge) ====================
ws.onmessage = (e) => {
  let msg;
  try { msg = JSON.parse(e.data); } catch { return; }
  switch (msg.type) {
    case 'hello':
      updateStatus(`🟢 bridge connected · ${msg.adaptors.length} components ready`);
      break;
    case 'render':
      renderComponent(msg);
      break;
    case 'update':
      updateComponent(msg);
      break;
    case 'unmount':
      unmountComponent(msg.componentId);
      break;
    case 'invoke':
      appendSystemMessage(`invoked ${msg.action} on ${msg.componentId}`);
      break;
  }
};

function renderComponent({ requestId, componentId, componentName, html, layout, props }) {
  // Replace any existing mount with the same id.
  unmountComponent(componentId);

  // Make sure there's an assistant bubble to attach to. If the bridge
  // pushes a render before any text has streamed (e.g. the agent
  // renders without preamble), we still need somewhere to mount.
  if (!assistantBubble || !currentAssistantBubble) beginAssistantBubble();

  const mountsEl = currentAssistantBubble.querySelector('.assistant-mounts');

  const wrapper = document.createElement('div');
  wrapper.className = 'component-mount';
  wrapper.dataset.componentId = componentId;
  wrapper.dataset.componentName = componentName;
  wrapper.innerHTML = html;

  const label = document.createElement('div');
  label.className = 'comp-label';
  label.textContent = componentName;
  wrapper.prepend(label);

  // Submit button — lives under the mount so it's clear which
  // component the user is submitting. Click → submitComponent().
  const submitBtn = document.createElement('button');
  submitBtn.className = 'comp-submit';
  submitBtn.type = 'button';
  submitBtn.dataset.act = 'submit';
  submitBtn.textContent = 'Submit to Claude';
  submitBtn.addEventListener('click', () => submitComponent(componentId));
  wrapper.appendChild(submitBtn);

  mountsEl.appendChild(wrapper);
  scrollToEnd();

  // Wire events for the rendered component.
  const el = wrapper.querySelector('.gu-comp');
  const adaptor = adaptors[componentName];
  // Seed local state for Submit-to-Claude summaries. The bridge
  // doesn't ship props on render(), so we fall back to parsing from
  // the HTML for the most common fields (label, value, initialValue)
  // and otherwise start from a sensible default.
  const seedProps = props || readPropsFromHtml(el, componentName);
  if (adaptor?.seedState) {
    localState.set(componentId, {
      componentName,
      state: adaptor.seedState(seedProps),
    });
  }
  if (adaptor && el) {
    const setState = (updater) => {
      const entry = localState.get(componentId);
      if (!entry || !updater) return;
      const next = updater(entry.state);
      if (next) entry.state = next;
    };
    adaptor.wire(el, seedProps, (actionMsg) => {
      emitAction(componentId, componentName, actionMsg);
    }, setState);
    mounted.set(componentId, { wrapper, adaptor, el, html });
  }

  ws.send(JSON.stringify({
    type: 'component_action',
    requestId,
    componentId,
    action: 'mounted',
    payload: {},
  }));
  if (requestId && pendingAcks.has(requestId)) {
    pendingAcks.get(requestId)();
    pendingAcks.delete(requestId);
  }
}

function updateComponent({ componentId, html, props }) {
  const m = mounted.get(componentId);
  if (!m) return;
  const label = m.wrapper.querySelector('.comp-label');
  m.wrapper.innerHTML = html;
  if (label) m.wrapper.prepend(label);
  // Re-attach the submit button (innerHTML blew it away).
  const submitBtn = document.createElement('button');
  submitBtn.className = 'comp-submit';
  submitBtn.type = 'button';
  submitBtn.dataset.act = 'submit';
  submitBtn.textContent = 'Submit to Claude';
  submitBtn.addEventListener('click', () => submitComponent(componentId));
  m.wrapper.appendChild(submitBtn);

  const el = m.wrapper.querySelector('.gu-comp');
  const componentName = m.wrapper.dataset.componentName;
  // Re-seed local state from the new props so Submit reflects what
  // the agent just rendered. (For the simple case the user then
  // mutates again from the new baseline.)
  const seedProps = props || readPropsFromHtml(el, componentName);
  const adaptor = adaptors[componentName];
  if (adaptor?.seedState) {
    localState.set(componentId, {
      componentName,
      state: adaptor.seedState(seedProps),
    });
  }
  if (m.adaptor && el) {
    const setState = (updater) => {
      const entry = localState.get(componentId);
      if (!entry || !updater) return;
      const next = updater(entry.state);
      if (next) entry.state = next;
    };
    m.adaptor.wire(el, seedProps, (actionMsg) => {
      emitAction(componentId, componentName, actionMsg);
    }, setState);
  }
}

// Best-effort fallback when the bridge doesn't ship props. Reads the
// most common fields from the rendered HTML so the local-state seed
// has something to work with.
function readPropsFromHtml(el, componentName) {
  const props = {};
  if (componentName === 'Counter') {
    const label = el.querySelector('.gu-counter-label')?.textContent?.replace(/:$/, '').trim();
    const value = parseInt(el.querySelector('.gu-counter-value')?.textContent || '0', 10);
    if (label) props.label = label;
    if (!Number.isNaN(value)) props.value = value;
  }
  return props;
}

async function submitComponent(componentId) {
  const entry = localState.get(componentId);
  if (!entry) return;
  const { componentName, state } = entry;
  const adaptor = adaptors[componentName];
  const summary = adaptor?.summarize ? adaptor.summarize(state) : JSON.stringify(state);
  const prompt =
    `[User submitted ${componentName} (${componentId})]\n` +
    summary +
    `\n\nYou can call get_component_state("${componentId}") for the authoritative state ` +
    `or update_component to push changes back.`;

  if (!sessionId) {
    appendSystemMessage('No active chat session — cannot submit.');
    return;
  }
  showTypingIndicator();
  try {
    const res = await fetch(
      `${CHAT_BASE}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prompt }),
      },
    );
    if (!res.ok) {
      appendSystemMessage(`Submit failed: ${res.status} ${await res.text()}`);
      hideTypingIndicator();
    }
    // SSE picks up the next turn automatically; the first ai_text
    // chunk (or complete/error/stall) clears the indicator.
  } catch (err) {
    appendSystemMessage(`Submit network error: ${err.message}`);
    hideTypingIndicator();
  }
}

function unmountComponent(componentId) {
  const m = mounted.get(componentId);
  if (m && m.wrapper.parentNode) m.wrapper.parentNode.removeChild(m.wrapper);
  mounted.delete(componentId);
}

function emitAction(componentId, componentName, { action, payload }) {
  ws.send(JSON.stringify({ type: 'component_action', componentId, componentName, action, payload }));
  appendSystemMessage(`[${componentName}] ${action} ${payload && Object.keys(payload).length ? JSON.stringify(payload) : ''}`);
}

// === SSE: stream chat events from the backend ============================
function openStream() {
  if (!sessionId) return;
  if (eventSource) eventSource.close();

  const url = `${CHAT_BASE}/chat/sessions/${sessionId}/stream`;
  eventSource = new EventSource(url);

  let stallTimer = null;
  let settled = false;

  function resetStallTimer() {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Stream stalled — flush whatever we have and force the assistant
      // bubble closed so the user can send the next message.
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushAssistantText();
      hideTypingIndicator();
      assistantBubble = null;
      sending = false;
      updateSendButton();
      updateStatus('⚠ stream stalled');
      eventSource?.close();
    }, STALL_TIMEOUT_MS);
  }

  function settle() {
    if (settled) return;
    settled = true;
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushAssistantText();
    hideTypingIndicator();
    assistantBubble = null;
    sending = false;
    updateSendButton();
  }

  // Initial connection sentinel.
  eventSource.addEventListener('ready', () => {
    resetStallTimer();
    updateStatus('🟢 chat connected');
  });

  eventSource.addEventListener('user_message', (e) => {
    resetStallTimer();
    const data = JSON.parse(e.data);
    appendUserBubble(data.data?.content ?? '');
  });

  eventSource.addEventListener('ai_text', (e) => {
    resetStallTimer();
    if (!assistantBubble) beginAssistantBubble();
    // First streamed chunk — the assistant bubble is taking over, so
    // the typing indicator should step aside. (If the agent renders
    // a component before any text lands, the tool_call handler will
    // hide it instead.)
    hideTypingIndicator();
    const data = JSON.parse(e.data);
    const text = (data.data?.text ?? '').replace(/\[system\/[^\]]*\]\s*/g, '');
    if (!text) return;
    textBuffer += text;
    scheduleFlush();
  });

  eventSource.addEventListener('tool_call', (e) => {
    resetStallTimer();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushAssistantText();
    // If the agent fires a tool before any text (e.g. render_component
    // with no preamble), the assistant bubble is now visible — hide
    // the typing indicator.
    hideTypingIndicator();
    const data = JSON.parse(e.data);
    appendToolCallCard(data.data ?? {});
  });

  eventSource.addEventListener('tool_result', (e) => {
    resetStallTimer();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushAssistantText();
    const data = JSON.parse(e.data);
    appendToolResultCard(data.data ?? {});
  });

  eventSource.addEventListener('error', (e) => {
    // EventSource fires `error` events for both transient hiccups
    // and post-complete close. Only show a user-visible message if
    // the SSE payload actually carries an `error` event — otherwise
    // it's a connection-level hiccup and the stall watchdog (or
    // EventSource's own reconnect) will handle it.
    if (settled) return;
    if (e.data) {
      try {
        const data = JSON.parse(e.data);
        appendAssistantError({ error: data.data?.error ?? 'Stream error' });
      } catch {}
    }
    resetStallTimer();
  });

  eventSource.addEventListener('status', () => { resetStallTimer(); });

  eventSource.addEventListener('stdout', () => { resetStallTimer(); });

  eventSource.addEventListener('complete', () => {
    settle();
    updateStatus('🟢 chat connected');
  });

  eventSource.addEventListener('cancelled', () => {
    settle();
    updateStatus('🟢 chat connected');
  });

  eventSource.onerror = () => {
    // EventSource auto-reconnects on transient errors; if we're still
    // "sending", the stall watchdog will rescue us after 15s.
    if (!settled) updateStatus('🟡 chat reconnecting…');
  };
}

// === Send / composer =====================================================
function updateSendButton() {
  sendBtn.disabled = sending || !promptEl.value.trim() || !sessionId;
}

async function sendPrompt() {
  const text = promptEl.value.trim();
  if (!text || sending || !sessionId) return;

  sending = true;
  updateSendButton();
  promptEl.value = '';
  autoResize();
  showTypingIndicator();

  try {
    const res = await fetch(
      `${CHAT_BASE}/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      },
    );
    if (!res.ok) {
      appendSystemMessage(`Failed to send: ${res.status} ${await res.text()}`);
      hideTypingIndicator();
      sending = false;
      updateSendButton();
    }
    // On 202 the SSE stream will pick up the response. When the
    // `complete` event lands, settle() flips sending back to false
    // and the typing indicator is removed.
  } catch (err) {
    appendSystemMessage(`Network error: ${err.message}`);
    hideTypingIndicator();
    sending = false;
    updateSendButton();
  }
}

function autoResize() {
  promptEl.style.height = 'auto';
  promptEl.style.height = Math.min(promptEl.scrollHeight, 160) + 'px';
}

// === Adaptors — browser-side only =======================================
// Each browser adaptor is a tiny module exposing `wire(el, props, onAction)`.
// The server-side `poc/adaptors/*` are NOT imported here — those carry
// Node-only BaseAdaptor machinery (registry, lifecycle, validateProps,
// getState) that the browser doesn't need.
import { adaptors } from './adaptors/index.mjs';

// === Init ================================================================
async function init() {
  // Create a chat session on the backend.
  try {
    const res = await fetch(`${CHAT_BASE}/chat/sessions`, { method: 'POST' });
    if (!res.ok) {
      appendSystemMessage(`Could not create chat session: ${res.status}`);
      return;
    }
    const { sessionId: id } = await res.json();
    sessionId = id;
    updateStatus('🟡 chat connecting…');
    openStream();
    appendSystemMessage(
      'Welcome. Type a prompt below to ask the agent to render a component. ' +
      'Try: "show me a counter labelled Clicks starting at 5".',
    );
  } catch (err) {
    appendSystemMessage(`Failed to reach chat backend at ${CHAT_BASE}: ${err.message}`);
  } finally {
    updateSendButton();
  }
}

promptEl.addEventListener('input', () => {
  autoResize();
  updateSendButton();
});
promptEl.addEventListener('keydown', (e) => {
  // Enter sends, Shift+Enter inserts a newline.
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});
composerEl.addEventListener('submit', (e) => {
  e.preventDefault();
  sendPrompt();
});

init();