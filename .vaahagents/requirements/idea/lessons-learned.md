# GenicUI PoC — Lessons Learned

This doc captures what building the PoC taught us that isn't obvious from the design docs ([architecture.md](./architecture.md), [adaptor-spec.md](./adaptor-spec.md), [agent-protocol.md](./agent-protocol.md), [four-agnostic.md](./four-agnostic.md)) or the code.

It's a candid record: the bugs we hit and didn't hit, the design choices we reversed, and the constraints we discovered after committing to them. Future work on the contract surface should read this before extending the design.

Each section follows the same shape: **what we built**, **what broke**, **what we learned**, **what it means for the four-agnostic contract**.

---

## 1. Multi-turn SSE delivery — the `complete` event trap

### What we built

The chat backend has a `ChatBroadcaster` (per-session event emitter) and an SSE generator (`sseEventGenerator`) that subscribes to it. Every chat turn spawns `claude --print`, parses its `stream-json` stdout into typed events (`ai_text`, `tool_call`, `tool_result`, `complete`), and pushes them through the broadcaster. The browser subscribes once via `EventSource` and gets every turn's events on the same stream.

### What broke

Second-turn events never reached the browser. After the first turn ended and emitted `complete`, the next user message got a successful POST response (`202 Accepted`, `claude --print` spawned, subprocess exited cleanly), but the browser saw nothing new in the transcript.

### Root cause

`broadcaster.close(sessionId, 'complete')` set `session.closed = true`. The next turn's `broadcaster.push()` checked `if (session.closed) return;` and dropped every event on the floor.

Two assumptions in tension:

- The SSE generator wanted `close()` to mean "wind down this generator" — which is what its original code did (the `while` loop broke on terminal events).
- The chat model wanted `complete` to mean "this turn settled, ready for the next" — which means the session should stay push()-able across turns.

We had welded both meanings to the same flag.

### What we tried that didn't work

1. **Removing the `closed` lock on `close()`.** This made `push()` work across turns, but `complete` was now pushed *twice* — once as a pushed event, once via `close()` — confusing subscribers.
2. **Adding `if (event.type === 'complete') return;` guards in subscribers.** That would have leaked the special case into every subscriber and broken any subscriber that wanted to know "the turn is done."

### The actual fix

Two changes, both small:

```js
// chat-broadcaster.mjs — close() no longer locks
close(sessionId, reason = 'complete') {
  if (!this._sessions.has(sessionId)) return;
  if (this._sessions.get(sessionId).closed) return;
  this.emit(sessionId, { type: reason, reason });
  // Schedule cleanup after 30s of inactivity, do NOT set closed.
  if (!this._cleanupTimers.has(sessionId)) {
    setTimeout(() => this._sessions.delete(sessionId), 30_000).unref?.();
  }
}

// chat-handler.mjs — drop the redundant close() in handleLine
case 'complete':
  // The `complete` event was already pushed via the generic event
  // branch above. The subprocess's child.on('close') still calls
  // close() as a fallback if the JSON path didn't yield one.
  break;
```

Combined: `complete` is pushed exactly once (as a normal event in the JSON path), `close()` emits a terminal event without locking the session, and the SSE generator loops forever (no `break` on terminal events) — only the `finally { unsubscribe(); }` block tears it down when the browser disconnects.

### What it means for the contract

The four-agnostic doc's `AgentProvider` interface treats `complete` as a normalized event. That's the right shape — *but* every provider implementation must guarantee `complete` is emitted exactly once per turn, and the chat-handler must not double-emit it. The fix lives at the provider-handler boundary, not in subscribers.

**Contract lesson:** A normalized event stream is only useful if the producer is responsible for the lifecycle of terminal events. Subscribers should never have to filter duplicates.

---

## 2. Submit button design — why per-component, not per-adaptor or per-turn

### What we built

Each mounted component gets a `<button class="comp-submit">Submit to Claude</button>` rendered directly below it in the chat transcript. Clicking it:

1. Reads the component's local state (the browser holds `localState` keyed by `componentId`).
2. Calls the adaptor's `summarize(state)` helper to produce a human-readable description.
3. POSTs a `[User submitted <ComponentName> (<id>)] <summary>` message to `/chat/sessions/:id/messages`.
4. The chat backend spawns the next agent turn with that summary as the prompt.

### The design question we hit first

> "How does the user's interaction with a component drive an agent turn?"

Three answers we considered:

| Option | Behavior | Trade-off |
|---|---|---|
| **Per-click** | Every click spawns a turn | Wakes the agent on every micro-click. Noisy, expensive, slow UX. |
| **Per-adaptor** | The component author declares "submit semantics" | Pushes complexity into every component; same component behaves differently across journeys. |
| **Per-mount** | Each mounted component has a Submit button | The user controls when the agent runs; the component just exposes its state. |

We went with per-mount. The argument that won: **the user knows when they want a response.** The component doesn't. The journey doesn't either — "I want to think for a minute before asking" is a per-user decision, not a per-component or per-journey one.

### What broke

The first iteration assumed the WebSocket bridge could ship state. It can't — it ships HTML. So the browser needed its own state to summarize. We added a fourth argument to every adaptor `wire()`:

```js
// Before
function wire(el, props, onAction) { ... }

// After
function wire(el, props, onAction, setState) {
  const update = setState || (() => {});
  // Click handler: update local state, mutate DOM optimistically,
  // emit action to server.
  el.querySelector('[data-act="increment"]').onclick = () => {
    update((s) => {
      const next = { ...s, value: (s.value ?? props.value ?? 0) + 1 };
      el.querySelector('.gu-counter-value').textContent = next.value;
      return next;
    });
    onAction({ action: 'increment', payload: { step: 1 } });
  };
}
```

The `setState` argument is optional and backward-compatible — old adaptors that don't accept it still work; the framework just won't have local state to summarize.

### What broke after that

Even with local state, the *summary* needs to be component-specific. Counter says "current value: 7", CartViewer says "3 line items, subtotal $1,247.00", TodoList says "5 items, 2 pending". Adding a single `summarize` to the registry isn't enough — each component needs its own.

So we added a `summarize(state)` helper per adaptor, exported alongside `seedState(props)` (initial state from props) and `getState(props, html)` (state from rendered DOM). All three are component-specific. All three are optional — adaptors that don't define them get sensible defaults from `base-adaptor.mjs`.

### What it means for the contract

The Submit button's existence is a **component-level decision**, not an action-level one. The component author knows whether the component holds state worth summarizing (Counter: yes; DrillCard's "Add to cart": no — the cart is the answer).

In the four-agnostic doc, this is captured by `schema.hasSubmit` (default `true`). It's the component author's declaration: "after the user interacts with me, they might want to ask the agent about *the state I've accumulated*." If `false`, no Submit button. The framework never adds one automatically.

**Contract lessons:**
- **State lives where it's cheapest.** Browser-side state for browser-side interactions; server-side state for shared/cross-component state. The PoC does both (`localState` Map on browser, `lifecycle` Map on server).
- **`summarize()` is per-component, not generic.** There's no universal "describe this state" — the description is what makes the agent's next turn useful.
- **The framework shouldn't decide when the agent runs.** Submit is the *user's* affordance. The framework's role is to make the affordance available, not to invoke it.

---

## 3. Provider abstraction — why it emerged from necessity, not design

### What we built

`chat-handler.mjs`'s `runChatTurn` directly spawns `claude --print` with hardcoded flags:

```js
const args = [
  '--print', '--output-format', 'stream-json', '--verbose',
  '--permission-mode', 'auto', '--mcp-config', mcpConfigPath,
  ...(resumeId ? ['--resume', resumeId] : []),
  '--', prompt,
];
const child = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
```

The parser (`chat-parser.mjs`) knows Claude's `stream-json` shape by heart:

```js
case 'assistant': ... → 'ai_text'
case 'tool_use': ...   → 'tool_call'
case 'result': ...     → 'status'
```

The broadcaster tracks Claude-specific session ids in `_claudeSessions`.

### Why this is a problem

Adding Codex as a second provider would require:
- Different CLI flags (`codex exec --json --mcp-config <path> --thread <id>` or whatever its actual invocation is).
- A different stdout format to parse.
- A different session-resume mechanism (likely `--thread` not `--resume`).
- A different MCP discovery flag (Codex may not support `--mcp-config` at all).

All of that would have to be interleaved with the existing Claude path inside `runChatTurn`. The function would grow conditional branches on `process.env.GENICUI_PROVIDER`. Eventually it would be a mess.

### The abstraction that emerged

The cleanest split:

```
┌─────────────────┐
│  chat-handler   │  — knows about sessions, broadcaster, the agent loop
│                 │
│  ┌───────────┐  │
│  │ Provider  │  │  — knows about Claude's CLI flags + stdout format
│  │  claude   │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ Provider  │  │  — knows about Codex's CLI flags + stdout format
│  │  codex    │  │
│  └───────────┘  │
└─────────────────┘
```

Each provider implements one method:

```js
async *run({ prompt, resumeId, mcpConfigPath, providerOpts }) {
  // spawn, parse, yield GenicUIEvent ...
}
```

And owns its own stdout parser. The chat-handler never sees the provider's native format.

### What this taught us about the contract

The four-agnostic doc's `AgentProvider` interface came out of asking "what's the minimum the chat-handler needs to know?" The answer: just `run()` and `extractResumeId()`. Everything else — flags, format, MCP discovery — is the provider's problem.

**Critical realization:** the abstraction is *underneath* the broadcaster/SSE pipeline, not above it. The browser-side protocol (SSE event shapes) doesn't change when providers change. That's what makes the abstraction safe — swapping providers is a server-side deployment concern, never a client-visible change.

### What's still missing

We haven't built a non-Claude provider yet. The abstraction is in the doc but not the code. When we do, we should expect:
- Codex may not support all the MCP features Claude does. The `mcpServerUrl` fallback in `AgentProvider.run()` exists for this.
- Some providers may not have a resume-id concept at all (hosted APIs with stateless requests). `extractResumeId()` returning `null` is fine — the chat just won't have cross-turn memory.
- Provider-specific options (`providerOpts`) will grow. Resist the urge to add provider-conditional logic to chat-handler; push it into the provider class.

**Contract lesson:** The interface between provider and handler is the set of normalized events + the resume-id round-trip. Anything beyond that is provider-specific and should live in the provider class. If you find yourself adding `if (provider === 'claude')` to the chat-handler, the abstraction has leaked.

---

## 4. Cross-cutting plumbing — CORS, SSE, WebSocket bridge

These weren't design decisions so much as things the static-file chat surface forced us to confront. Each was a half-day of debugging.

### CORS

The chat surface serves from `:8080` (Python `http.server`); the chat API lives on `:9877` (Node MCP server). Every fetch from the browser is cross-origin.

`EventSource` ignores CORS (it can't send custom headers), so the SSE stream works without configuration. But `fetch()` with `Content-Type: application/json` on the POST `/messages` endpoint triggers a preflight that we initially didn't handle — the browser silently dropped the request, and `appendMessage` never ran.

Fix: add `Access-Control-Allow-Origin`, `Allow-Methods`, `Allow-Headers`, `Vary: Origin` to every chat route, plus an OPTIONS preflight handler. About 10 lines.

**What it means for the contract:** any deployment where the chat surface and the chat backend are on different origins needs CORS configured. The framework should provide this by default for `localhost`-style dev; production deployments will need their own policy.

### SSE buffering

Node's HTTP response buffers writes by default. We saw `ai_text` events arrive at the browser in 4KB chunks instead of as-typed, making the streaming UX feel chunky.

Fix: send `X-Accel-Buffering: no` (turns off nginx-style buffering for proxies) and `Cache-Control: no-cache`. For dev that's enough; production needs the proxy configured to honor the header.

### EventSource auto-reconnect

`EventSource` automatically reconnects on connection drop. We saw it reconnect after a `complete` event, which (combined with the multi-turn SSE bug from §1) made the second-turn events appear to "not arrive."

After the §1 fix, the SSE generator loops forever on the same connection — `EventSource` stays connected, no reconnect happens. Good.

But if the *server* restarts mid-conversation, the browser reconnects and gets a new session id, losing the conversation. The PoC accepts this; production would need session resumption at the HTTP layer (the chat session id is server-issued, not client-stored).

### WebSocket bridge ships HTML, not state

The bridge is dumb by design: it forwards `render` and `update` messages with `innerHTML` payloads. It has no idea what components are mounted, no idea what state they're in, no idea what actions have been emitted.

This is exactly right for a stateless transport, and it forced us to confront "where does state live?" head-on. The answer: state lives wherever it's cheapest. Browser-side for browser-side interactions (the local `localState` Map). Server-side for shared/cross-component state (the `lifecycle` Map + the proposed session store). The bridge just moves pixels.

**What it means for the contract:** any feature that requires "the bridge knows about state" is a smell. If the framework needs to know something, it should be in the broadcaster (server-side, in-memory) or in the browser's local state. The bridge moves HTML; everything else lives somewhere with a reason.

### Adapter discovery

The PoC has three components (Counter, TodoList, CartViewer) registered manually in `poc/adaptors/index.mjs`. `find_ui_component("drill")` returns "No matching component found" because there's no DrillCard adaptor.

The lesson: the framework's discovery is only as good as the registry. A registry with three components supports three journeys. A registry with thirty supports thirty. There's no clever algorithm that substitutes for actually authoring the adaptors.

---

## 5. Things we got right the first time

A few decisions held up without iteration:

- **The `EventEmitter`-based broadcaster.** Per-session `EventEmitter` + per-subscriber queue + async generator for SSE was right from the first commit. The only thing that changed was the `close()` semantics (§1).
- **The `onAction` callback signature.** `{ action, payload }` round-trips cleanly through the WebSocket and back as a structured event. No component has needed anything more.
- **The `schema.actions[]` array.** Declaring actions up front in the schema is what makes the agent's system prompt coherent. Without it, the agent would have to guess what each component does. The four-agnostic doc's `sideEffects` is a backward-compatible extension on top.
- **The MCP transport choice.** Using MCP (vs a custom protocol) means any agent that supports MCP works. That's why provider-agnosticism is plausible — we're not welded to Claude at the protocol layer, only at the CLI invocation.

---

## 6. What we'd do differently next time

- **Build the session store from day one.** The PoC threads state through `lifecycle` (componentId → props) and `localState` (componentId → browser state). A session-scoped `Map<sessionId, Map<key, value>>` would have unified these and made the ecom journey (§6 of `four-agnostic.md`) implementable without further plumbing.
- **Make `resolveProps` part of the initial adaptor interface.** CartViewer wants to read the live cart. The PoC makes the agent pass items explicitly; the four-agnostic doc adds `resolveProps` as a hook. In hindsight, `resolveProps` should have been there from the start — every realistic component will need it.
- **Decide `hasSubmit` semantics before shipping Submit.** We shipped the button first, then realized the visibility rule is component-specific. The doc captures this; the code defaults to `true` everywhere. A registry-time config (`Counter: hasSubmit true`, `DrillCard: hasSubmit false`) would have been cleaner.
- **Test multi-turn conversations explicitly.** The §1 bug existed because tests only exercised single-turn flows. The chat-smoke regression test we added catches it, but a per-PR test would have caught it before merge.

---

## 7. Testing the PoC — what E2E and unit tests taught us

### What we built

A three-layer test suite covering the PoC:

- **Unit tests** for `BaseAdaptor.validateProps`, `ComponentRegistry`, `ComponentLifecycle`, `ChatBroadcaster`, and `ChatParser` (Bun test, 6 files).
- **Integration tests** that exercise the full tool flow: `find_ui_component → render_component → update → unmount` across real registry and lifecycle modules.
- **E2E tests** (Playwright) that drive the browser chat surface, the WebSocket bridge, and the SSE chat API through real HTTP/WebSocket connections.

### What broke

1. **E2E tests need the server running.** The first attempt to run Playwright tests failed because the PoC server wasn't started. We added `e2e/global-setup.mjs` that spawns both the static web server (`python3 -m http.server 8080`) and the MCP server (`node poc/server/index.mjs`), then polls until both are ready. Teardown kills them via stored PIDs in `e2e/.server.pids`.

2. **WebSocket messages can't be injected from Playwright.** The browser's WebSocket is in module scope, not a global. Playwright can't send messages directly to it. Instead, we verify the infrastructure is in place (DOM elements exist, status shows connected) and defer detailed WebSocket message tests to server-side integration tests.

3. **SSE streams never end.** Playwright's `request.get()` waits for the response to finish, which SSE never does. We had to use `page.evaluate()` with `fetch()` + `AbortSignal.timeout()` to verify the SSE endpoint returns the right headers without waiting for the stream to end.

### What we learned

- **Test the right thing at the right layer.** Component rendering is best tested server-side (integration tests with real registry/lifecycle). Browser E2E is best at verifying the chat UI, DOM structure, and user interactions. The bridge WebSocket messages are tested server-side, not browser-side.
- **Property-based testing for validators.** `BaseAdaptor.validateProps` has many edge cases (type validation, itemShape, required, optional, null). Enumerating them manually is error-prone; a future iteration should use `fast-check` to generate random props and validate against the schema.
- **The `complete` event multi-turn lesson (§1) should be a test.** We added `chat-broadcaster.test.mjs` that explicitly tests the multi-turn model: `close()` doesn't lock the session, `push()` works after `close()`, and terminal events are emitted correctly. This would have caught the §1 bug before merge.

### What it means for the contract

The test strategy doc ([testing-strategy.md](../specs/testing-strategy.md)) defines property tests, integration tests, and E2E smoke. The PoC tests now prove the approach works — unit tests catch validator bugs, integration tests catch flow bugs, and E2E tests catch browser bugs. The next step is property-based tests for the core modules (SequenceGenerator, JsonPatchEngine, genicSchema) as defined in the testing strategy.
---

## 8. Reading order for newcomers

If you're new to the codebase, read in this order:

1. **`poc/README.md`** — what the PoC is, how to run it.
2. **This doc** — what we learned building it (§1–§8).
3. **`docs/idea/architecture.md`** — the original design pitch (note: doesn't reflect §1 or §2).
4. **`docs/idea/four-agnostic.md`** — the contract surface for what's *next*.
5. **`docs/specs/testing-strategy.md`** — how we verify everything.
6. **The code** (`poc/server/`, `poc/adaptors/`, `poc/web/`) — small enough to read in one sitting.
7. **The tests** (`poc/server/*.test.mjs`, `e2e/*.spec.ts`) — small enough to read alongside the code.

The original docs (architecture, adaptor-spec, agent-protocol) are kept as the design pitch. Use this doc + four-agnostic.md to understand what's actually built and what's planned.
