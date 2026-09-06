/**
 * Provider adaptor types — server-side abstraction for spawning local LLM
 * CLIs (Claude Code today, codex / others tomorrow) and parsing their
 * stdout into typed events the chat channel can broadcast.
 *
 * @module @genicui/server/chat/providers/types
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 *
 * Design notes:
 *   - This module is the CLI-spawn path. The HTTP API path lives in
 *     `@genicui/agent-bridge/llm-provider` and is a separate concern;
 *     both coexist (some providers are spawned CLIs, some are HTTPS calls).
 *   - Adaptors are pure logic; the chat handler owns the Bun.spawn
 *     lifecycle. This makes each adaptor trivial to unit-test by
 *     feeding synthetic lines through `parseLine()`.
 *   - Configuration flows in from the client's `ProviderWirePayload`
 *     via `ChatMessage.provider.config`. The server treats it as
 *     `Record<string, string>` — adaptors own field-name semantics.
 */

/**
 * Per-provider configuration forwarded by the client. Adaptors read
 * keys they understand (e.g. claude-code reads `cliPath`); unknown
 * keys are ignored so new fields can ship without server changes.
 */
export type ProviderConfig = Record<string, string>;

/**
 * A single typed event surfaced by an adaptor. The chat channel
 * broadcasts these inside `chat.event` frames.
 */
export interface ChatEvent {
  /** Event discriminator (e.g. 'ai_text', 'tool_call', 'tool_result',
   *  'error', 'status', 'stdout', 'user_message'). */
  readonly type: string;
  /** Event payload — shape varies by `type`. */
  readonly data: Record<string, unknown>;
}

/**
 * Result of parsing one stdout line from the spawned CLI.
 *
 * - `event`     — push as a `chat.event` frame
 * - `complete`  — Claude Code signaled end-of-stream; no extra frame
 * - `drop`      — silently ignore
 * - `stderr`    — buffered, surfaced on subprocess close
 */
export type ParsedLine =
  | { readonly kind: 'event'; readonly event: ChatEvent }
  | { readonly kind: 'complete' }
  | { readonly kind: 'drop' }
  | { readonly kind: 'stderr'; readonly text: string };

/**
 * A provider adaptor — knows how to spawn a local LLM CLI, build its
 * argv, and parse its stdout into typed events.
 *
 * The chat handler calls `buildArgs()` once per turn, spawns the
 * binary, then pipes every stdout line through `parseLine()`. Adaptors
 * never touch the WebSocket directly.
 */
export interface ProviderAdaptor {
  /** Stable provider id matching the client's `ProviderWirePayload.id`. */
  readonly id: string;

  /** Human-readable label (for logs). */
  readonly label: string;

  /**
   * Resolve the binary path from the client's per-provider config.
   * Must honor `config.<field>` where `<field>` is the adaptor-specific
   * key (e.g. `cliPath` for claude-code).
   */
  resolveBinary(config: ProviderConfig): string;

  /**
   * Build the argv for a single chat turn. The chat handler appends
   * `-- <prompt>` itself so adaptors stay decoupled from prompt
   * escaping; adaptors that need a different terminator can ignore
   * this convention by returning the full argv including the prompt.
   *
   * @param resumeId — Claude session id from a previous turn, if any.
   *                   Pass-through to `--resume` for multi-turn chats.
   */
  buildArgs(opts: { readonly resumeId: string | null }): string[];

  /**
   * Parse one stdout line into a typed event. Adaptors never throw;
   * unparseable / unknown lines return `{ kind: 'drop' }`.
   */
  parseLine(line: string): ParsedLine;
}

/**
 * Default JSON-line parser shared by adaptors that emit
 * `--output-format stream-json`. Provider-specific shape is layered on
 * top via `parseLine` overrides.
 */
export interface StreamJsonAdaptorHelpers {
  /**
   * Parse a JSON envelope into a typed event, or null to drop.
   * Mirrors `poc/server/chat-parser.mjs::mapStreamJsonEvent` (which
   * itself ports vaahagents' `_map_stream_json_event`).
   */
  mapStreamJsonEvent(parsed: unknown): ChatEvent | null;
}
