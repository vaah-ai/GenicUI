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
 *   killActiveSubprocess(sid) — F43: abort current turn to resume with a
 *                                synthesized follow-up prompt
 *   setChatResumeContext(sid) — F43: snapshot provider/prompt for resume
 *   getChatResumeContext(sid) — F43: read the latest snapshot
 *   delete(sid)               — full cleanup on WS close
 */

import type { Subprocess } from 'bun';

/**
 * Provider wire shape — minimal structural type. Avoids importing
 * `chat-handler.ts` (which itself imports from this file), keeping
 * the dependency graph one-way. Mirrors the public `ProviderWirePayload`
 * interface in `chat-handler.ts` shape-for-shape.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export interface ProviderWireShape {
  id: string;
  config: Record<string, string>;
}

/**
 * Snapshot of per-session state needed by `handleChatComponentEvent`
 * to resume a Claude turn with the same provider config and original
 * user prompt.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export interface ResumedChatEntry {
  providerId: string;
  provider: ProviderWireShape;
  registry: string | undefined;
  lastUserPrompt: string;
}

interface SessionEntry {
  /** Claude Code session id from the first `system/init` envelope —
   *  used as `--resume` for the next turn so the CLI keeps state. */
  claudeSessionId: string | null;

  /** Active Bun subprocess for the current turn, or null when idle. */
  activeSubprocess: Subprocess | null;

  /** F43: Snapshot of the most recent chat.message so a subsequent
   *  `chat.component_event` can resume the same provider session with
   *  the same provider config. Null until the first turn spawns. */
  resumeContext: ResumedChatEntry | null;

  /**
   * F47: Marker set by `killActiveSubprocess()` when the subprocess
   * was deliberately killed to free the slot for a follow-up turn
   * (component click → resume). When `runChatTurn` sees this on exit,
   * it suppresses the `chat.error` chatter that a non-zero exit code
   * would otherwise produce — the user explicitly invoked the kill,
   * they didn't crash the agent.
   *
   * Consumed (cleared) by `runChatTurn` after the substitution so
   * subsequent real failures still surface as errors.
   */
  killByClick: boolean;
}

const SESSIONS = new Map<string, SessionEntry>();

export function createChatSession(sessionId: string): void {
  if (!SESSIONS.has(sessionId)) {
    SESSIONS.set(sessionId, {
      claudeSessionId: null,
      activeSubprocess: null,
      resumeContext: null,
      killByClick: false,
    });
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
 * Kill the active subprocess for a session WITHOUT deleting the entry
 * or clearing the Claude session id. Used by `handleChatComponentEvent`
 * to abort the current turn and immediately start a follow-up turn
 * that resumes the same Claude session.
 *
 * Returns `true` if a subprocess was found and signalled, `false`
 * otherwise. Awaits the subprocess's `exited` promise so the caller
 * can be sure no stray stdout lines leak into the next turn's
 * `handleParsedLine` path. We swallow the rejection on `.exited`
 * because `proc.kill()` races with a process that may have already
 * exited on its own (e.g. an agent that finished its turn
 * milliseconds before the click arrived).
 *
 * The session entry is preserved so the Claude session id stays
 * available for `--resume <id>` on the follow-up turn.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export async function killActiveSubprocess(sessionId: string): Promise<boolean> {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return false;
  if (!entry.activeSubprocess) return false;
  const proc = entry.activeSubprocess;
  entry.activeSubprocess = null;
  // F47: mark this kill as a deliberate resume so the in-flight
  // turn's `runChatTurn` doesn't surface the non-zero exit as a
  // `chat.error` to the client. Only set when there's actually a
  // proc to kill — clicking on a component while no turn is in
  // flight must not poison the next real failure.
  entry.killByClick = true;
  try {
    proc.kill();
  } catch {
    // Already exited — ignore.
    return true;
  }
  try {
    await proc.exited;
  } catch {
    // `.exited` can reject if the proc was already torn down — safe
    // to ignore here because we already detached the reference.
  }
  return true;
}

/**
 * F47: consume the click-kill marker. Returns `true` if the most
 * recent `killActiveSubprocess` was a deliberate click-driven kill
 * (so `runChatTurn` should suppress the resulting non-zero-exit
 * error chatter) and clears the flag in the same call so a later
 * genuine failure still surfaces as `chat.error`.
 *
 * Returns `false` when no kill happened (or when a previous one
 * was already consumed).
 */
export function consumeClickKill(sessionId: string): boolean {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return false;
  if (!entry.killByClick) return false;
  entry.killByClick = false;
  return true;
}

/**
 * Test-only: explicitly set the click-kill marker on a session.
 * Used by unit tests that want to exercise `consumeClickKill`'s
 * round-trip semantics without spinning up a real subprocess.
 * Production code path goes through `killActiveSubprocess` which
 * sets the marker as a side effect of the kill.
 *
 * @internal
 */
export function __test_setClickKill(sessionId: string, value: boolean): void {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  entry.killByClick = value;
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

/**
 * F43: Snapshot the provider/prompt context for the current turn
 * so a subsequent `chat.component_event` can resume the same Claude
 * session with the same provider config. Overwrites any prior
 * snapshot — only the most recent user prompt matters for the
 * follow-up turn.
 *
 * No-op when the session isn't registered; `createChatSession()`
 * is always called from `runChatTurn()` before this so the order
 * is deterministic in production.
 */
export function setChatResumeContext(
  sessionId: string,
  context: ResumedChatEntry,
): void {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return;
  entry.resumeContext = context;
}

/**
 * F43: Read the latest resume context for a session. Returns null
 * if no turn has run yet (or the session was deleted via
 * `cancelChatSession`). Used by `handleChatComponentEvent` to find
 * the provider config and original user prompt when resuming.
 */
export function getChatResumeContext(
  sessionId: string,
): ResumedChatEntry | null {
  const entry = SESSIONS.get(sessionId);
  if (!entry) return null;
  return entry.resumeContext;
}
