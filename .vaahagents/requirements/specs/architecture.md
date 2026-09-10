---
title: GenicUI Testable MVP — Architecture
description: System architecture, request lifecycle, and component interaction diagrams for the Testable MVP. Replaces the PoC-era architecture.md with locked-requirements version.
audience: Engineering, framework architects, OSS maintainers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Testable MVP — Architecture

> **Purpose:** This is the **Testable MVP** architecture, derived from [consolidated-requirements.md](../idea/consolidated-requirements.md). It supersedes the PoC-era architecture.md and reflects the locked tool contracts, wire protocol, and registry shape.
>
> **Source:** 29 Testable MVP features, 93 Gherkin acceptance criteria, locked decisions in [B (Locked Technical Decisions)](../idea/consolidated-requirements.md#b-locked-technical-decisions).

---

## Table of Contents

- [System Overview](#system-overview)
- [Request Lifecycle: Agent → Component → User](#request-lifecycle-agent--component--user)
- [Package Boundaries](#package-boundaries)
- [Transport Topology](#transport-topology)
- [State Management](#state-management)
- [Why This Architecture](#why-this-architecture)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI AGENT (Claude Code, etc.)                    │
│                                                                          │
│  Has MCP client. Calls:                                                  │
│    find_ui_component(query) → top-K catalog entries                     │
│    render_component(name, props)    → mount on connected client          │
│    update_component(id, patch|merge) → mutate live state                  │
│    subscribe_to_events(id, actions) → listen for component events        │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ MCP / JSON-RPC over stdio or Streamable HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GENICUI MCP SERVER (@genicui/server)                  │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐        │
│  │ Tool handlers  │  │ Trust boundary │  │  SessionStore      │        │
│  │ (4 public +    │  │ (TypeBox       │  │  (InMemoryStore    │        │
│  │  2 internal)   │◀─▶│  Value.Check,  │◀─▶│   MVP-only)        │        │
│  └────────┬───────┘  │  proto-strip)  │  └────────────────────┘        │
│           │          └────────────────┘                                  │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  Channel Multiplexer                              │   │
│  │   • up to 256 channels per socket                                 │   │
│  │   • sequence-numbered frames                                      │   │
│  │   • per-channel subscription routing                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ WebSocket (genicui.v1 subprotocol)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BROWSER (@genicui/client)                           │
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │   GenicClient       │    │   <genic-data-table> Web Component  │    │
│  │   (WS + heartbeat)  │───▶│   (closed Shadow DOM)               │    │
│  │                     │    │                                     │    │
│  │   • reconnects      │    │   • attributes: props-json, id      │    │
│  │   • applies patches │    │   • forwards composed events        │    │
│  └─────────────────────┘    └─────────────────────────────────────┘    │
│                                                                          │
│  Wraps (via Vue 3 shim):    PrimeVue's <DataTable>                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle: Agent → Component → User

### Phase 1: Discovery

```
Agent: "Show me the user's orders"
  → find_ui_component({ query: "table of orders", topK: 1 })
Server: { components: [{ name: "DataTable", registryId: "primevue@4.2.0", ... }] }
Agent: knows to use DataTable with rows + pageSize
```

### Phase 2: Render

```
Agent: → render_component({
    name: "DataTable",
    props: { rows: [...], pageSize: 10 },
    surface: "default",
  })
Server: validates props against DataTable's TypeBox schema
        validates "__proto__" / "constructor" / "prototype" absent
        allocates componentId:  "dt-sess9f8e-01HK9X"
        emits wire frame: { channel: "dt-sess9f8e-01HK9X", type: "COMPONENT_MOUNTED", ... }
Browser: GenicClient receives COMPONENT_MOUNTED
         resolves componentId → registry entry (PrimeVue DataTable)
         creates <genic-data-table component-id="dt-..." props-json='...'>
         web component upgraded → renders PrimeVue DataTable inside Shadow DOM
         sends client.hello on channel: subscribe for updates + events
Server: returns { componentId: "dt-sess9f8e-01HK9X", channel, schema, initialState }
```

### Phase 2b: Chat-Bridge Render (Claude Code / Codex streams)

When the agent reaches the playground via the chat bridge (instead of the MCP-direct trust boundary), the wire shape differs slightly because Claude Code's MCP wrapper encodes array parameters as `{ item: [...] }` envelopes and may quote integer-looking scalars as strings. The chat-bridge sanitizer (`sanitizeBridgeProps` in `packages/server/src/chat/chat-handler.ts`) normalizes those shapes before validation:

```
Agent (Claude Code stream-json): tool_call { name: "render_component",
                                              args: { name: "DataTable",
                                                      props: { pageSize: "10",
                                                               rows: { item: [...] } } } }
Bridge: sanitizeBridgeProps()
        → unwrap rows: { item: [...] }  →  rows: [...]
        → coerce pageSize: "10"        →  pageSize: 10
        → renderComponent(...)         →  ok, bridge COMPONENT_MOUNTED
Browser: tool_call accordion expands, embeds <RenderedComponent> → PrimeVue DataTable
```

The MCP-direct trust boundary stays strict (see [State Management §Trust Boundary](#trust-boundary) and [F16](../specs/features/feature-016-render-component-tool.md)). The sanitizer runs **only inside the chat bridge**, which is internal — the only caller is our own Claude Code / Codex adaptor.

**Why the sanitizer exists:** without it, a schema-shape mismatch (e.g. an MCP-wrapped array the schema rejects) returns `-32003 props_invalid`, and Claude Code's MCP wrapper retries the same bad payload up to ~25 times before giving up. From the user's perspective the chat panel shows 25 running-accordions for ~30 seconds while the table never mounts. With the sanitizer, the same prompt renders in one bridge call. Diagnostic signature: a fast render logs `bridged render_component -> …` once; a slow render logs `bridge render_component failed (-32003)` N times before either a retry or the subprocess closing.

### Phase 3: Update

```
Agent: → update_component({
    componentId: "dt-sess9f8e-01HK9X",
    patch: [{ op: "replace", path: "/rows/2/status", value: "shipped" }],
  })
Server: validates patch (RFC 6902; checks path exists)
        applies to server-side state
        diffs vs old state (fast-json-patch, mutate: false)
        emits wire frame: { type: "STATE_DELTA", payload: [...], seq: 42 }
Browser: GenicClient receives STATE_DELTA
         patches props in place (JSON-Patch apply)
         WebComponent's observedAttribute fires → re-render
```

### Phase 4: Interact

```
User: clicks row #2 in DataTable
PrimeVue: emits @row-click with { row: { id: "ORD-002", ... } }
Vue shim: dispatches CustomEvent('row_selected', { detail: { rowId: 'ORD-002' }, composed: true, bubbles: true })
WebComponent base: catches composed event
                    sends wire frame: { type: "COMPONENT_EVENT", payload: { action: "row_selected", detail: { rowId: "ORD-002" } }, seq: 43 }
Server: routes to subscribed agent
Agent: receives { componentId, action: "row_selected", detail: { rowId: "ORD-002" } }
       responds with text + (optionally) update_component
```

---

## Package Boundaries

```
genicui/
├── packages/
│   ├── core/           # @genicui/core — framework-agnostic logic
│   │   ├── protocol/   # AG-UI event types, JSON-Patch ops
│   │   ├── schema/     # genicSchema() wrapper, Standard Schema interop
│   │   ├── mcp/        # 4 tool definitions + MCP Apps adapter
│   │   ├── events/     # subscription routing (UI → agent)
│   │   ├── patch/      # fast-json-patch wrapper, { mutate: false }
│   │   └── types/      # ComponentAdaptor, Registry types
│   │
│   ├── server/         # @genicui/server — WebSocket + HTTP server
│   │   ├── transport/  # WebSocket (Elysia), MCP bootstrap
│   │   ├── bootstrap/  # mountGenicUI() for Elysia/Nitro/Hono/Fastify/...
│   │   └── tools/      # 4 public + 2 internal MCP tool handlers
│   │
│   └── client/         # @genicui/client — browser-side render
│       ├── ws-client.ts      # WebSocket client (reconnect, heartbeat)
│       ├── web-component/    # Base HTMLElement class
│       ├── vue/              # Vue 3 shim
│       └── postmessage/      # (Phase 2) iframe mode adapter
│
├── registries/
│   └── primevue/       # @genicul-primevue/registry (DataTable only in MVP)
│
└── examples/
    └── nuxt-primevue/  # Working dev environment
```

**Key rule:** Registry packages (`@genicul-*`) depend on `@genicui/core` but NOT on `@genicui/server` or `@genicui/client`. This keeps registries reusable on both server and client.

---

## Transport Topology

### Single-Socket, Multi-Channel

One WebSocket per browser session. Up to **256 channels** multiplexed over it:

| Channel | Purpose | Examples |
|---|---|---|
| `__session__` | Reserved | server.hello, session.* |
| `__mcp__` | Reserved | tool calls, errors |
| `__agent__` | Reserved | agent responses |
| `<componentId>` | One per mounted component | COMPONENT_MOUNTED, STATE_DELTA, COMPONENT_EVENT |

Reserved channels are checked at component registration; reusing them returns `-32008 surface_unavailable`.

### Frame Ordering

- Every frame carries monotonic `seq: uint64`
- Server emits `STATE_DELTA` before any `COMPONENT_EVENT` that observes that state
- Client buffers out-of-order frames per channel; flushes when `seq` is contiguous
- Reconnect: MVP loses events on disconnect (post-MVP: `client.resync { lastSeenSeq }`)

### Authentication

- Subprotocol: `genicui.v1`
- API key in `Authorization: Bearer gnc_live_<32>` header
- Test keys (`gnc_test_*`) restricted to dev mode
- Missing key → HTTP 401 with `WWW-Authenticate: Bearer`

---

## State Management

### Server-Side

- `SessionStore { get/set/append/subscribe }` interface
- MVP ships `InMemoryStore` only (single Bun process, no clustering)
- Post-MVP: `DODurableObjectStore` (Cloudflare) + `PostgresListenNotifyStore` (self-host)

### Trust Boundary

Every inbound tool call:

1. Strip `__proto__`, `constructor`, `prototype` keys (defense in depth)
2. Validate against `GenicSchema<T>` via `Value.Check()`
3. Reject schemas with `additionalProperties: true` at registry-load time
4. Reject patch ops whose path doesn't exist in current state

### Client-Side

- One `GenicClient` per page (Vue 3 `<GenicProvider>`)
- Subscriptions keyed by componentId
- Out-of-order frames buffered per channel
- Web Component base applies patches via `attributeChangedCallback`

---

## Why This Architecture

### Library-Agnostic Layer
Web Components are the common denominator. Each `<genic-{name}>` wraps the underlying library (PrimeVue DataTable, etc.) inside its Shadow DOM. The agent never sees Vue, React, or any specific framework — it sees schemas + events.

### MCP-Native Surface
Four public tools (`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`) plus MCP Apps `ui://` resources. Day-one compatibility with Claude Desktop, Goose, VS Code, ChatGPT.

### Agent-Agnostic Routing
JSON-RPC over stdio or Streamable HTTP. Any MCP-capable agent works. AG-UI events flow through the same wire; agents that speak AG-UI natively (CopilotKit, LangGraph) consume them as-is.

### Journey-Agnostic Surfaces
The `surface` parameter on `render_component` lets the same component be mounted in chat, dashboard, voice, or any future surface — without changing the agent's contract.

### Architectural Capability, Not Day-1 Delivery
PrimeVue DataTable is the **only** component in the Testable MVP registry. Mantine/shadcn/Skeleton come in Phase 2. The architecture supports them; the MVP just doesn't ship them.

---

## Cross-Reference

- [consolidated-requirements.md §H Architecture Patterns](../idea/consolidated-requirements.md#h-architecture-patterns-locked) — locked architectural decisions
- [package-distribution.md](../idea/package-distribution.md) — why 3 packages + N registries
- [features.md](./features.md) — 29 MVP features + 93 acceptance criteria
- [deployment.md](./deployment.md) — Cloudflare + Bun self-host
- [security.md](./security.md) — trust boundary + auth details
