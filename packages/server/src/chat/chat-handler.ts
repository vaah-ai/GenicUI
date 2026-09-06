/**
 * Chat handler — receives a chat.message frame from the client, looks
 * up the right provider adaptor, spawns the CLI per turn, and streams
 * parsed events back over the WebSocket as `chat.event` frames.
 *
 * @module @genicui/server/chat/chat-handler
 *
 * @see {F43} — Suggestive prompts + registry selector
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 *
 * Wire flow:
 *   client → chat.message  { prompt, registry, provider: { id, config } }
 *     ↓ validate prompt
 *     ↓ lookup adaptor by provider.id
 *     ↓ if unknown provider → chat.error
 *     ↓ spawn CLI per `buildArgs(resumeId)` + `-- <prompt>`
 *     ↓ for each stdout line: parseLine → chat.event frame
 *     ↓ on `tool_call` for `render_component`: bridge to renderComponent(),
 *       broadcast COMPONENT_MOUNTED on the component's channel
 *     ↓ on subprocess exit:
 *         code 0 + non-empty session map → chat.complete
 *         else → chat.error
 *
 *   server → client:
 *     chat.event       { type, data }    streamed (one per parsed line)
 *     COMPONENT_MOUNTED { ... }          on render_component bridge
 *     chat.complete    { ts }            turn settled successfully
 *     chat.error       { error }         turn failed
 */

import type { WsSession } from '../transport/types.js';
import { serializeFrame } from '../transport/frame-handler.js';
import { broadcastToAllSessions } from '../transport/websocket.js';
import { getProviderAdaptor } from './providers/registry.js';
import type { ProviderConfig, ChatEvent } from './providers/types.js';
import {
  createChatSession,
  rememberClaudeSession,
  getClaudeSession,
  setActiveSubprocess,
} from './chat-session-registry.js';
import { renderComponent, type RenderResult } from '../mcp/render-handler.js';

/**
 * A chat message from the frontend.
 */
export interface ChatMessage {
  /** The user's prompt text. */
  prompt: string;
  /** Optional: the registry framework the user selected. */
  registry: string | undefined;
  /** Optional: the provider wire payload (id + per-provider config).
   *  When omitted, falls back to the legacy placeholder behavior. */
  provider?: ProviderWirePayload;
}

/**
 * The provider block the client sends alongside a chat message.
 * Mirrors `examples/playground/app/providers/types.ts::ProviderWirePayload`.
 */
export interface ProviderWirePayload {
  /** Provider id (matches an adaptor registered server-side). */
  id: string;
  /** Per-provider config forwarded to the adaptor. */
  config: ProviderConfig;
}

/**
 * Handle a chat message from the WebSocket client.
 *
 * Validates the prompt, looks up the provider adaptor, and spawns
 * the configured CLI. Spawn errors and unknown providers send a
 * `chat.error` frame; successful spawns stream events as `chat.event`
 * frames and close with `chat.complete` (or `chat.error` on non-zero
 * exit).
 *
 * @param session — the WebSocket session
 * @param message — the chat message from the client
 */
export async function handleChatMessage(
  session: WsSession,
  message: ChatMessage,
): Promise<void> {
  console.error(
    `[chat] Session ${session.sessionId} received chat.message ` +
      `prompt=${JSON.stringify(message.prompt).slice(0, 80)} ` +
      `provider=${message.provider?.id ?? '(none)'}`,
  );

  // 1. Validate prompt
  if (!message.prompt || message.prompt.trim().length === 0) {
    sendChatError(session, 'Prompt cannot be empty');
    return;
  }

  // 2. Backward-compat: legacy messages without `provider` echo back
  //    as before so the F43 UI tests keep passing until the full
  //    spawn path is wired up to the playground.
  if (!message.provider) {
    sendLegacyEcho(session, message);
    return;
  }

  // 3. Look up the adaptor. Unknown provider ids emit a chat.error so
  //    the UI can surface them in the chat panel rather than hang.
  const adaptor = getProviderAdaptor(message.provider.id);
  if (!adaptor) {
    sendChatError(session, `Unknown provider: ${message.provider.id}`);
    return;
  }

  // 4. Spawn. Any thrown error from Bun.spawn lands in the catch and
  //    becomes a chat.error frame so the user gets feedback.
  await runChatTurn(session, message, adaptor);
}

/**
 * Echo placeholder used when no provider is selected. Preserves the
 * pre-M5-T6 behaviour so the playground's smoke test still passes
 * for users who haven't picked a provider yet.
 */
function sendLegacyEcho(session: WsSession, message: ChatMessage): void {
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.response',
    payload: {
      prompt: message.prompt,
      response: `Received prompt: "${message.prompt}"`,
      timestamp: new Date().toISOString(),
    },
    seq: session.seqGenerator.next(),
  };
  session.elysiaWs.send(serializeFrame(frame));
  console.error(
    `[chat] Session ${session.sessionId}: prompt="${message.prompt.slice(0, 80)}" (legacy echo)`,
  );
}

/**
 * Run a single chat turn: spawn the provider's CLI, stream parsed
 * events back, close with chat.complete or chat.error on exit.
 *
 * This is the server-side equivalent of `poc/server/chat-handler.mjs`'s
 * `runChatTurn()`. The key differences:
 *   - We send frames directly through `session.elysiaWs.send()`
 *     instead of an EventEmitter broadcaster (the WebSocket IS the
 *     transport here).
 *   - Resume id is sourced from `chat-session-registry`, not from an
 *     EventEmitter map.
 */
async function runChatTurn(
  session: WsSession,
  message: ChatMessage,
  adaptor: ReturnType<typeof getProviderAdaptor> & object,
): Promise<void> {
  // Make sure the session is registered before the subprocess emits
  // anything (otherwise the first `status/init` event can't be linked
  // to the session for --resume on the next turn).
  createChatSession(session.sessionId);

  const binary = adaptor.resolveBinary(message.provider!.config);
  const resumeId = getClaudeSession(session.sessionId);
  const args = [...adaptor.buildArgs({ resumeId }), '--', message.prompt];

  console.error(
    `[chat] spawning ${adaptor.id} for session ${session.sessionId}` +
      (resumeId ? ` (resume ${resumeId})` : '') +
      ` prompt=${JSON.stringify(message.prompt).slice(0, 80)}…`,
  );

  // Spawn. Bun.spawn is the only platform API here — the server runs
  // on Bun by contract.
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn({
      cmd: [binary, ...args],
      cwd: process.cwd(),
      env: process.env,
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    sendChatError(session, `Failed to spawn ${binary}: ${message_}`);
    sendChatComplete(session, 'error');
    return;
  }

  setActiveSubprocess(session.sessionId, proc);

  // Buffer stdout line-by-line. Claude Code emits one JSON envelope
  // per line when --output-format stream-json is set.
  let stdoutBuf = '';
  let stderrBuf = '';

  // When stdout/stderr is 'pipe', Bun.spawn returns a ReadableStream of
  // Uint8Array; the TypeScript union with `number` exists for the fd
  // shorthand form (`stdout: process.stdout.fd`). We always pass 'pipe'
  // so the runtime value is always the stream — cast to settle the
  // type narrowing.
  const stdoutStream = proc.stdout as ReadableStream<Uint8Array<ArrayBuffer>> | null;
  const stderrStream = proc.stderr as ReadableStream<Uint8Array<ArrayBuffer>> | null;

  // We need a TextDecoder to read the byte streams as text. Bun's
  // ReadableStream of Uint8Array is async-iterable.
  const stdoutDecoder = new TextDecoder('utf-8');
  const stderrDecoder = new TextDecoder('utf-8');

  // Drain stdout + stderr concurrently.
  const stdoutTask = (async () => {
    if (!stdoutStream) return;
    for await (const chunk of stdoutStream) {
      const text = stdoutDecoder.decode(chunk, { stream: true });
      stdoutBuf += text;
      let nl = stdoutBuf.indexOf('\n');
      while (nl !== -1) {
        const line = stdoutBuf.slice(0, nl);
        stdoutBuf = stdoutBuf.slice(nl + 1);
        handleParsedLine(session, line, adaptor.id);
        nl = stdoutBuf.indexOf('\n');
      }
    }
  })();

  const stderrTask = (async () => {
    if (!stderrStream) return;
    for await (const chunk of stderrStream) {
      stderrBuf += stderrDecoder.decode(chunk, { stream: true });
    }
  })();

  // Wait for both streams + the subprocess to exit.
  const [exitCode, ,] = await Promise.all([
    proc.exited,
    stdoutTask.catch(() => undefined),
    stderrTask.catch(() => undefined),
  ]);

  // Clear the active subprocess marker so cancelChatSession doesn't
  // try to kill an already-exited process.
  setActiveSubprocess(session.sessionId, null);

  // Flush any partial trailing stdout line.
  if (stdoutBuf.trim()) {
    handleParsedLine(session, stdoutBuf, adaptor.id);
  }

  if (stderrBuf.trim()) {
    // Claude Code writes non-fatal progress to stderr (e.g. "[tools]…").
    // Surface it on the chat channel as a status event so the user
    // sees the CLI complained about something.
    console.error(
      `[chat] stderr from session ${session.sessionId}: ${stderrBuf.trim().slice(0, 200)}`,
    );
    sendChatEvent(session, {
      type: 'stderr',
      data: { text: stderrBuf.trim().slice(0, 4000) },
    });
  }

  if (exitCode === 0) {
    sendChatComplete(session, 'complete');
  } else {
    sendChatError(
      session,
      `${adaptor.label} exited with code ${exitCode}` +
        (stderrBuf.trim() ? `: ${stderrBuf.trim().slice(0, 500)}` : ''),
    );
    sendChatComplete(session, 'error');
  }

  console.error(
    `[chat] session ${session.sessionId} subprocess closed (code=${exitCode})`,
  );
}

/**
 * Test-only export — drives the line-handling logic without spawning
 * a subprocess so the render_component bridge can be exercised in
 * isolation. Not part of the public surface.
 *
 * @internal
 */
export function __test_handleParsedLine(
  session: WsSession,
  line: string,
  providerId: string,
): void {
  handleParsedLine(session, line, providerId);
}

/**
 * Feed one stdout line through the adaptor's parser, then publish
 * the resulting event (if any) as a chat.event frame. Also remembers
 * the Claude session id when status/init surfaces it.
 *
 * If the agent issued a `render_component` MCP tool call, we bridge it
 * straight into `renderComponent()` and broadcast a `COMPONENT_MOUNTED`
 * frame on the new component's channel — mirroring the PoC's McpBridge
 * behaviour. The Claude MCP stdio round-trip (when working) ends up
 * landing in the same `componentStore`, so both paths converge.
 */
function handleParsedLine(
  session: WsSession,
  line: string,
  providerId: string,
): void {
  const adaptor = getProviderAdaptor(providerId);
  if (!adaptor) return;

  const parsed = adaptor.parseLine(line);
  if (parsed.kind === 'event') {
    // Capture the Claude session id for --resume next turn.
    const ev = parsed.event;
    if (ev.type === 'status' && ev.data['status'] === 'init') {
      const sid = ev.data['sessionId'];
      if (typeof sid === 'string' && sid.length > 0) {
        rememberClaudeSession(session.sessionId, sid);
        console.error(
          `[chat] session ${session.sessionId} -> ${providerId} session ${sid}`,
        );
      }
    }

    // Bridge render_component tool calls into the component store + a
    // COMPONENT_MOUNTED WS frame. We do this even if Claude Code's MCP
    // round-trip is wired up — both paths hit the same componentStore
    // and renderComponent() is idempotent by name in F16, so a double
    // mount with the same args is safe (the componentStore.register()
    // call replaces the existing record with identical props).
    //
    // ev.data shape (from claude-code.ts parser): { id, name, args }.
    // The `name` field is the bare tool name when the agent calls
    // `render_component` directly, but Claude Code's MCP wrapper
    // prefixes it as `mcp__<server>__<tool>` (e.g.
    // `mcp__genicui__render_component`). Accept either form so the
    // bridge fires regardless of whether the call came through MCP.
    if (ev.type === 'tool_call' && isRenderComponentCall(ev.data['name'])) {
      const args = (ev.data['args'] && typeof ev.data['args'] === 'object')
        ? (ev.data['args'] as Record<string, unknown>)
        : {};
      bridgeRenderComponent(session, args);
      // Still emit the chat.event for the chat panel (so the user sees
      // what the agent called).
      sendChatEvent(session, ev);
      return;
    }

    sendChatEvent(session, ev);
    return;
  }
  if (parsed.kind === 'complete' || parsed.kind === 'drop') {
    return;
  }
  // parsed.kind === 'stderr' is reserved for adaptors that want to
  // surface raw stderr lines; claude-code doesn't use it.
}
/**
 * Detect whether a tool-call name refers to `render_component`,
 * accepting both the bare tool name and the MCP-prefixed form
 * (`mcp__<server>__render_component`) that Claude Code emits when the
 * call is routed through its MCP wrapper.
 */
function isRenderComponentCall(name: unknown): boolean {
  if (typeof name !== 'string' || name.length === 0) return false;
  if (name === 'render_component') return true;
  // MCP namespacing: `mcp__<server>__<tool>`. The server segment can
  // contain dashes (e.g. `genicui-prod`), so allow any non-empty
  // server name. Tail match avoids false positives like
  // `not_render_component`.
  return /^mcp__[^_]+(?:_[^_]+)*__render_component$/.test(name);
}

/**
 * Bridge a `render_component` tool call from a provider into the
 * GenicUI component store, then broadcast a `COMPONENT_MOUNTED` frame
 * on the new component's channel.
 *
 * Mirrors `poc/server/index.mjs`'s `render_component` MCP tool handler
 * but routes the response over WebSocket instead of MCP stdio — the
 * playground listens for `COMPONENT_MOUNTED` and mounts the component.
 *
 * Falls back to MCP stdio via the `renderComponent()` helper from
 * `mcp/render-handler.ts` so the validation, props schema check, and
 * componentStore registration all stay in one place.
 */
function bridgeRenderComponent(
  session: WsSession,
  args: Record<string, unknown>,
): void {
  const name = typeof args['componentName'] === 'string'
    ? args['componentName']
    : typeof args['name'] === 'string'
      ? args['name']
      : '';
  const props = (args['props'] && typeof args['props'] === 'object')
    ? (args['props'] as Record<string, unknown>)
    : {};
  const layout = typeof args['layout'] === 'string' ? args['layout'] : undefined;

  if (!name) {
    console.error(
      `[chat] bridge render_component: missing componentName in session ${session.sessionId}`,
    );
    return;
  }

  const renderInput: {
    name: string;
    props: Record<string, unknown>;
    layout?: string;
  } = { name, props };
  if (layout !== undefined) renderInput.layout = layout;
  const result = renderComponent(renderInput);

  if (result.error) {
    console.error(
      `[chat] bridge render_component failed (${result.error.code}): ${result.error.message}`,
    );
    return;
  }

  // Broadcast COMPONENT_MOUNTED on the component's channel. We use the
  // channel-multiplexer (not direct elysiaWs.send) so frame ordering,
  // session recovery (F33), and the session buffer all see it.
  const frame = {
    v: 1 as const,
    channel: result.channel,
    type: 'COMPONENT_MOUNTED',
    payload: {
      componentId: result.componentId,
      channel: result.channel,
      name: result.name,
      schema: result.schema,
      initialState: result.initialState,
    },
    seq: session.seqGenerator.next(),
  };

  const dispatch = session.multiplexer.dispatchServerFrame(frame);
  if (dispatch === null) {
    console.error(
      `[chat] bridge render_component: channel limit exceeded for session ${session.sessionId}`,
    );
    return;
  }
  for (const out of dispatch.frames) {
    session.elysiaWs.send(serializeFrame(out));
  }

  console.error(
    `[chat] bridged render_component -> ${name} componentId=${result.componentId} (channel=${result.channel})`,
  );
}

/**
 * Broadcast a successful `renderComponent()` result to every connected
 * WebSocket session.
 *
 * Used by the stateless `/mcp` HTTP endpoint in `index.ts`: an MCP
 * client calling `render_component` directly gets the JSON-RPC
 * response back, but no WS client would otherwise learn about the new
 * component. This helper delivers a `COMPONENT_MOUNTED` frame to each
 * live session's channel multiplexer (so ordering, session recovery,
 * and the session buffer all see it — same path `bridgeRenderComponent`
 * uses in the chat pipeline).
 *
 * Each session gets its own seq value pulled from that session's
 * `seqGenerator`, so per-session sequence order is preserved even
 * when broadcasting to many sockets at once.
 *
 * @param result — Render result from `renderComponent()`. Must be a
 *   successful result (no `error` field).
 * @returns Number of sessions the frame was delivered to.
 */
export function broadcastComponentMountedAll(result: RenderResult): number {
  const delivered = broadcastToAllSessions((session) => ({
    v: 1 as const,
    channel: result.channel,
    type: 'COMPONENT_MOUNTED',
    payload: {
      componentId: result.componentId,
      channel: result.channel,
      name: result.name,
      schema: result.schema,
      initialState: result.initialState,
    },
    seq: session.seqGenerator.next(),
  }));
  if (delivered > 0) {
    console.error(
      `[mcp] broadcast render_component -> ${result.name} componentId=${result.componentId} ` +
        `(channel=${result.channel}, sessions=${delivered})`,
    );
  }
  return delivered;
}

/**
 * Send a `chat.event` frame carrying one parsed event to the client.
 */
function sendChatEvent(session: WsSession, event: ChatEvent): void {
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.event',
    payload: { event },
    seq: session.seqGenerator.next(),
  };
  session.elysiaWs.send(serializeFrame(frame));
}

/**
 * Send a `chat.complete` frame to signal the turn has settled.
 */
function sendChatComplete(session: WsSession, reason: 'complete' | 'error'): void {
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.complete',
    payload: { reason, timestamp: new Date().toISOString() },
    seq: session.seqGenerator.next(),
  };
  session.elysiaWs.send(serializeFrame(frame));
}

/**
 * Send a `chat.error` frame to the client.
 *
 * @param session — the WebSocket session
 * @param error — the error message
 */
function sendChatError(session: WsSession, error: string): void {
  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.error',
    payload: { error },
    seq: session.seqGenerator.next(),
  };
  session.elysiaWs.send(serializeFrame(frame));
}
