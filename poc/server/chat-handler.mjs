// Chat handler — drives `claude --print --output-format stream-json
// --verbose --mcp-config <path> --resume <sid> -- <prompt>` per
// browser-submitted message, parses stdout into typed events, and
// pushes them through the chat broadcaster for SSE delivery.
//
// Adapted from vaahagents-v2/backend/services/claude_code.py
// (subprocess path) — but in plain Node + child_process.spawn, no
// asyncio.

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { broadcaster } from './chat-broadcaster.mjs';
import { parseOutputLine } from './chat-parser.mjs';

/** Resolve the path to the GenicUI .mcp.json that the spawned Claude
 *  will read to discover this MCP server. Defaults to <repo>/.mcp.json
 *  but can be overridden with GENICUI_MCP_CONFIG. */
function resolveMcpConfigPath() {
  if (process.env.GENICUI_MCP_CONFIG) return process.env.GENICUI_MCP_CONFIG;
  // server/index.mjs lives at <repo>/poc/server/, so .mcp.json is
  // three levels up.
  return new URL('../../.mcp.json', import.meta.url).pathname;
}

/** Resolve the path to the `claude` CLI. */
function resolveClaudeBinary() {
  return process.env.GENICUI_CLAUDE_BIN || 'claude';
}

/**
 * Run a single prompt as a child `claude --print` process and stream
 * its parsed events into the given chat session. Resolves when the
 * subprocess exits.
 *
 * @param {string} sessionId     GenicUI chat session id (browser-side)
 * @param {string} prompt        The user's prompt text
 */
export function runChatTurn(sessionId, prompt) {
  const claudeBin = resolveClaudeBinary();
  const mcpConfigPath = resolveMcpConfigPath();
  const resumeId = broadcaster.getClaudeSession(sessionId);

  // Matches vaahagents-v2's arg list (claude_code.py:380-388) but
  // adds --mcp-config so Claude Code loads the GenicUI MCP server
  // for the subprocess. We use --permission-mode auto (not
  // --dangerously-skip-permissions) because the latter is rejected
  // when running as root and we want auto-approval either way.
  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'auto',
    '--mcp-config', mcpConfigPath,
  ];
  if (resumeId) {
    args.push('--resume', resumeId);
  }
  // The "--" terminator lets the prompt start with a dash without
  // being parsed as another flag.
  args.push('--', prompt);

  console.log(`[chat] spawning claude for session ${sessionId}` +
    (resumeId ? ` (resume ${resumeId})` : '') +
    ` prompt=${JSON.stringify(prompt).slice(0, 80)}…`);

  let child;
  try {
    child = spawn(claudeBin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    broadcaster.push(sessionId, {
      type: 'error',
      data: { error: `Failed to spawn ${claudeBin}: ${err.message}` },
    });
    broadcaster.close(sessionId, 'error');
    return;
  }

  let stdoutBuf = '';
  let stderrBuf = '';

  child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString('utf8');
    let nl;
    while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
      const line = stdoutBuf.slice(0, nl);
      stdoutBuf = stdoutBuf.slice(nl + 1);
      handleLine(sessionId, line);
    }
  });

  child.stderr.on('data', (chunk) => {
    stderrBuf += chunk.toString('utf8');
  });

  child.on('error', (err) => {
    broadcaster.push(sessionId, {
      type: 'error',
      data: { error: `claude subprocess error: ${err.message}` },
    });
  });

  child.on('close', (code, signal) => {
    // Flush any remaining partial line in the buffer.
    if (stdoutBuf.trim()) handleLine(sessionId, stdoutBuf);

    if (stderrBuf.trim()) {
      // Claude Code writes non-fatal progress to stderr (e.g. "[tools]
      // …"). Surface it only if we never got a clean completion.
      console.log(`[chat] stderr from session ${sessionId}: ${stderrBuf.trim().slice(0, 200)}`);
    }

    if (code === 0) {
      broadcaster.close(sessionId, 'complete');
    } else {
      broadcaster.push(sessionId, {
        type: 'error',
        data: {
          error: `claude exited with code ${code}${signal ? ` (signal ${signal})` : ''}` +
            (stderrBuf.trim() ? `: ${stderrBuf.trim().slice(0, 500)}` : ''),
        },
      });
      broadcaster.close(sessionId, 'error');
    }
    console.log(`[chat] session ${sessionId} subprocess closed (code=${code})`);
  });
}

function handleLine(sessionId, line) {
  const result = parseOutputLine(line);
  switch (result.kind) {
    case 'event':
      broadcaster.push(sessionId, result.event);
      break;
    case 'session':
      broadcaster.rememberClaudeSession(sessionId, result.sessionId);
      console.log(`[chat] session ${sessionId} -> claude session ${result.sessionId}`);
      break;
    case 'stdout':
      if (result.text) {
        broadcaster.push(sessionId, { type: 'stdout', data: { text: result.text } });
      }
      break;
    case 'complete':
      // The `complete` event has already been pushed via the generic
      // event branch above (parseOutputLine returns kind: 'event' for
      // JSON `complete` messages). No second close needed — see the
      // chat-broadcaster docstring for the multi-turn model.
      break;
    case 'drop':
    default:
      break;
  }
}

/**
 * SSE response generator. Subscribes to the broadcaster for the given
 * session and yields SSE-formatted lines until a terminal event
 * (`complete`, `cancelled`, `error`) arrives.
 *
 * Mirrors vaahagents-v2's `services/sse_stream.py::sse_event_generator`.
 *
 * @param {string} sessionId
 * @returns {AsyncGenerator<string>}
 */
export async function* sseEventGenerator(sessionId) {
  const queue = [];
  let resolveNext = null;

  const unsubscribe = broadcaster.subscribe(sessionId, (event) => {
    queue.push(event);
    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  });

  try {
    // `ready` is a connection sentinel — lets the browser know the
    // stream is alive and it can start sending prompts.
    yield formatSse({ type: 'ready', data: {} }, 'ready');

    // The stream stays open across multiple turns. The browser treats
    // `complete` as "this turn settled, ready for the next"; the
    // connection only ends when the browser disconnects (finally
    // block) or when the broadcaster session entry is deleted
    // (30s after `close()`, see chat-broadcaster.mjs). On a long-lived
    // browser session, we keep yielding events forever; an idle
    // generator just awaits on `resolveNext`.
    while (true) {
      if (queue.length === 0) {
        await new Promise((resolve) => { resolveNext = resolve; });
      }
      while (queue.length > 0) {
        const event = queue.shift();
        yield formatSse(event, event.type);
      }
    }
  } finally {
    unsubscribe();
  }
}

function formatSse(payload, eventName) {
  const data = JSON.stringify(payload);
  // 16KB ceiling per vaahagents' replay chunking — keeps EventSource
  // buffers happy even for large tool_result payloads.
  return `event: ${eventName}\ndata: ${data}\n\n`;
}

/** Create a new chat session id (in-memory). */
export function createSession() {
  const sessionId = `s-${randomUUID()}`;
  broadcaster.create(sessionId);
  return sessionId;
}

/** Touch an existing session — used by the SSE handler to verify the
 *  session exists before subscribing. Returns true if it does. */
export function sessionExists(sessionId) {
  return broadcaster.has(sessionId);
}

/** Append a user prompt to a session and spawn the Claude turn. */
export function appendMessage(sessionId, content) {
  if (!broadcaster.has(sessionId)) {
    throw new Error(`Unknown chat session: ${sessionId}`);
  }
  // Echo the user message back through the broadcaster so the
  // transcript on the browser shows what was sent. Subscribers will
  // get this before any claude events.
  broadcaster.push(sessionId, {
    type: 'user_message',
    data: { content, role: 'user' },
  });
  runChatTurn(sessionId, content);
}