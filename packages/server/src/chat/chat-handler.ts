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
  killActiveSubprocess,
  consumeClickKill,
  setChatResumeContext,
  getChatResumeContext,
} from './chat-session-registry.js';
import { renderComponent, type RenderResult } from '../mcp/render-handler.js';
import {
  unwrapMcpArrays,
  unwrapMcpArrayProps,
} from '../validation/unwrap-mcp-arrays.js';

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
 * Tag identifying the source of a turn for log diagnostics. Not part
 * of the wire protocol — purely so server-side logs can tell a fresh
 * user-typed turn from a synthetic follow-up triggered by a
 * component event.
 */
export type TurnSource = 'chat.message' | 'component_event';

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
 *
 * Exported so `handleChatComponentEvent` can resume the Claude
 * session with a synthesized follow-up prompt (F43). When
 * `overridePrompt` is supplied, it takes precedence over the
 * `message.prompt` so the component-event path can describe the
 * click without needing a real user-typed prompt in the registry.
 *
 * `source` is log-only; the wire protocol is identical regardless.
 */
export async function runChatTurn(
  session: WsSession,
  message: ChatMessage,
  adaptor: ReturnType<typeof getProviderAdaptor> & object,
  options: {
    overridePrompt?: string;
    source?: TurnSource;
  } = {},
): Promise<void> {
  // Make sure the session is registered before the subprocess emits
  // anything (otherwise the first `status/init` event can't be linked
  // to the session for --resume on the next turn).
  createChatSession(session.sessionId);

  // F43: snapshot the provider/prompt context so a subsequent
  // `chat.component_event` can resume this session with the same
  // provider config. Stored per-session and overwritten on every
  // turn so the latest user prompt wins.
  if (message.provider) {
    setChatResumeContext(session.sessionId, {
      providerId: adaptor.id,
      provider: message.provider,
      registry: message.registry,
      lastUserPrompt: message.prompt,
    });
  }

  const binary = adaptor.resolveBinary(message.provider!.config);
  const resumeId = getClaudeSession(session.sessionId);
  // F43: `overridePrompt` lets `handleChatComponentEvent` inject a
  // synthesized follow-up prompt describing the click instead of
  // re-running the user's original prompt. Falls back to the
  // chat.message payload otherwise.
  const effectivePrompt = options.overridePrompt ?? message.prompt;
  const args = [...adaptor.buildArgs({ resumeId }), '--', effectivePrompt];

  console.error(
    `[chat] spawning ${adaptor.id} for session ${session.sessionId}` +
      (resumeId ? ` (resume ${resumeId})` : '') +
      ` source=${options.source ?? 'chat.message'} ` +
      `prompt=${JSON.stringify(effectivePrompt).slice(0, 80)}…`,
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
  } else if (consumeClickKill(session.sessionId)) {
    // F47: the subprocess was deliberately killed by
    // `handleChatComponentEvent` to free the slot for a follow-up
    // turn that resumes the same Claude session. The non-zero
    // exit is *expected* — the user clicked a component inside the
    // chat bubble. Finalize the killed turn cleanly (no `chat.error`
    // banner in the UI) so the click flow feels intentional, not
    // like the agent crashed.
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
 * Normalize props arriving over the chat bridge before they hit the
 * component schema validator. Returns a new object — the input is not
 * mutated.
 *
 * The two most common shape mismatches are:
 *
 *  - **MCP-wrapped arrays** (`{ item: [...] }`). The MCP transport
 *    encodes arrays of objects with a single-key object wrapper so the
 *    tool signature stays valid JSON Schema. The render_component
 *    schema expects flat arrays, so we unwrap.
 *  - **Quoted scalars** (`pageSize: "10"`). Claude Code sometimes
 *    quotes integer-looking values that the schema expects as numbers.
 *    We coerce numeric strings back to numbers when the value parses.
 *
 * The implementation lives in `validation/unwrap-mcp-arrays.ts` so the
 * direct `render_component` MCP tool can apply the same normalization.
 * We keep the local `sanitizeBridge{Props,Value}` aliases so existing
 * call sites and the `__test_sanitizeBridge` re-export stay stable.
 *
 * @see {F43} — MCP Permissions + Prop Shape
 */
const sanitizeBridgeProps = unwrapMcpArrayProps;
const sanitizeBridgeValue = unwrapMcpArrays;

/**
 * Test-only export — the sanitizer's two entry points. Lets
 * unit tests verify each transform rule without going through the
 * full bridge pipeline. Not part of the public surface.
 *
 * @internal
 */
export const __test_sanitizeBridge = {
  props: sanitizeBridgeProps,
  value: sanitizeBridgeValue,
};

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
  const rawProps = (args['props'] && typeof args['props'] === 'object')
    ? (args['props'] as Record<string, unknown>)
    : {};
  const layout = typeof args['layout'] === 'string' ? args['layout'] : undefined;

  if (!name) {
    console.error(
      `[chat] bridge render_component: missing componentName in session ${session.sessionId}`,
    );
    return;
  }

  // Sanitize bridge-side props before validation. The MCP-direct trust
  // boundary (`packages/server/src/mcp/render-handler.ts::validateProps`)
  // still rejects malformed input — but the chat bridge receives wire
  // shapes from Claude Code that aren't always JSON-Schema-clean:
  //
  //   1. MCP arrays are encoded as `{ item: [...] }` per the MCP spec
  //      when they survive a tool_use ↔ tool_result round-trip. Our
  //      component schemas (e.g. DataTable.rows) expect a flat array.
  //   2. Stringified numbers (`"10"` for `pageSize: 10`) appear when
  //      Claude Code quotes scalar values that should be integers.
  //
  // Without sanitization, the bridge returns -32003, Claude Code's MCP
  // loop retries the same bad payload up to ~25 times, and the user
  // perceives this as "the table takes forever to render." The POC
  // didn't see this because its `McpBridge` *was* the renderer — the
  // schema validation happened once, on the server, before Claude Code
  // ever saw a tool result.
  const props = sanitizeBridgeProps(rawProps);

  const renderInput: {
    name: string;
    props: Record<string, unknown>;
    layout?: string;
  } = { name, props };
  if (layout !== undefined) renderInput.layout = layout;
  const result = renderComponent(renderInput);

  if (result.error) {
    console.error(
      `[chat] bridge render_component failed (${result.error.code}): ${result.error.message}` +
        (result.error.details?.length ? ` | details=${JSON.stringify(result.error.details)}` : ''),
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

/**
 * Send a `chat.event` frame whose payload `event.type` is `user_event`.
 *
 * This is the server-side analog of the synthetic user bubble the
 * chat client renders when an embedded component fires
 * `chat.component_event`. We emit it BEFORE the follow-up turn's
 * `chat.complete`/`chat.error` so the user sees the click reflection
 * before the agent's response.
 *
 * The `event.data` shape mirrors what the playground's `useChat`
 * composable expects: `{ componentId, name, action, payload }`. The
 * summary line is precomputed here so the client can render the
 * bubble without inspecting `data` directly.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
function sendChatUserEvent(
  session: WsSession,
  payload: {
    componentId: string;
    name?: string;
    action: string;
    payload?: Record<string, unknown>;
  },
): void {
  // F43 exactOptionalPropertyTypes: build the data object
  // conditionally so `undefined` fields are stripped (rather than
  // serialized as the explicit string "undefined").
  const data: Record<string, unknown> = {
    componentId: payload.componentId,
    action: payload.action,
  };
  if (payload.name !== undefined) data['name'] = payload.name;
  if (payload.payload !== undefined) data['payload'] = payload.payload;

  const frame = {
    v: 1 as const,
    channel: '__chat__',
    type: 'chat.event',
    payload: { event: { type: 'user_event', data } },
    seq: session.seqGenerator.next(),
  };
  session.elysiaWs.send(serializeFrame(frame));
}

/**
 * Build the synthetic prompt we send to Claude when the user
 * interacts with a chat-embedded component. The prompt is structured
 * so the agent can reason about it without needing to inspect prior
 * chat history: it names the component, the action, and includes the
 * payload as JSON so numeric / structural details are preserved.
 *
 * Example output:
 *   [component_event] user triggered "submit" on component
 *   "InputPair" (id=cp-1) with payload {"input1":5,"input2":3}.
 *   The previous component is still mounted in the chat. Continue
 *   the conversation by rendering a follow-up component or responding
 *   to the user.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
function synthesizeComponentEventPrompt(
  componentId: string,
  name: string | undefined,
  action: string,
  detail: Record<string, unknown> | undefined,
): string {
  const componentLabel = name && name.length > 0 ? `"${name}"` : '(unnamed)';
  const idLabel = `(id=${componentId})`;
  const payloadStr =
    detail && Object.keys(detail).length > 0 ? JSON.stringify(detail) : '{}';
  return (
    `[component_event] user triggered "${action}" on component ${componentLabel} ` +
    `${idLabel} with payload ${payloadStr}. ` +
    `The previous component is still mounted in the chat. ` +
    `Continue the conversation by rendering a follow-up component or ` +
    `responding to the user.`
  );
}

/**
 * The synchronous portion of `handleChatComponentEvent`: given the
 * resume context for the session, produce the follow-up ChatMessage
 * + the synthesized prompt string that `runChatTurn` will use.
 *
 * Exported as a `__test_*` helper so unit tests can verify the
 * prompt structure without having to spawn a real CLI subprocess.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export function __test_buildFollowUpContext(
  resumeContext: ResumedChatEntry,
  componentId: string,
  name: string | undefined,
  action: string,
  detail: Record<string, unknown> | undefined,
): { followUp: ChatMessage; synthesizedPrompt: string } {
  const followUp: ChatMessage = {
    prompt: resumeContext.lastUserPrompt,
    registry: resumeContext.registry,
    provider: resumeContext.provider,
  };
  return {
    followUp,
    synthesizedPrompt: synthesizeComponentEventPrompt(
      componentId,
      name,
      action,
      detail,
    ),
  };
}

/**
 * Build the user_event `chat.event` payload that mirrors what the
 * playground's `useChat.user_event` handler expects. Exposed as a
 * test helper so unit tests can assert the wire shape without
 * depending on the send-side effects of `sendChatUserEvent`.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export function __test_buildUserEventData(
  componentId: string,
  name: string | undefined,
  action: string,
  detail: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const data: Record<string, unknown> = { componentId, action };
  if (name !== undefined) data['name'] = name;
  if (detail !== undefined) data['payload'] = detail;
  return data;
}

/**
 * Handle a `chat.component_event` frame from the client. The user
 * just interacted with a mounted component inside the chat bubble
 * (e.g. clicked Submit on an InputPair).
 *
 * Flow:
 *   1. Validate the payload — must have `componentId` and `action`.
 *   2. Require an existing Claude session id (`--resume <id>`). If the
 *      client hasn't sent a `chat.message` yet, there's no Claude
 *      session to resume — reply with `chat.error`.
 *   3. Kill any in-flight subprocess so we can resume the same
 *      Claude session with a synthetic follow-up prompt.
 *   4. Broadcast a `user_event` chat event so the client renders the
 *      synthetic user bubble BEFORE the next turn's events land.
 *   5. Reuse the previously-sent provider config to spawn the next
 *      turn with the synthesized prompt and `--resume <id>`.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
export async function handleChatComponentEvent(
  session: WsSession,
  rawPayload: Record<string, unknown> | unknown,
): Promise<void> {
  // Defensive: tolerate any payload shape the client sends. We only
  // pull out the documented fields and discard the rest.
  const payloadObj = (rawPayload && typeof rawPayload === 'object')
    ? (rawPayload as Record<string, unknown>)
    : {};

  const componentId =
    typeof payloadObj['componentId'] === 'string' && payloadObj['componentId'].length > 0
      ? (payloadObj['componentId'] as string)
      : '';
  const action =
    typeof payloadObj['action'] === 'string' && payloadObj['action'].length > 0
      ? (payloadObj['action'] as string)
      : '';
  const name =
    typeof payloadObj['name'] === 'string' && payloadObj['name'].length > 0
      ? (payloadObj['name'] as string)
      : undefined;
  const detail =
    payloadObj['payload'] && typeof payloadObj['payload'] === 'object'
      ? (payloadObj['payload'] as Record<string, unknown>)
      : undefined;

  if (!componentId) {
    sendChatError(session, 'component_event: missing componentId');
    return;
  }
  if (!action) {
    sendChatError(session, 'component_event: missing action');
    return;
  }

  // No Claude session id means the user hasn't sent a chat.message
  // yet — there's no conversation to resume. The PoC and the
  // playground both surface this as a recoverable error rather than
  // silently dropping the click.
  const claudeSessionId = getClaudeSession(session.sessionId);
  if (!claudeSessionId) {
    sendChatError(
      session,
      'No active Claude session for this WebSocket — please send a chat.message first',
    );
    return;
  }

  // Kill the in-flight subprocess (if any) so the synthesized
  // prompt can take over the same Claude session id. We await the
  // kill to make sure no stray stdout leaks into the next turn.
  await killActiveSubprocess(session.sessionId);

  // Broadcast the synthetic user bubble BEFORE spawning the
  // follow-up turn so the user_event arrives ahead of the next
  // ai_text / tool_call frames. Build conditionally so we don't
  // trip exactOptionalPropertyTypes on undefined name/payload.
  const userEventPayload: {
    componentId: string;
    action: string;
    name?: string;
    payload?: Record<string, unknown>;
  } = { componentId, action };
  if (name !== undefined) userEventPayload.name = name;
  if (detail !== undefined) userEventPayload.payload = detail;
  sendChatUserEvent(session, userEventPayload);

  // Look up the provider that ran the original turn. If the session
  // has no chat entry yet (extremely rare — only if the kill cleared
  // it), we can't resume without a provider. Bail with chat.error.
  const sessionEntry = getChatResumeContext(session.sessionId);
  if (!sessionEntry) {
    sendChatError(
      session,
      'component_event: chat session lost between turns; please retry',
    );
    return;
  }

  const adaptor = getProviderAdaptor(sessionEntry.providerId);
  if (!adaptor) {
    sendChatError(session, `Unknown provider: ${sessionEntry.providerId}`);
    return;
  }

  // Build the synthesized prompt and follow-up ChatMessage shell.
  // The `overridePrompt` argument carries the click-description
  // prompt; the ChatMessage carries the provider config so
  // `runChatTurn` doesn't need to re-resolve it.
  const { followUp, synthesizedPrompt } = __test_buildFollowUpContext(
    sessionEntry,
    componentId,
    name,
    action,
    detail,
  );

  await runChatTurn(session, followUp, adaptor, {
    overridePrompt: synthesizedPrompt,
    source: 'component_event',
  });
}

/**
 * Snapshot of per-session state needed by `handleChatComponentEvent`
 * to resume a Claude turn with the right provider config and
 * original user prompt. Defined and stored in `chat-session-registry.ts`;
 * re-exported here so callers can use the typed accessor without a
 * second import.
 */
export type { ResumedChatEntry } from './chat-session-registry.js';
