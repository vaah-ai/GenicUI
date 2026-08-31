// Chat stream parser — turns each stdout line from
// `claude --print --output-format stream-json --verbose` into one
// typed event ready to push to the chat broadcaster.
//
// Faithfully ports the JSON mapping from
//   vaahagents-v2/backend/services/claude_code.py:850-985
// (parse_output_line / map_stream_json_event / _parse_assistant_event).
//
// Differences from the vaahagents Python version:
//   - We only emit the event types our frontend renders: ai_text,
//     tool_call, tool_result, error, status, complete. Internal
//     bookkeeping (hooks, init, progress, parent_tool_use_id chains)
//     is silently dropped, just like the upstream.
//   - We also capture Claude Code's session_id from the system/init
//     event so the chat backend can `--resume <id>` on the next turn.
//   - We always emit exactly one `complete` event per stream — either
//     when Claude Code sends a `result` event, or when the subprocess
//     exits.

const RE_SYSTEM_MARKER = /\[system\/[^\]]*\]\s*/g;

function stripSystemMarkers(text) {
  if (!text) return text;
  return text.replace(RE_SYSTEM_MARKER, '');
}

/**
 * Map a parsed stream-json line to one of our typed events, or null to
 * drop. Mirrors vaahagents' `_map_stream_json_event`.
 */
export function mapStreamJsonEvent(parsed) {
  const eventType = parsed?.type ?? 'unknown';

  // Compact types (non-verbose)
  if (eventType === 'text') {
    const cleaned = stripSystemMarkers(parsed.data ?? '');
    if (!cleaned) return null;
    return { type: 'ai_text', data: { text: cleaned } };
  }

  if (eventType === 'tool_use') {
    return {
      type: 'tool_call',
      data: {
        id: parsed.id ?? '',
        name: parsed.name ?? '',
        args: parsed.input ?? {},
      },
    };
  }

  if (eventType === 'tool_result') {
    return {
      type: 'tool_result',
      data: {
        id: parsed.id ?? '',
        name: parsed.name ?? '',
        result: parsed.output ?? '',
      },
    };
  }

  if (eventType === 'error') {
    return { type: 'error', data: { error: parsed.error ?? '' } };
  }

  if (eventType === 'result') {
    // Upstream emits this with usage + final text. We already rendered
    // the text from the prior `assistant` event, so emit status only —
    // otherwise the chat surface shows the response twice.
    return {
      type: 'status',
      data: { status: 'complete', usage: parsed.usage ?? {} },
    };
  }

  // Verbose types (--verbose emits assistant/user/system envelopes)
  if (eventType === 'assistant') return parseAssistantEvent(parsed);
  if (eventType === 'user') return parseUserEvent(parsed);
  if (eventType === 'system') return parseSystemEvent(parsed);

  // Unknown — drop silently so the frontend doesn't get spammed.
  return null;
}

/**
 * Extract the first text or first tool_use from an assistant message.
 * Thinking blocks are dropped — they often contain
 * `[system/thinking_tokens]` placeholders.
 */
function parseAssistantEvent(parsed) {
  const message = parsed.message ?? {};
  const content = message.content;
  if (!content) return null;

  if (typeof content === 'string') {
    const stripped = stripSystemMarkers(content);
    if (!stripped.trim()) return null;
    return { type: 'ai_text', data: { text: stripped } };
  }

  if (!Array.isArray(content)) return null;

  const textParts = [];
  const toolUses = [];
  for (const item of content) {
    if (!item || typeof item !== 'object') {
      if (typeof item === 'string' && item.trim()) textParts.push(item);
      continue;
    }
    if (item.type === 'thinking') continue; // drop thinking blocks
    if (item.type === 'text') textParts.push(item.text ?? '');
    else if (item.type === 'tool_use') toolUses.push(item);
  }

  if (textParts.length) {
    const joined = stripSystemMarkers(textParts.join(''));
    if (joined) return { type: 'ai_text', data: { text: joined } };
  }

  if (toolUses.length) {
    const tu = toolUses[0];
    return {
      type: 'tool_call',
      data: {
        id: tu.id ?? '',
        name: tu.name ?? '',
        args: tu.input ?? {},
      },
    };
  }

  return null;
}

function parseUserEvent(parsed) {
  const content = parsed.message?.content;
  if (!Array.isArray(content)) return null;

  for (const item of content) {
    if (item?.type === 'tool_result') {
      let text = '';
      const inner = item.content;
      if (Array.isArray(inner)) {
        for (const part of inner) {
          if (part?.type === 'text') text += part.text ?? '';
          else if (typeof part === 'string') text += part;
        }
      } else if (typeof inner === 'string') {
        text = inner;
      }
      if (!text) text = JSON.stringify(item);
      return {
        type: 'tool_result',
        data: {
          id: item.tool_use_id ?? '',
          name: '',
          result: text,
        },
      };
    }
  }
  return null;
}

/**
 * Emit only the bits the chat UI cares about:
 *   - session id (so we can --resume next turn)
 *   - task_started / task_progress / task_completed
 *   - errors
 * Drop hook events and the noisy init heartbeat.
 */
function parseSystemEvent(parsed) {
  const subtype = parsed.subtype ?? '';

  if (subtype === 'init') {
    const sid = parsed.session_id ?? parsed.data?.session_id;
    return { type: 'status', data: { status: 'init', sessionId: sid } };
  }

  if (subtype === 'hook_started' || subtype === 'hook_response') {
    return null;
  }

  if (subtype === 'task_started' || subtype === 'task_progress') {
    return {
      type: 'status',
      data: {
        status: subtype,
        description: parsed.description ?? '',
        taskId: parsed.task_id ?? '',
      },
    };
  }

  if (subtype === 'task_notification' || subtype === 'task_completed') {
    return {
      type: 'status',
      data: {
        status: 'task_completed',
        description: parsed.description ?? '',
        taskId: parsed.task_id ?? '',
      },
    };
  }

  // Compact-mode `system` events sometimes carry errors
  if (parsed.error || parsed.data?.error) {
    return {
      type: 'error',
      data: { error: parsed.error ?? parsed.data.error },
    };
  }

  return null;
}

/**
 * Parse one stdout line. Returns:
 *   { kind: 'event', event: {...} }   — push to broadcaster
 *   { kind: 'session', sessionId }   — remember for --resume
 *   { kind: 'drop' }                  — ignore
 *   { kind: 'stdout', text }          — non-JSON line, surface as stdout
 *   { kind: 'complete' }              — Claude Code signaled completion
 */
export function parseOutputLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return { kind: 'drop' };

  // Try JSON first (stream-json format)
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Non-JSON line — fall through to stdout
    return { kind: 'stdout', text: stripSystemMarkers(trimmed) };
  }

  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    return { kind: 'drop' };
  }

  // Compact-mode `result` is the natural end-of-stream signal — turn
  // it into a synthetic complete so the frontend closes cleanly.
  if (parsed.type === 'result') {
    const mapped = mapStreamJsonEvent(parsed);
    if (mapped) return { kind: 'event', event: mapped };
    return { kind: 'complete' };
  }

  // system/init carries the session id we need to --resume next time.
  if (parsed.type === 'system' && parsed.subtype === 'init') {
    const sid = parsed.session_id ?? parsed.data?.session_id;
    if (sid) return { kind: 'session', sessionId: sid };
    return { kind: 'drop' };
  }

  const mapped = mapStreamJsonEvent(parsed);
  if (!mapped) return { kind: 'drop' };
  return { kind: 'event', event: mapped };
}