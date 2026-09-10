<div align="right">

[![Live Site](https://img.shields.io/badge/Live%20Site-genicui.dev-7c3aed)](https://genicui.vaah.ai)
[![llms.txt](https://img.shields.io/badge/llms.txt-7c3aed)](https://genicui.vaah.ai/llms-full.txt)

</div>

# GenicUI

**The protocol that lets AI agents use your UI.**

MCP-native · library-agnostic · agent-agnostic.

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

## See it — a chat with your UI

A `claude · MCP` session rendering a real cart inline, a click streaming back as a `component_event`, the agent picking it up. One round-trip, one protocol, three primitives (`render_component` → UI → `component_event`).

<p align="center">
  <img alt="GenicUI Chat panel — claude · MCP session rendering a CartViewer inline and a component_action round-trip" src="https://raw.githubusercontent.com/vaah-ai/GenicUI/develop/docs/public/chat-panel.png" width="860">
</p>

The whole loop — agent message, rendered component, user click, agent follow-up — rides on AG-UI frames over the same MCP transport the agent already speaks.

---

## See it running — frame a component in ~60s

> A screenshot-by-screenshot walkthrough lives at **https://genicui.vaah.ai/getting-started/quick-start**. The block below is the same flow as code.

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

Full side-by-side with `json-render` / `LiveKit Agents UI` / `Vercel AI SDK` at **[genicui.vaah.ai/guides/migration](https://genicui.vaah.ai/guides/migration)**.

---

## Five flows this unblocks

1. **Ecommerce** — agent renders a `<CartViewer>` with `<TicketCard>` rows; user clicks "Apply SUMMER25"; the click becomes a `componentEvent` the agent can hear.
2. **Customer support** — agent renders a `<KpiDashboard>` with weekly revenue; user clicks a row drilldown; agent updates with `<ClaimForm>` pre-filled.
3. **Internal ops** — voice call dispatches a `<CityPicker>`; agent pre-fills based on intent; user confirms; `<WeatherCard>` updates via `update_component` JSON-Patch.
4. **Migration** — drop a GenicUI registry into an existing MCP Apps / OpenAI Apps SDK / CopilotKit surface; the contract stays the same, only the renderer changes.
5. **Multi-channel** — same MCP server, same registry, three render targets (chat / voice / dashboard) — same component renders in all three with no per-channel code.

---

## For AI agents

Full content available as plain markdown at:

- **[https://genicui.vaah.ai/llms.txt](https://genicui.vaah.ai/llms.txt)** — index + per-section links (7.6 KB)
- **[https://genicui.vaah.ai/llms-full.txt](https://genicui.vaah.ai/llms-full.txt)** — full corpus (283 KB)
- **[https://genicui.vaah.ai/raw/&lt;page&gt;.md](https://genicui.vaah.ai/)** — per-page raw markdown

If you're an AI coding assistant reading this repo, the agent-bridge section of the docs is the highest-signal starting point: **[genicui.vaah.ai/api/agent-bridge](https://genicui.vaah.ai/api/agent-bridge)**.

---

## License

**Apache-2.0 — see [`LICENSE`](LICENSE).** Patent grants, attribution requirements, and trademark reservations are documented in [`NOTICE`](NOTICE).
