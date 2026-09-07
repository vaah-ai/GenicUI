/**
 * Claude Code provider adaptor — implements `ProviderAdaptor` for the
 * Anthropic Claude Code CLI.
 *
 * Spawns `claude --print --output-format stream-json --verbose
 * --permission-mode auto --mcp-config <path> [--resume <sid>] -- <prompt>`
 * and parses its stdout lines into typed events the chat channel
 * broadcasts.
 *
 * @module @genicui/server/chat/providers/claude-code
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 *
 * Implementation notes:
 *   - The argv shape matches `poc/server/chat-handler.mjs` line-for-line
 *     (which itself mirrors `vaahagents-v2`'s claude_code.py). Behavior
 *     that diverges is called out inline.
 *   - We use `claude --permission-mode auto` (NOT
 *     `--dangerously-skip-permissions`) because the latter is rejected
 *     when running as root.
 *   - The `--` terminator lets the prompt start with a dash without
 *     being parsed as another flag.
 *   - Binary resolution: honors the client's `config.cliPath`; falls
 *     back to `$GENICUI_CLAUDE_BIN`, then to `'claude'` on $PATH.
 *   - This file is a typed port of the PoC. Do not import from `poc/`.
 */

import type {
  ProviderAdaptor,
  ProviderConfig,
  ParsedLine,
  ChatEvent,
} from './types.js';

/** Marker regex matching `[system/anything]` log prefixes Claude Code
 *  occasionally emits inside text blocks. We strip them so the chat
 *  UI doesn't render bookkeeping noise. */
const RE_SYSTEM_MARKER = /\[system\/[^\]]*\]\s*/g;

function stripSystemMarkers(text: string): string {
  if (!text) return text;
  return text.replace(RE_SYSTEM_MARKER, '');
}

/**
 * Map a parsed stream-json envelope to one of our typed events, or
 * null to drop. Mirrors `poc/server/chat-parser.mjs::mapStreamJsonEvent`
 * line-for-line.
 */
function mapStreamJsonEvent(parsed: unknown): ChatEvent | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const eventType = typeof obj['type'] === 'string' ? obj['type'] : 'unknown';

  // Compact-mode envelope shapes (no `message` wrapper).
  if (eventType === 'text') {
    const cleaned = stripSystemMarkers(typeof obj['data'] === 'string' ? obj['data'] : '');
    if (!cleaned) return null;
    return { type: 'ai_text', data: { text: cleaned } };
  }

  if (eventType === 'tool_use') {
    return {
      type: 'tool_call',
      data: {
        id: typeof obj['id'] === 'string' ? obj['id'] : '',
        name: typeof obj['name'] === 'string' ? obj['name'] : '',
        args: (obj['input'] && typeof obj['input'] === 'object') ? obj['input'] as Record<string, unknown> : {},
      },
    };
  }

  if (eventType === 'tool_result') {
    return {
      type: 'tool_result',
      data: {
        id: typeof obj['id'] === 'string' ? obj['id'] : '',
        name: typeof obj['name'] === 'string' ? obj['name'] : '',
        result: typeof obj['output'] === 'string' ? obj['output'] : '',
      },
    };
  }

  if (eventType === 'error') {
    return { type: 'error', data: { error: typeof obj['error'] === 'string' ? obj['error'] : '' } };
  }

  if (eventType === 'result') {
    // Upstream emits this with usage + final text. The chat UI already
    // rendered the text from the prior `assistant` event, so emit a
    // status-only event — otherwise the surface shows the reply twice.
    const usage = (obj['usage'] && typeof obj['usage'] === 'object') ? obj['usage'] as Record<string, unknown> : {};
    return { type: 'status', data: { status: 'complete', usage } };
  }

  // Verbose-mode envelopes wrap payloads in `message: { content: ... }`.
  if (eventType === 'assistant') return parseAssistantEvent(obj);
  if (eventType === 'user') return parseUserEvent(obj);
  if (eventType === 'system') return parseSystemEvent(obj);

  return null;
}

/**
 * Extract the first text or first tool_use from an assistant message.
 * Thinking blocks are dropped — they often contain
 * `[system/thinking_tokens]` placeholders.
 */
function parseAssistantEvent(parsed: Record<string, unknown>): ChatEvent | null {
  const message = (parsed['message'] && typeof parsed['message'] === 'object')
    ? parsed['message'] as Record<string, unknown>
    : {};
  const content = message['content'];

  if (typeof content === 'string') {
    const stripped = stripSystemMarkers(content);
    if (!stripped.trim()) return null;
    return { type: 'ai_text', data: { text: stripped } };
  }

  if (!Array.isArray(content)) return null;

  const textParts: string[] = [];
  const toolUses: Record<string, unknown>[] = [];

  for (const item of content) {
    if (!item || typeof item !== 'object') {
      if (typeof item === 'string' && item.trim()) textParts.push(item);
      continue;
    }
    const block = item as Record<string, unknown>;
    if (block['type'] === 'thinking') continue; // drop thinking blocks
    if (block['type'] === 'text') textParts.push(typeof block['text'] === 'string' ? block['text'] : '');
    else if (block['type'] === 'tool_use') toolUses.push(block);
  }

  if (textParts.length) {
    const joined = stripSystemMarkers(textParts.join(''));
    if (joined) return { type: 'ai_text', data: { text: joined } };
  }

  if (toolUses.length) {
    const tu = toolUses[0]!;
    return {
      type: 'tool_call',
      data: {
        id: typeof tu['id'] === 'string' ? tu['id'] : '',
        name: typeof tu['name'] === 'string' ? tu['name'] : '',
        args: (tu['input'] && typeof tu['input'] === 'object') ? tu['input'] as Record<string, unknown> : {},
      },
    };
  }

  return null;
}

function parseUserEvent(parsed: Record<string, unknown>): ChatEvent | null {
  const message = (parsed['message'] && typeof parsed['message'] === 'object')
    ? parsed['message'] as Record<string, unknown>
    : {};
  const content = message['content'];
  if (!Array.isArray(content)) return null;

  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    const block = item as Record<string, unknown>;
    if (block['type'] !== 'tool_result') continue;

    let text = '';
    const inner = block['content'];
    if (Array.isArray(inner)) {
      for (const part of inner) {
        if (!part || typeof part !== 'object') {
          if (typeof part === 'string') text += part;
          continue;
        }
        const p = part as Record<string, unknown>;
        if (p['type'] === 'text' && typeof p['text'] === 'string') text += p['text'];
        else if (typeof part === 'string') text += part;
      }
    } else if (typeof inner === 'string') {
      text = inner;
    }
    if (!text) text = JSON.stringify(item);
    return {
      type: 'tool_result',
      data: {
        id: typeof block['tool_use_id'] === 'string' ? block['tool_use_id'] : '',
        name: '',
        result: text,
      },
    };
  }
  return null;
}

function parseSystemEvent(parsed: Record<string, unknown>): ChatEvent | null {
  const subtype = typeof parsed['subtype'] === 'string' ? parsed['subtype'] : '';

  if (subtype === 'init') {
    const sid = parsed['session_id'] ?? (parsed['data'] && typeof parsed['data'] === 'object'
      ? (parsed['data'] as Record<string, unknown>)['session_id']
      : undefined);
    return { type: 'status', data: { status: 'init', sessionId: typeof sid === 'string' ? sid : '' } };
  }

  if (subtype === 'hook_started' || subtype === 'hook_response') return null;

  if (subtype === 'task_started' || subtype === 'task_progress') {
    return {
      type: 'status',
      data: {
        status: subtype,
        description: typeof parsed['description'] === 'string' ? parsed['description'] : '',
        taskId: typeof parsed['task_id'] === 'string' ? parsed['task_id'] : '',
      },
    };
  }

  if (subtype === 'task_notification' || subtype === 'task_completed') {
    return {
      type: 'status',
      data: {
        status: 'task_completed',
        description: typeof parsed['description'] === 'string' ? parsed['description'] : '',
        taskId: typeof parsed['task_id'] === 'string' ? parsed['task_id'] : '',
      },
    };
  }

  // Compact-mode `system` events sometimes carry errors.
  const err = parsed['error'] ?? (parsed['data'] && typeof parsed['data'] === 'object'
    ? (parsed['data'] as Record<string, unknown>)['error']
    : undefined);
  if (typeof err === 'string') {
    return { type: 'error', data: { error: err } };
  }

  return null;
}

/**
 * Resolve the path to the GenicUI .mcp.json that the spawned Claude
 * Code will read to discover the GenicUI MCP server.
 *
 * Defaults to `<repo>/.mcp.json` (three levels up from this file) but
 * can be overridden with `GENICUI_MCP_CONFIG`.
 */
function resolveMcpConfigPath(): string {
  if (process.env['GENICUI_MCP_CONFIG']) return process.env['GENICUI_MCP_CONFIG'];
  return new URL('../../../../../.mcp.json', import.meta.url).pathname;
}

/**
 * Resolve the binary path. Order:
 *   1. `config.cliPath` from the client wire payload
 *   2. `$GENICUI_CLAUDE_BIN` env var
 *   3. `'claude'` (assume it's on $PATH)
 */
function resolveClaudeBinary(config: ProviderConfig): string {
  if (typeof config['cliPath'] === 'string' && config['cliPath'].trim().length > 0) {
    return config['cliPath'];
  }
  if (process.env['GENICUI_CLAUDE_BIN']) return process.env['GENICUI_CLAUDE_BIN'];
  return 'claude';
}

/**
 * The Claude Code adaptor. Stateless — safe to register as a singleton.
 */
export class ClaudeCodeAdaptor implements ProviderAdaptor {
  public readonly id = 'claude-code';
  public readonly label = 'Claude Code';

  resolveBinary(config: ProviderConfig): string {
    return resolveClaudeBinary(config);
  }

  buildArgs(opts: { readonly resumeId: string | null }): string[] {
    const args: string[] = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--permission-mode', 'auto',
      '--mcp-config', resolveMcpConfigPath(),
    ];
    console.error(
      `[claude-code] buildArgs: mcp-config=${resolveMcpConfigPath()}`,
    );
    if (opts.resumeId) {
      args.push('--resume', opts.resumeId);
    }
    // The chat handler appends `-- <prompt>` itself so prompts with
    // leading dashes aren't parsed as flags. We add it here anyway to
    // keep `buildArgs` self-contained for tests.
    return args;
  }

  parseLine(line: string): ParsedLine {
    const trimmed = line.trim();
    if (!trimmed) return { kind: 'drop' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Non-JSON line — surface as stdout so the chat UI still shows it.
      return { kind: 'event', event: { type: 'stdout', data: { text: stripSystemMarkers(trimmed) } } };
    }

    if (!parsed || typeof parsed !== 'object') return { kind: 'drop' };
    const obj = parsed as Record<string, unknown>;
    if (!('type' in obj)) return { kind: 'drop' };

    // Compact-mode `result` is the natural end-of-stream signal — emit
    // as a regular event so the chat panel gets the usage stats and
    // the chat handler closes the turn.
    if (obj['type'] === 'result') {
      const mapped = mapStreamJsonEvent(parsed);
      if (mapped) return { kind: 'event', event: mapped };
      return { kind: 'complete' };
    }

    // system/init carries the session id we --resume on next turn.
    if (obj['type'] === 'system' && obj['subtype'] === 'init') {
      const sid = obj['session_id'] ?? (obj['data'] && typeof obj['data'] === 'object'
        ? (obj['data'] as Record<string, unknown>)['session_id']
        : undefined);
      if (typeof sid === 'string') {
        return {
          kind: 'event',
          event: { type: 'status', data: { status: 'init', sessionId: sid } },
        };
      }
      return { kind: 'drop' };
    }

    const mapped = mapStreamJsonEvent(parsed);
    if (!mapped) return { kind: 'drop' };
    return { kind: 'event', event: mapped };
  }
}
