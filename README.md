<div align="right">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvaah-ai%2FGenicUI&project-name=genicui-docs&root-directory=docs&build-command=bun+run+build&output-directory=.output%2Fpublic)
[![Live Site](https://img.shields.io/badge/Live%20Site-genicui.dev-7c3aed)](https://genicui.dev)
[![llms.txt](https://img.shields.io/badge/llms.txt-7c3aed)](https://genicui.dev/llms-full.txt)

</div>

# GenicUI

**The protocol that lets AI agents use your UI.**

MCP-native · library-agnostic · agent-agnostic.
**Render PrimeVue today**; Mantine / shadcn / MUI on the [registry roadmap](#pick-your-framework).

> Build interactive components for AI agents — tables, forms, dashboards — that render live in your own app, with your own component library, against any MCP-capable agent.

---

## What GenicUI is

Plain markdown and structured JSON work for many agent surfaces. They stop working the moment your agent needs a *clickable table*, a *form the user can fill*, or a *chart that re-renders on a button press* — anywhere the conversation and the UI have to be the same thing.

GenicUI is the protocol layer that turns those clicks back into something the agent can hear. You wrap your existing component library with one tiny adapter, declare the component's contract in one place, and any MCP-capable agent — Claude Code, GPT, Cursor, Goose, VS Code — discovers the components and uses them through four standard tools.

Same component renders in the chat, on a voice call, on a dashboard, or through an MCP tool. The agent doesn't know which UI library you used. You can swap libraries without retraining the agent.

---

## How it works — the four tools

| Tool | What it does |
| --- | --- |
| `find_ui_component` | Semantic search over your registry — `intent + data shape + layout` → component + props schema + alternatives. |
| `render_component` | Mount a component with validated props; returns a `componentId`. Emits `STATE_SNAPSHOT` + `component.mounted`. Idempotency-key aware. |
| `update_component` | Two modes — JSON-Patch deltas (RFC 6902) → `STATE_DELTA`, or full-props replace → `STATE_SNAPSHOT`. |
| `subscribe_to_events` | Filter-scoped subscription to component events; unsubscribe stops the stream; unmount cleans up. |

JSON-RPC error namespace `-32001..-32010` is reserved for the GenicUI surface. Fourteen AG-UI event types ride on the wire (nine base AG-UI events + five GenicUI extensions: `COMPONENT_MOUNTED`, `COMPONENT_UPDATED`, `COMPONENT_UNMOUNTED`, `COMPONENT_EVENT`, `SURFACE_READY`).

---

## See it running — frame a component in ~60s

> A screenshot-by-screenshot walkthrough lives at **https://genicui.dev/getting-started/quick-start**. The block below is the same flow as code.

```bash
# 1. From a fresh checkout
bun install
bun --filter @genicui/server start        # → http://localhost:3040

# 2. Drop into your MCP client (Claude Code, mcp-inspector, anything that speaks MCP)
#    Authorization: Bearer gnc_live_<32-char-key>  (printed by the server on boot)
```

```ts
// 3. From any MCP client
import { MCPClient } from "@genicui/agent-bridge";

const client = new MCPClient({ url: "http://localhost:3040/mcp", apiKey: "gnc_live_..." });
const { componentId } = await client.call("render_component", {
  name: "data-table",
  props: {
    columns: [{ key: "name", label: "Name" }, { key: "status", label: "Status" }],
    rows: [{ name: "Alice", status: "active" }, { name: "Bob", status: "inactive" }]
  }
});
// → <genic-data-table> mounts in whatever chat surface you're using
// → component.mounted + STATE_SNAPSHOT stream back as AG-UI frames
```

---

## Pick your framework

| UI library | Status | Registry |
| --- | --- | --- |
| **PrimeVue** | ✅ Shipped | [`@genicul-primevue/registry`](packages/primevue/) — 5 components (`data-table`, `input-pair`, `result-card`, `city-picker`, `weather-card`) |
| **Mantine** | 🟡 In design | — |
| **shadcn/ui** | 🟡 In design | — |
| **MUI** | 🟡 In design | — |
| **Skeleton** | 🟡 In design | — |
| **Flowbite** | 🟡 In design | — |

UI library agnosticism is a property of the protocol, not a license. A registry declares the contract for any component in any library; the agent consumes the contract.

---

## Why GenicUI — and what's different

The empty quadrant — every other AI/UI tool picks two of three and gives up the third. GenicUI takes all three:

| | GenicUI | Tambo / CopilotKit / assistant-ui | OpenAI Apps SDK | MCP Apps |
| --- | :-: | :-: | :-: | :-: |
| Library-agnostic | ✅ | ❌ React-only | — | ❌ iframe-locked |
| MCP-native | ✅ | — | — | ✅ |
| Agent-agnostic | ✅ | ✅ | ❌ OpenAI-only | ✅ |
| No iframe between agent and your DOM | ✅ | ✅ | — | ❌ `postMessage` |
| Works on Claude Desktop / Goose / VS Code today | ✅ | partial | ❌ | ✅ |
| Same protocol feeds chat + voice + dashboard | ✅ | ❌ one journey | ❌ | ❌ |
| Schema-as-source-of-truth (TypeBox → MCP → agent prompt) | ✅ | partial | ❌ | ❌ |

Full side-by-side with `json-render` / `LiveKit Agents UI` / `Vercel AI SDK` at **[genicui.dev/guides/migration](https://genicui.dev/guides/migration)**.

---

## Five flows this unblocks

1. **Ecommerce** — agent renders a `<CartViewer>` with `<TicketCard>` rows; user clicks "Apply SUMMER25"; the click becomes a `componentEvent` the agent can hear.
2. **Customer support** — agent renders a `<KpiDashboard>` with weekly revenue; user clicks a row drilldown; agent updates with `<ClaimForm>` pre-filled.
3. **Internal ops** — voice call dispatches a `<CityPicker>`; agent pre-fills based on intent; user confirms; `<WeatherCard>` updates via `update_component` JSON-Patch.
4. **Migration** — drop a GenicUI registry into an existing MCP Apps / OpenAI Apps SDK / CopilotKit surface; the contract stays the same, only the renderer changes.
5. **Multi-channel** — same MCP server, same registry, three render targets (chat / voice / dashboard) — same component renders in all three with no per-channel code.

---

## Trust boundary, briefly

Three zones, enforced at every MCP tool call:

- **Tool surface** — untrusted input from the agent. Stripped of `__proto__`, `constructor`, `prototype` at the boundary.
- **Trust boundary** — every input validated against a TypeBox schema with `additionalProperties: false`. Property-based tested (`strip-proto-keys` runs 50K random inputs in CI).
- **Internal bus** — trusted components, validated props, monotonic sequence numbers, channel multiplexing.

Full spec at **[genicui.dev/concepts/trust-boundary](https://genicui.dev/concepts/trust-boundary)**.

---

## Supported runtimes & transports

| Runtime | Client | Server | Notes |
| --- | :-: | :-: | --- |
| Node ≥ 20 LTS | ✅ | ✅ | Recommended |
| Bun ≥ 1.3 | ✅ | ✅ | Recommended |
| Cloudflare Workers | ✅ (planned) | 🟡 | M6 milestone |
| Bun self-host binary | — | 🟡 | M6 milestone |
| Nitro / Nuxt binding | 🟡 | 🟡 | M6 milestone |
| Browsers | ✅ | — | Client only; `@genicui/client` is the Web-Component runtime |

| Transport | Status |
| --- | --- |
| stdio | ✅ (Claude Code, mcp-inspector) |
| Streamable HTTP | ✅ |
| SSE | ✅ |
| WebSocket (frame multiplexing) | ✅ |

---

## Repository tour

```
packages/
├── core/             @genicui/core            v0.1.0   Schema builder, 14-event AG-UI types, JSON-Patch engine, SessionStore
├── server/           @genicui/server          v0.1.0   MCP server, 4-tool surface, trust boundary, WebSocket frames
├── client/           @genicui/client          v0.1.0   GenicElement Web Component (closed Shadow DOM), RuntimeBridge
├── vite-plugin/      @genicui/vite-plugin     v0.1.0   AST scanner, genui-registry.json emission, HMR
└── agent-bridge/     @genicui/agent-bridge    v0.1.0   Platform-agnostic LLM ↔ MCP bridge (OpenAI, Anthropic, OpenAI-compatible)

registries/
└── primevue/         @genicul-primevue/registry  v0.1.0   5 components: data-table, input-pair, result-card, city-picker, weather-card

examples/
├── playground/       Nuxt 4 + PrimeVue demo app, WebSocket client, three-zone layout
└── docs/             Docus 5.13 documentation site → https://genicui.dev
```

Build: `bun install && bun --filter @genicui/server start`. Test: `bun test` (~200 unit/integration) · `bun test --coverage` (80/90/60 coverage gate).

---

## Status — 5 of 7 milestones shipped

- **M1–M5 ✅** — core, server, client, vite-plugin, agent-bridge, registry v1, agent bridge, suggestive prompts, component event interactivity.
- **M5.1 🟡** — documentation site (Docus + Nuxt UI v4 + Vercel) **live at https://genicui.dev**.
- **M6 🟡** — Cloudflare / Bun self-host / Nitro deployment adapters.

Every core package is at `v0.1.0`. One community registry (`@genicul-primevue/registry`) is shipped. The protocol is stable at the four-tool surface and the AG-UI frame envelope; pre-`1.0` while M6 lands.

---

## For AI agents

Full content available as plain markdown at:

- **[https://genicui.dev/llms.txt](https://genicui.dev/llms.txt)** — index + per-section links (7.6 KB)
- **[https://genicui.dev/llms-full.txt](https://genicui.dev/llms-full.txt)** — full corpus (283 KB)
- **[https://genicui.dev/raw/&lt;page&gt;.md](https://genicui.dev/)** — per-page raw markdown

If you're an AI coding assistant reading this repo, the agent-bridge section of the docs is the highest-signal starting point: **[genicui.dev/api/agent-bridge](https://genicui.dev/api/agent-bridge)**.

---

## Contributing

The authoritative design contract lives in `.vaahagents/requirements/specs/manifest.json` (29 features, 93 ACs). Per-feature specs in `.vaahagents/requirements/specs/features/`. The milestone plan is at `.vaahagents/milestones-and-tasks/`. Issues and PRs are triaged against those specs — open one with a link to a feature ID for fastest review.

For local dev:

```bash
bun install
bun --filter @genicui/server start       # MCP server on :3040
bun --filter genicui-playground dev      # playground on :3000
bun test                                 # unit + integration
```

---

## License

**Apache-2.0 — see [`LICENSE`](LICENSE).** *(LICENSE file pending — to be added in the next release.)*
