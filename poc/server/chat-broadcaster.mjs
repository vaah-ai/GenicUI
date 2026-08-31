// Chat broadcaster — per-session event queue for the chat backend.
// Mirrors the shape of vaahagents-v2's `services/sse_broadcaster.py`
// but in plain Node (no asyncio). One ChatBroadcaster instance per
// GenicUI server process; one queue per chat session.
//
// Lifecycle:
//   create(sessionId) — call BEFORE spawning the claude subprocess
//                       (race vs an SSE client connecting).
//   push(sessionId, event) — called by the parser as stdout lines arrive.
//   subscribe(sessionId, handler) — registers a handler that receives
//                       every event; returns an unsubscribe fn.
//   close(sessionId) — drops the queue + emits a synthetic 'complete'
//                      so the SSE generator can wind down.
//
// Each session also has a 'claudeSessionId' set after the first message —
// the resume id we pass to subsequent `claude --resume` calls so the
// browser keeps a single conversation across turns.

import { EventEmitter } from 'node:events';

const TERMINAL_EVENTS = new Set(['complete', 'cancelled', 'error']);

export class ChatBroadcaster extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, {events: Array<object>, closed: boolean}>} */
    this._sessions = new Map();
    /** @type {Map<string, string>} sessionId -> claude sessionId from first reply */
    this._claudeSessions = new Map();
    /** @type {Map<string, NodeJS.Timeout>} pending 30s cleanup timers */
    this._cleanupTimers = new Map();
  }

  /**
   * Create a fresh session. Idempotent — returns the existing entry if
   * the session already exists (lets the POST /messages handler be
   * retried without leaking queues).
   */
  create(sessionId) {
    if (!this._sessions.has(sessionId)) {
      this._sessions.set(sessionId, { events: [], closed: false });
    }
    return this._sessions.get(sessionId);
  }

  has(sessionId) {
    return this._sessions.has(sessionId);
  }

  /**
   * Subscribe to a session's events. Returns an unsubscribe fn.
   * The handler receives every event pushed via push() until close().
   */
  subscribe(sessionId, handler) {
    const session = this._sessions.get(sessionId);
    if (!session) {
      throw new Error(`No queue for session ${sessionId}`);
    }
    const listener = (event) => handler(event);
    this.on(sessionId, listener);
    return () => this.off(sessionId, listener);
  }

  /**
   * Push a single typed event to a session. Triggers all subscribers.
   * If the session has been closed, push is a no-op (defensive — the
   * subprocess shouldn't outlive close(), but parser output may lag).
   */
  push(sessionId, event) {
    const session = this._sessions.get(sessionId);
    if (!session) return;
    if (session.closed) return;
    this.emit(sessionId, event);
  }

  /**
   * Mark a session closed + emit a synthetic terminal event so SSE
   * generators can wind down. Safe to call multiple times.
   *
   * Note: in the multi-turn chat model the session is kept "open"
   * across turns — only the terminal *event* is emitted to signal
   * "this turn is done". The session stays push()-able for the next
   * turn until 30s of inactivity, after which the entry is deleted
   * to reclaim memory.
   */
  close(sessionId, reason = 'complete') {
    const session = this._sessions.get(sessionId);
    if (!session) return;
    if (session.closed) return;
    // Don't actually lock the session — emit the terminal event but
    // leave the session entry alive for the next turn.
    const terminal = { type: reason, reason };
    this.emit(sessionId, terminal);
    // Schedule deletion after 30s of inactivity. If a new push()
    // arrives before then (next turn), it implicitly resets this
    // inactivity timer — but for simplicity we just don't schedule
    // a new one. The 30s window is a backstop, not a precise timer.
    if (!this._cleanupTimers.has(sessionId)) {
      const t = setTimeout(() => {
        if (this._sessions.has(sessionId)) {
          this._sessions.delete(sessionId);
          this._cleanupTimers.delete(sessionId);
        }
      }, 30_000);
      t.unref?.();
      this._cleanupTimers.set(sessionId, t);
    }
  }

  rememberClaudeSession(sessionId, claudeSessionId) {
    if (claudeSessionId) this._claudeSessions.set(sessionId, claudeSessionId);
  }

  getClaudeSession(sessionId) {
    return this._claudeSessions.get(sessionId);
  }

  isTerminal(event) {
    return TERMINAL_EVENTS.has(event?.type);
  }
}

export const broadcaster = new ChatBroadcaster();