/**
 * Chat session registry — per-session bookkeeping for the chat
 * backend. Each session tracks its Claude Code session id (so we can
 * `--resume <id>` on subsequent turns) and the active subprocess
 * (so we can cancel it if the WebSocket drops).
 *
 * Mirrors `poc/server/chat-broadcaster.mjs` but in TypeScript and
 * without the EventEmitter: the chat handler publishes events
 * directly via `WsSession.elysiaWs.send()` (the WebSocket IS the
 * transport), so all this registry needs to do is hold small amounts
 * of mutable state per session.
 *
 * @module @genicui/server/chat/chat-session-registry
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 *
 * Lifecycle:
 *   create(sessionId)         — call BEFORE the first spawn (idempotent)
 *   rememberClaudeSession(sid, cid)
 *   getClaudeSession(sid)     — used by `runChatTurn` to fill --resume
 *   setActiveSubprocess(sid, proc)
 *   getActiveSubprocess(sid)  — used by close/disconnect handlers to cancel
 *   delete(sid)               — full cleanup on WS close
 */

import type { Subprocess } from 'bun';

interface SessionEntry {
  /** Claude Code session id from the first `system/init` envelope —
   *  used as `--resume` for the next turn so the CLI keeps state. */
  claudeSessionId: string | null;

  /** Active Bun subprocess for the current turn, or null when idle. */
  activeSubprocess: Subprocess | null;
}

const SESSIONS = new Map<string, SessionEntry>();

export function createChatSession(sessionId: string): void {
  if (!SESSIONS.has(sessionId)) {
    SESSIONS.set(sessionId, { claudeSessionId: null, activeSubprocess: null });
  }
}

export function hasChatSession(sessionId: string): boolean {
  return SESSIONS.has(sessionId);
}

export function rememberClaudeSession(sessionId: string, claudeSessionId: string): void {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  entry.claudeSessionId = claudeSessionId;
}

export function getClaudeSession(sessionId: string): string | null {
  return SESSIONS.get(sessionId)?.claudeSessionId ?? null;
}

export function setActiveSubprocess(sessionId: string, proc: Subprocess | null): void {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  entry.activeSubprocess = proc;
}

export function getActiveSubprocess(sessionId: string): Subprocess | null {
  return SESSIONS.get(sessionId)?.activeSubprocess ?? null;
}

/**
 * Cancel the active subprocess (if any) and clear the session entry.
 * Used when the WebSocket disconnects mid-turn.
 */
export function cancelChatSession(sessionId: string): void {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  if (entry.activeSubprocess) {
    try {
      entry.activeSubprocess.kill();
    } catch {
      // Already exited — ignore.
    }
    entry.activeSubprocess = null;
  }
  SESSIONS.delete(sessionId);
}

/**
 * Test-only: wipe all sessions. Used by test teardown.
 */
export function __resetChatSessions(): void {
  for (const entry of SESSIONS.values()) {
    if (entry.activeSubprocess) {
      try {
        entry.activeSubprocess.kill();
      } catch {
        // ignore
      }
    }
  }
  SESSIONS.clear();
}
