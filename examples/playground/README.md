# Getting Started with the GenicUI Playground

The **GenicUI Playground** is a Nuxt 4 + PrimeVue demo app that exercises the
full GenicUI pipeline end-to-end: it connects to a real GenicUI server over
WebSocket, surfaces a remote component registry, and renders any component
the agent bridge returns — all in a single chat-driven UI.

This guide walks you from zero to "first component rendered" in about five
minutes, then shows you how to modify the playground and how the pieces fit
together.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Install dependencies](#2-install-dependencies)
3. [Start the GenicUI server](#3-start-the-genicui-server)
4. [Start the playground](#4-start-the-playground)
5. [Connect and render your first component](#5-connect-and-render-your-first-component)
6. [Project tour](#6-project-tour)
7. [How a prompt becomes a rendered component](#7-how-a-prompt-becomes-a-rendered-component)
8. [Customizing the playground](#8-customizing-the-playground)
9. [Testing and linting](#9-testing-and-linting)
10. [Troubleshooting](#10-troubleshooting)
11. [Next steps](#11-next-steps)

---

## 1. Prerequisites

The playground expects the same toolchain as the rest of the GenicUI monorepo.

| Tool | Version | Why |
| --- | --- | --- |
| **Bun** | `>= 1.3` | Runs the server (`packages/server`), executes the test suite, and is the recommended package manager for the workspace. |
| **Node.js** | `>= 20` | Nuxt 4 / Vite need a modern Node runtime as a fallback. |
| **Git** | any recent | Clone + worktrees. |

Verify the toolchain:

```bash
bun --version   # 1.3.x or newer
node --version  # v20.x or newer
git --version
```

> **Tip:** if you do not already have Bun, install it with
> `curl -fsSL https://bun.sh/install | bash` and follow the on-screen
> instructions to add it to your `PATH`.

---

## 2. Install dependencies

The playground is a workspace inside the GenicUI monorepo, so dependencies
are installed from the repository root — **not** from inside
`examples/playground/`.

```bash
# from the repo root
bun install
```

What gets installed:

- **Workspace packages** (`packages/core`, `packages/server`,
  `packages/client`, `packages/vite-plugin`, `packages/agent-bridge`) —
  linked via Bun's workspace protocol so any change is picked up after a
  dev-server reload.
- **Playground dependencies** (`nuxt`, `primevue`, `@primeuix/themes`,
  `vue`, …) declared in
  [examples/playground/package.json](package.json).
- **PrimeVue registry** (`@genicul-primevue/registry` in `registries/primevue/`)
  — the demo registry the server will advertise at `/api/registries`.

---

## 3. Start the GenicUI server

The playground is a **client** — it needs a running GenicUI HTTP/WebSocket
server to talk to. The production server lives in `packages/server/` and
listens on port `3041` by default.

From the repo root:

```bash
bun run dev
# or, equivalently:
cd packages/server && bun run dev
```

You should see output similar to:

```
[INFO] GenicUI server listening on http://localhost:3041
[INFO] WebSocket endpoint: ws://localhost:3041/ws
[INFO] Loaded registry: @genicul-primevue/registry (1 components)
```

Verify the server is healthy:

```bash
curl http://localhost:3041/api/registries
# → {"registries":[{"id":"@genicul-primevue/registry", ...}]}
```

> **Alternative:** the repo ships a one-shot launcher
> (`bash start.sh`) that starts the server, the PoC static server, and the
> PoC MCP server. Use it when you want everything in one command.

---

## 4. Start the playground

In a **second terminal**, start the Nuxt dev server:

```bash
cd examples/playground
bun run dev
```

Nuxt will pick the first available port starting from `3040`. Open the URL
it prints (typically `http://localhost:3040`).

If `3040` is already in use, Nuxt will fall back to the next free port and
print the chosen URL in the terminal — copy that one.

You should see the playground's three-zone layout:

```
┌─────────────────────────────────────────────────────┐
│ GenicUI Playground                          ● Conn │
├─────────────┬─────────────────────────┬─────────────┤
│ ConfigPanel │ RenderSurface (hero)    │ ChatPanel   │
│ • Server    │ "Pick a prompt to       │ No messages │
│ • API key   │  render"                │ yet.        │
│ • Registry  │  + registry prompts     │             │
│ • Components│                         │             │
└─────────────┴─────────────────────────┴─────────────┘
```

---

## 5. Connect and render your first component

1. **Configure the server** — in the left column, the **Server** field
   already defaults to `ws://localhost:3041/ws`. Leave it as-is.
2. **Click `Connect`** — the top-bar pill changes from red
   `● Disconnected` to green `● Connected`. The Registry selector
   auto-populates from `/api/registries`.
3. **Pick a registry** — the only one today is
   `@genicul-primevue/registry` (PrimeVue components). The center column
   immediately updates with **example prompts** that ship inside the
   registry's `registry.json`.
4. **Click a prompt** (for example
   `Show me a data table with orders`). The prompt appears as a
   user bubble in the right column with typing dots while the agent
   bridge is processing, and the resulting component renders in the
   center column as a card. Click **Props** inside the card to inspect
   the JSON the server sent.

You are now driving a real GenicUI session. Any subsequent prompt flows
through the same pipeline and lands as a new card in the render surface.

---

## 6. Project tour

```
examples/playground/
├── app/
│   ├── app.vue                       # 3-zone grid (topbar + config | render | chat)
│   ├── assets/css/primevue.css       # Design tokens, 3-zone grid, skip-link
│   ├── components/
│   │   ├── ChatPanel.vue             # Right column shell (header, count, clear)
│   │   ├── ChatHistory.vue           # Bubble layout + aria-live log
│   │   ├── ConfigPanel.vue           # Left column (server, API key, retry, registry, list)
│   │   ├── EmptyState.vue            # Reusable empty-state component
│   │   ├── PromptChips.vue           # Click-to-send prompt chips
│   │   ├── RegistrySelector.vue      # <select> with exponential backoff
│   │   └── RenderSurface.vue         # Center column (hero + component cards)
│   ├── composables/
│   │   ├── useChat.ts                # Singleton chat history + send/handle
│   │   ├── useComponents.ts          # Singleton component store (mounted/incoming)
│   │   ├── useRegistries.ts          # Singleton registry list + selection
│   │   ├── useWebSocket.ts           # genicui.v1 client (connect, send, retry)
│   │   └── __tests__/                # bun test specs colocated with source
│   └── plugins/                      # Nuxt plugins (PrimeVue registration)
├── nuxt.config.ts                    # SSR off, devtools on, primevue.css loaded
├── package.json                      # nuxt ^4, primevue ^4, vue ^3.5
└── GETTING_STARTED.md                # You are here
```

### Composables at a glance

| Composable | Responsibility |
| --- | --- |
| `useWebSocket()` | Manages the `genicui.v1` subprotocol connection, retry/backoff, frame dispatch. |
| `useComponents()` | Tracks every component the server has rendered (singleton `components` ref). |
| `useChat()` | Tracks the chat history and sends `chat.message` frames on the `__chat__` channel. |
| `useRegistries()` | Fetches `/api/registries`, tracks the selected registry, exposes its `examplePrompts`. |

> All four composables use **module-level singleton `ref`s**, so any
> component that calls `useChat()` (for example) sees the same reactive
> `history` as every other component. This is intentional — the
> playground is a single-page app with shared client state.

### Design tokens

Colors, spacing, and radii are exposed as CSS custom properties in
`app/assets/css/primevue.css`. Look for the `:root { --gp-* }` block —
tokens use the `--gp-` prefix to avoid colliding with PrimeVue's own
variables. Spacing follows an 8dp rhythm (`--gp-space-1` through
`--gp-space-8`).

---

## 7. How a prompt becomes a rendered component

The end-to-end flow when you click a prompt chip:

```
┌──────────────────┐  chat.message   ┌─────────────────────┐
│ PromptChips.vue  │ ─────────────►  │  GenicUI server     │
│ (RenderSurface)  │   __chat__      │  packages/server    │
└──────────────────┘                 │                     │
       ▲                             │  ┌────────────────┐ │
       │ ws.onMessage                │  │ Agent bridge   │ │
       │ chat.response               │  │ packages/      │ │
┌──────────────────┐  JSON-Patch     │  │  agent-bridge  │ │
│ RenderSurface    │  on props       │  └─────┬──────────┘ │
│ component cards  │ ◄────────────────┼────────┘            │
└──────────────────┘  render_component│                     │
                                     └─────────────────────┘
```

Step-by-step:

1. **PromptChip click** in [PromptChips.vue](app/components/PromptChips.vue)
   emits `select`. [RenderSurface.vue](app/components/RenderSurface.vue)
   forwards it to `useChat().sendMessage(prompt, ws, registry)`.
2. `useChat` pushes an empty `ChatMessage` (so the bubble appears
   immediately) and sends a `chat.message` frame on the `__chat__`
   channel.
3. The **server** (in `packages/server/`) routes the frame to the
   **agent bridge** (in `packages/agent-bridge/`), which calls an LLM
   and asks it to produce GenicUI component calls.
4. The bridge invokes **`render_component`** through the GenicUI
   tool surface, sending a frame back on the component channel.
5. The playground's `useComponents` receives it, validates the props
   against the registry's TypeBox schema, and pushes the component
   onto the singleton `components` ref.
6. [RenderSurface.vue](app/components/RenderSurface.vue) re-renders,
   showing a new card with the live component.
7. `useChat.handleResponse` updates the chat bubble with the assistant
   text, replacing the typing-dots indicator.

---

## 8. Customizing the playground

### Add a new prompt chip

Prompts come from the **registry**, not from the playground. Edit
[registries/primevue/registry.json](../../registries/primevue/registry.json)
and append to a component's `examplePrompts` array:

```json
{
  "name": "data-table",
  "examplePrompts": [
    "Show me a data table with orders",
    "My brand-new prompt here"
  ]
}
```

Reload the server (or send it `SIGHUP` — the registry supports hot reload
in F37). The chip appears the next time the playground refreshes its
registry list.

### Add a new component to the registry

1. Author the PrimeVue wrapper under
   `registries/primevue/src/<name>/`.
2. Declare its schema in
   `registries/primevue/registry.json` (TypeBox / JSON Schema).
3. Add at least one `examplePrompts` entry so users discover it.
4. The server picks it up on the next reload.

### Theme / visual tweaks

All design tokens live in
[app/assets/css/primevue.css](app/assets/css/primevue.css). Change the
`:root` block to retune the entire playground:

```css
:root {
  --gp-accent: #34d399;        /* brand colour */
  --gp-bg: #0f172a;            /* page background */
  --gp-zoneleft-width: 280px;  /* left column width */
  --gp-zoneright-width: 340px; /* right column width */
}
```

### Add a new column / zone

The 3-zone grid is in `app/app.vue` (`<main class="main-grid">`). To add
a fourth zone, extend both `grid-template-areas` and
`grid-template-columns` in the CSS, and drop a new `<aside>` into
`app.vue`.

---

## 9. Testing and linting

The playground uses Bun's test runner.

```bash
cd examples/playground
bun test              # run all composable specs
bun run lint          # eslint
```

Composable tests live next to the source under
`app/composables/__tests__/`. When adding a composable that uses the
singleton pattern (`module-level ref`s), remember to reset state in a
`beforeEach` hook — see
[`chat.test.ts`](app/composables/__tests__/chat.test.ts) for the
pattern.

For end-to-end tests against the live UI, use Playwright from the repo
root:

```bash
cd ../../
bunx playwright test --config=playwright.config.ts
```

---

## 10. Troubleshooting

### "Connection refused — is the GenicUI server running?"

The playground tried to reach `ws://localhost:3041/ws` but nothing is
listening. Start the server first (see [step 3](#3-start-the-genicui-server)).
If you ran the server on a different port, update the **Server** field
in the playground's left column and click **Retry**.

### "Could not reach ws://…"

Same root cause as above — the registry selector polls
`/api/registries`. The selector backs off exponentially (10s → 20s →
40s, capped at 60s), so once you start the server it will recover
automatically within the backoff window.

### "No example prompts in this registry yet."

The selected registry does not declare any `examplePrompts`. Edit the
registry's `registry.json` and add some, or pick a different registry
once you have one.

### `bun run dev` complains the port is in use

Nuxt automatically picks the next free port starting from `3040`. The
URL it picks is printed in the terminal — use that URL, not `3040`.

### CORS errors in the browser console

The GenicUI server already sets permissive CORS headers for the local
dev ports. If you see CORS errors, make sure you are hitting
`localhost` (not `127.0.0.1` against the wrong host, or a remote
address), and that you restarted the server after editing its config.

### Tests fail because of stale singleton state

`useChat`, `useComponents`, and `useRegistries` share state across
imports. If you write tests for these composables, add a
`beforeEach(() => useChat().clear())` (or equivalent) so each test
starts from a clean slate.

---

## 11. Next steps

- **Build a new registry.** Use
  [`@genicul-primevue/registry`](../../registries/primevue/) as a
  template. The companion package `@genicui/vite-plugin` auto-generates
  registry metadata from your component sources.
- **Wire up the agent bridge.** Edit
  [`packages/agent-bridge/`](../../packages/agent-bridge/) to point at
  your own LLM. The playground already speaks the standard
  `chat.message` / `chat.response` / `chat.error` channel pair, so you
  do not need to touch the UI.
- **Add more tools.** The GenicUI server exposes `render_component`,
  `update_component`, `subscribe_to_events`, and `find_ui_component`
  (see `docs/specs/features/`). The playground's `useComponents` and
  `useWebSocket` are the integration points.
- **Ship a real component.** When you have wrapped your own library,
  add a `package.json` `workspace:*` dependency from the playground
  and import the components from there.

Welcome to GenicUI. If you get stuck, the [repo-wide README](../../README.md)
and [`docs/idea/`](../../docs/idea/) cover the protocol in depth.
