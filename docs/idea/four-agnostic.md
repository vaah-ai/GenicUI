# GenicUI — The Four-Agnostic Design

This document describes the contract that lets GenicUI run any **journey** (ecommerce, support, hiring, dashboard), using any **component** (Counter, DrillCard, PrimeVue DataTable, hand-rolled HTML), rendered with any **library** (none, Vue, React, server templates), and powered by any **agent provider** (Claude Code, Codex, a hosted LLM, a self-hosted model).

The existing docs ([architecture.md](./architecture.md), [adaptor-spec.md](./adaptor-spec.md), [agent-protocol.md](./agent-protocol.md)) describe what's implemented today. This doc describes the *contract surface* that extends those docs so all four axes become pluggable — and the small additions that make the four-agnostic claims real.

The existing components (Counter, TodoList, CartViewer) and the existing tools (`find_ui_component`, `render_component`, `update_component`, `unmount_component`, `get_component_state`, `invoke_action`) keep working as-is. Everything below is additive: new optional fields on existing schemas, new optional hooks on existing adaptors, and one new MCP tool.

---

## 1. The four axes, stated precisely

### Journey-agnostic

The engine does not know whether the conversation is shopping for drills, filing a support ticket, evaluating job candidates, or exploring a metrics dashboard. Every behaviour the engine exposes — component discovery, mounting, action routing, event delivery, agent invocation — is domain-neutral. Journey-specific knowledge lives in two places only:

1. The component registry: which components are registered for this deployment.
2. The agent's system prompt: which tools to prefer, which subscriptions to declare, how to talk to the user.

Swap either of those and the same engine runs a different journey.

### Component-agnostic

The engine does not know whether a component is a Counter, a DrillCard, a PrimeVue DataTable, or a copy-pasted snippet from the design team. Every component is described by the same abstract shape: *props in, HTML out, actions out, state in.* The specifics live in the component's adaptor definition.

The contract is the adaptor interface in [adaptor-spec.md](./adaptor-spec.md). Library-agnosticism is a consequence of this: as long as the adaptor can produce HTML and wire DOM events to action callbacks, the engine is happy.

### Library-agnostic

The engine's transport to the browser carries HTML and event payloads — never framework-specific runtime (no Vue components, no React render trees, no PrimeVue classes in the protocol). Any library that can produce HTML markup can be wrapped. Adaptor authors deal with library quirks; the engine doesn't.

Concretely:

- The WebSocket bridge ships `innerHTML` strings, not framework runtimes.
- The browser mounts components by setting `innerHTML` and calling `wire()` to attach handlers.
- CSS scoping is the library's problem (PrimeVue's `unstyled: true` mode, scoped class names, or iframe sandboxing — pick one).

### Provider-agnostic

The chat backend speaks a normalized event stream (`ai_text`, `tool_call`, `tool_result`, `complete`, `error`). How that stream is *produced* is up to the agent provider. Today the only provider is `ClaudeProvider` (wrapping `claude --print`); the abstraction supports `CodexProvider`, `ApiProvider` (calling `claude.messages.create` over HTTP), or any future provider that yields the same event shapes.

The provider abstraction sits *under* the broadcaster/SSE pipeline. The agent-facing protocol does not change when the provider does.

---

## 2. The contract surface

Three declarations, one tool, four hooks. These are the only additions that the four-agnostic design requires. Everything else is implementation.

### 2.1 Component declaration

A component's schema gains two optional fields:

```ts
interface ComponentSchema {
  name: string;
  description: string;
  whenToUse: string[];
  category: ComponentCategory;
  inputSchema: z.ZodObject<any>;
  actions: ActionDefinition[];

  // NEW (optional)
  hasSubmit?: boolean;              // default: true. See §3.
  subscriptions?: string[];         // event names that trigger auto re-render. See §4.
}
```

The adaptor gains two optional hooks:

```ts
interface ComponentAdaptor {
  // ... existing schema, html, wire, getState ...

  // NEW (optional). Server-side data fetch. Called before html().
  // Lets CartViewer pull the live cart without the agent passing items.
  resolveProps?(props: PROPS, ctx: AdaptorContext): Promise<PROPS>;

  // NEW (optional). Server-side action handler. Called in parallel
  // with the click handler on the browser. Errors are surfaced as
  // a `system_reminder` block in the next agent turn.
  runAction?(action: string, payload: any, ctx: AdaptorContext):
    Promise<{ ok: boolean; data?: any; error?: string }>;
}
```

`AdaptorContext` is the engine's hand to the outside world:

```ts
interface AdaptorContext {
  sessionId: string;                 // browser-side chat session id
  componentId: string;               // mounted instance id
  fetch(url: string, init?: RequestInit): Promise<Response>;  // server-side HTTP
  store: KeyValueStore;              // session-scoped shared state. See §5.
}
```

### 2.2 Action declaration

Each action in `actions[]` gains a `sideEffects` field:

```ts
interface ActionDefinition {
  name: string;
  description: string;
  payload: Record<string, any>;

  // NEW (optional). Default: ['agent'].
  // What happens when the user fires this action:
  //   'local'   — component mutates its own DOM state only.
  //   'shared'  — write payload to the session store (see §5).
  //               Triggers `subscriptions` re-renders. The agent is NOT
  //               notified unless 'agent' is also listed.
  //   'agent'   — framework spawns an agent turn (or queues the event
  //               for the next agent turn, depending on the journey).
  // Multiple values: ['shared', 'agent'] = write to store AND notify agent.
  sideEffects?: Array<'local' | 'shared' | 'agent'>;
}
```

### 2.3 Provider declaration

A provider is any class implementing:

```ts
interface AgentProvider {
  /**
   * Run a single agent turn and yield normalized events.
   * @param opts.prompt          The user's prompt (typed or Submit summary)
   * @param opts.resumeId        Provider-native session id from previous turn, if any
   * @param opts.mcpConfigPath   For providers that load MCP via a config file
   * @param opts.mcpServerUrl    For providers that dial an HTTP MCP endpoint
   * @param opts.providerOpts    Provider-specific extras (model name, temperature, etc.)
   */
  run(opts: ProviderRunOpts): AsyncGenerator<GenicUIEvent>;
}

type GenicUIEvent =
  | { type: 'ai_text';       data: { text: string } }
  | { type: 'tool_call';     data: { name: string; input: any } }
  | { type: 'tool_result';   data: { name: string; output: any } }
  | { type: 'status';        data: { message: string } }
  | { type: 'user_message';  data: { content: string; role: 'user' } }
  | { type: 'system_reminder'; data: { events: Array<{ type: string; payload: any; ts: number }> } }
  | { type: 'complete';      reason?: string }
  | { type: 'error';         data: { error: string } };
```

The provider owns its own stdout-format parser. `ClaudeProvider` parses `stream-json`; `CodexProvider` parses whatever Codex emits; `ApiProvider` parses HTTP responses. The chat-handler never sees the provider's native format.

### 2.4 Subscription tool

One new MCP tool, scoped to the session:

```ts
subscribe_to_events({
  events: string[],           // ['add_to_cart', 'checkout_requested']
  until?: 'next_turn' | 'session_end'  // default: 'session_end'
})
```

Subscribed events are auto-attached to every subsequent agent turn as a `system_reminder` block:

```
[Subscribed events since your last turn:]
- 14:32:11 add_to_cart { productId: 'drill-42', qty: 1 }
- 14:33:47 checkout_requested {}
```

The agent sees them without any per-turn tool call. Subscriptions live in `broadcaster._subscriptions[sessionId]`; cleanup on session end.

---

## 3. Submit semantics

The Submit button exists at the *component* level, not the *action* level. Its visibility is governed by `schema.hasSubmit`, default `true`.

| `schema.hasSubmit` | When to set false |
|---|---|
| `true` (default) | Component holds state the user might want to ask the agent about independently of any specific action. Counter, CartViewer, Form. |
| `false` | Component is purely transactional; the user has no follow-up question. DrillCard's "Add to cart" button (after it ships its own `sideEffects: ['shared']` action, the cart is the answer — no need to "ask the agent about this click"). |

The framework *never* adds a Submit button automatically. The component author declares it.

When Submit is clicked:

1. The browser reads the component's local state via its adaptor.
2. Calls `adaptor.summarize(state)` to produce a human-readable string.
3. POSTs `{ content: '[User submitted <ComponentName> (<componentId>)]\n<summary>\n\n...' }` to `/chat/sessions/:id/messages`.
4. The chat backend spawns the agent (via the configured provider) with the summary as the prompt.

Submit is one mechanism; the `system_reminder` delivery (§4) is another. A component can declare `hasSubmit: true` *and* `sideEffects: ['shared', 'agent']` on its actions — the user can either click a button (auto-wake agent) or browse silently and hit Submit later (manual wake).

---

## 4. Subscription semantics

Subscriptions are how the framework delivers events to the agent *without* a Submit gate. They power two scenarios:

**Long-running flows:** The agent has finished its turn ("I've added the drill to your cart. Anything else?"). The user keeps clicking on other DrillCards. Each click writes to the session store. No agent wake. When the user finally types "do I have everything for a deck?" the next agent turn starts with a `system_reminder` listing the last 10 subscribed events since its last turn — so it can answer without `get_component_state` round-trips.

**Background-aware flows:** Some journeys want the agent to react immediately on specific events (a payment failure, an inventory drop, a real-time price change). The component's `sideEffects: ['shared', 'agent']` spawns an agent turn right then. The Submit button is hidden because the framework is already keeping the agent in the loop.

The agent declares its subscriptions once per session via `subscribe_to_events`. The framework records them and pre-pends matching events to every subsequent turn's context as a `system_reminder` block.

Component-side, `schema.subscriptions: ['add_to_cart', 'item_removed']` declares which events trigger this component's auto re-render. When the framework writes to the session store on one of those events, it re-renders every mounted component subscribed to it. This is how `CartViewer` automatically updates when a `DrillCard`'s `add_to_cart` fires.

### What the agent sees vs. what the user sees

| Action `sideEffects` | Browser updates | Session store | Subscribed components re-render | Agent sees (via subscription) | Agent runs |
|---|---|---|---|---|---|
| `['local']` | yes | no | no | no | no |
| `['shared']` | yes | yes | yes | yes (in next turn's reminder) | no |
| `['shared', 'agent']` | yes | yes | yes | yes (in next turn's reminder) | yes (spawned) |
| `['agent']` | no | no | no | no | yes (spawned) |

---

## 5. Session-scoped store

The store is a generic `Map<sessionId, Map<key, value>>` with a small API:

```ts
interface KeyValueStore {
  get<T>(key: string): T | undefined;
  set(key: string, value: any): void;
  delete(key: string): void;
  keys(): string[];
}
```

It's not a Cart specifically. The Cart is one consumer; a support ticket draft, a hiring shortlist, a dashboard's filter set are others. The store is per-session, in-memory, and lives on the server.

Three access points:

1. **`adaptor.runAction(payload, ctx)`** — `ctx.store.set('cart.items', [...])`.
2. **`adaptor.resolveProps(props, ctx)`** — `const items = ctx.store.get('cart.items') ?? [];` then return merged props.
3. **MCP tool `get_session_store({ keys?: string[] })`** — read-only access for the agent.

A component that wants to "remember across mounts" reads from the store. A component that wants to "be re-rendered when X changes" subscribes to the event that writes to that store key. The framework wires the rest.

---

## 6. Putting it together — the ecom journey

Walk the journey end-to-end against the contract:

1. **User opens chat.** Browser creates a chat session (`POST /chat/sessions`). The session has a server-side store and a broadcaster subscription list (empty).

2. **User types "show me drill".** Browser POSTs to `/chat/sessions/:id/messages`. The configured provider (`ClaudeProvider` today) runs a turn. Agent calls `find_ui_component("drill")`, gets the `DrillCard` adaptor. Calls `render_component("DrillCard", { products: [...] })`. The MCP handler calls `DrillCard.resolveProps(props, ctx)` if defined (no-op for this adaptor), then `DrillCard.html(mergedProps)` to produce markup, then ships it via WebSocket. The browser mounts it inline in the chat transcript.

3. **User clicks "Add to cart" on a drill.** The browser's wire handler calls `onAction({ action: 'add_to_cart', payload: { productId: 'drill-42', qty: 1 } })`. The action has `sideEffects: ['shared']`. The framework:
   - Updates the browser's local optimistic UI (the button shows "Added ✓").
   - Calls `DrillCard.runAction('add_to_cart', payload, ctx)` if defined — in our case, no runAction; the framework itself writes `ctx.store.set('cart.items', [...prev, payload])`.
   - Emits the `add_to_cart` event. Any mounted component with `subscriptions: ['add_to_cart']` re-renders (CartViewer, if mounted).
   - Agent is *not* notified. Submit is *not* shown on DrillCard (`hasSubmit: false`).

4. **User types "show trolley".** New turn. Agent calls `render_component("CartViewer")` with no items prop. The MCP handler calls `CartViewer.resolveProps({}, ctx)` which reads `ctx.store.get('cart.items')` and returns `{ items: [...], subtotal: ... }`. CartViewer renders with the live cart. No agent prompt needed for the data fetch.

5. **User clicks "−" on a cart item.** CartViewer's `item_removed` action has `sideEffects: ['shared']`. Framework updates the store, re-renders CartViewer (it's subscribed to `item_removed` — well, it's the same component; the framework re-runs resolveProps). Browser shows the new total. No agent.

6. **User clicks "Checkout".** The action has `sideEffects: ['shared', 'agent']`. Framework writes `cart.status = 'pending'` to the store, *and* spawns an agent turn. The agent runs, sees the cart via `get_session_store()`, and walks the user through payment confirmation. Submit not needed — the agent is already running.

7. **User clicks Submit on a CartViewer (hypothetical).** CartViewer has `hasSubmit: true`. The browser builds a summary: "Cart with 3 items, subtotal $1,247.00, status pending." Posts to `/messages`. New agent turn with that prompt. Agent reads the cart via `get_session_store()` and responds.

All four axes exercised:
- **Journey:** ecommerce. Swap the registry and prompt for "support" or "hiring" — same engine.
- **Component:** DrillCard, CartViewer. Both could be hand-rolled HTML or wrapped from PrimeVue. The engine doesn't know.
- **Library:** same. The DrillCard might use `<button class="gu-btn">` or `<Button severity="success">` from PrimeVue. The framework sees only the resulting HTML.
- **Provider:** Claude today. `CodexProvider` drops in with its own parser; `ApiProvider` calls `claude.messages.create()` instead of `claude --print`. The journey is identical.

---

## 7. What the agent provider abstraction looks like

The minimal provider base class:

```ts
// poc/server/providers/base.mjs
export class AgentProvider {
  /** Provider name (matches GENICUI_PROVIDER env var) */
  static name = 'base';

  /**
   * @param {object} opts
   * @param {string} opts.prompt
   * @param {string|null} opts.resumeId
   * @param {string|null} opts.mcpConfigPath
   * @param {string|null} opts.mcpServerUrl
   * @param {object} opts.providerOpts
   * @returns {AsyncGenerator<GenicUIEvent>}
   */
  async *run(opts) {
    throw new Error('not implemented');
  }

  /**
   * Extract a provider-native session id from a normalized event.
   * Called by the chat-handler to remember the resume id.
   */
  extractResumeId(event) {
    return null;
  }
}
```

`ClaudeProvider` is the current chat-handler logic, factored:

```ts
// poc/server/providers/claude.mjs
export class ClaudeProvider extends AgentProvider {
  static name = 'claude';

  async *run({ prompt, resumeId, mcpConfigPath, providerOpts }) {
    const args = [
      '--print', '--output-format', 'stream-json', '--verbose',
      '--permission-mode', 'auto',
      '--mcp-config', mcpConfigPath,
      ...(resumeId ? ['--resume', resumeId] : []),
      '--', prompt,
    ];
    const child = spawn(resolveClaudeBinary(), args, { ... });
    // ... existing parseOutputLine → GenicUIEvent logic ...
  }
}
```

`CodexProvider` would be similar, with its own parser for whatever Codex emits (likely its own JSON format). `ApiProvider` would skip `spawn` entirely and `for await` HTTP responses.

The chat-handler becomes:

```ts
// poc/server/chat-handler.mjs (simplified)
import { providers } from './providers/index.mjs';

export function runChatTurn(sessionId, prompt) {
  const providerName = process.env.GENICUI_PROVIDER || 'claude';
  const ProviderClass = providers[providerName];
  const provider = new ProviderClass();
  const resumeId = broadcaster.getProviderSession(sessionId);

  (async () => {
    try {
      for await (const event of provider.run({ prompt, resumeId, mcpConfigPath, providerOpts })) {
        broadcaster.push(sessionId, event);
        const newResume = provider.extractResumeId(event);
        if (newResume) broadcaster.rememberProviderSession(sessionId, newResume);
      }
      broadcaster.push(sessionId, { type: 'complete' });
    } catch (err) {
      broadcaster.push(sessionId, { type: 'error', data: { error: err.message } });
      broadcaster.push(sessionId, { type: 'complete', reason: 'error' });
    }
  })();
}
```

---

## 8. Implementation cost

The smallest set of additions to make the four-agnostic contract real:

| Addition | File | Lines |
|---|---|---|
| `hasSubmit`, `subscriptions` on schema | `poc/adaptors/base-adaptor.mjs` | ~10 |
| `resolveProps`, `runAction` adaptor hooks | `poc/adaptors/base-adaptor.mjs` | ~20 |
| `sideEffects` on action definitions | `poc/adaptors/base-adaptor.mjs` | ~15 |
| Provider base class | `poc/server/providers/base.mjs` (new) | ~30 |
| Extract `ClaudeProvider` | `poc/server/providers/claude.mjs` (new, from chat-handler.mjs) | ~120 |
| Provider registry | `poc/server/providers/index.mjs` (new) | ~15 |
| `subscribe_to_events` MCP tool | `poc/server/index.mjs` | ~40 |
| Session store | `poc/server/store.mjs` (new) | ~50 |
| `get_session_store` MCP tool | `poc/server/index.mjs` | ~25 |
| Refactor `render_component` to call `resolveProps` | `poc/server/index.mjs` | ~15 |
| Refactor action dispatch to honor `sideEffects` | `poc/server/mcp-bridge.mjs` (or new `action-runner.mjs`) | ~50 |
| Subscription-driven re-render in bridge | `poc/server/mcp-bridge.mjs` | ~30 |

**Total: ~420 lines added across 5 new files and 4 existing files modified.** No breaking changes. Counter/TodoList/CartViewer keep working with `hasSubmit: true` and `sideEffects: ['agent']` as defaults — same behavior as today.

The `ChatBroadcaster` `_claudeSessions` Map becomes `_providerSessions` (or stays as `_claudeSessions` if Claude is the only provider for now and we don't want to migrate the field name yet — both work).

---

## 9. What this is and isn't

**This is the contract surface.** Every claim in §1 is enforced by the schema additions in §2.1–2.4 plus the store in §5. There is no hidden behavior; the framework does exactly what the schemas say.

**This is not a journey library.** To build ecom, support, hiring, or any other journey, you write component adaptors and an agent prompt. The engine is the same in all cases.

**This is not yet a second provider.** The provider abstraction is in place, but adding `CodexProvider` or `ApiProvider` requires knowing each provider's CLI flags, stdout format, MCP discovery mechanism, and session-resume semantics. That's research work, not abstraction work — but the abstraction is what makes it tractable.

**This is not yet the ecom journey itself.** To build the journey in §6, you still need to write a `DrillCard` adaptor, add `resolveProps` to `CartViewer`, decide what the session store schema for a cart looks like, and write the agent prompt. The contract tells you *how*; the journey tells you *what*.

**This is not user-driven or agent-driven — it's peer-driven.** Both sides can act. The user clicks; the agent may or may not react. The agent renders; the user may or or may not engage. The contract treats them as equal participants in the same conversation, with different affordances (`onAction` vs `render_component`).

---

## 10. Migration path from current PoC

Today the chat-handler is welded to Claude, adaptors don't have `sideEffects` or `resolveProps`, and components don't have `hasSubmit` or `subscriptions`. Migration is additive:

**Phase 1 — Schema additions (no behavior change):**
- Add `hasSubmit` (default `true`) to existing components.
- Add `sideEffects: ['agent']` to existing actions (default behavior).
- Existing tests still pass. Submit button visible everywhere it was before.

**Phase 2 — Provider extraction:**
- Move `chat-handler.mjs`'s `runChatTurn` body into `providers/claude.mjs`.
- Add `providers/base.mjs` with the interface.
- `chat-handler.mjs` becomes a thin dispatch layer.
- All existing tests still pass. No protocol change.

**Phase 3 — Store + resolveProps:**
- Add `poc/server/store.mjs`.
- Add `get_session_store` MCP tool.
- Refactor `render_component` to call `adaptor.resolveProps` if defined.
- Add `resolveProps` to `CartViewer` so it reads from the store.
- Existing CartViewer renders look identical; new behavior only kicks in when the agent calls `render_component('CartViewer')` without items.

**Phase 4 — Action dispatch + subscriptions:**
- Refactor `mcp-bridge.mjs` action handler to inspect `sideEffects`.
- Add `subscribe_to_events` MCP tool.
- Add subscriptions Map to broadcaster.
- Components gain `sideEffects` and `subscriptions`. New tests; existing behavior preserved via default `['agent']`.

**Phase 5 — Second provider:**
- Add `CodexProvider` (requires research into Codex CLI).
- Add `ApiProvider` if a hosted model is in scope.
- `GENICUI_PROVIDER=codex` env var switches providers. No journey change.

Each phase is independently shippable. None breaks existing functionality.
