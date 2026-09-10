# GenicUI — AI Agent-Driven Component Library

## Overview

GenicUI is an **adaptor layer** that makes existing component libraries (PrimeVue, Vuetify, ShadCN, etc.) usable by AI agents in conversational interfaces. Instead of building components from scratch, GenicUI wraps existing components with a standardized schema and event bridge, allowing LLM agents to render, update, and interact with UI components during chat or voice conversations.

## The Problem

Traditional component libraries are **user-driven**: the user clicks, the component reacts. AI-powered interfaces are **agent-driven**: the agent decides what to show, renders it, and user actions feed back to the agent. There is no bridge between these two worlds.

## The Solution

Each existing component gets a thin **adaptor** that adds:

1. **Schema** — machine-readable metadata so the agent knows what the component does, what props it accepts, and when to use it
2. **Event Bridge** — user actions become structured events the agent can understand
3. **Semantic Model** — the component's current state as structured data, enabling voice resolution ("remove the first item" → which item is first?)

## Key Documents

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | System architecture, component interaction, data flow |
| [Adaptor Specification](./adaptor-spec.md) | Adaptor interface, per-component schema, event bridge |
| [Agent Protocol](./agent-protocol.md) | How agents discover and invoke components via MCP |
| [Four-Agnostic Design](./four-agnostic.md) | Journey / component / library / provider-agnostic contract, sideEffects, subscriptions, Submit semantics |
| [Developer Experience](./dx.md) | How it feels to install + use GenicUI in real projects; per-framework install paths, schema-as-source-of-truth, debugging DX |
| [CartViewer in 3 Frameworks](./examples-cartviewer.md) | Same component (CartViewer) implemented in Nuxt+PrimeVue, Next.js+Flowbite, SvelteKit+Skeleton — what's the same, what changes |
| [Lessons Learned](./lessons-learned.md) | What the PoC build taught us — multi-turn SSE bug, Submit design, provider abstraction, CORS/SSE/bridge plumbing |
| [Examples](./examples.md) | Working code examples for common scenarios |
| [FAQ](./faq.md) | Plain-language answers to common questions |

## Example Flow

```
User: "Show me my cart"

Claude → find_ui_component("show shopping cart with items and total")
MCP Server → { component: "CartViewer", renderTool: "render_cart_summary" }

Claude → render_component("CartViewer", { cartId: "abc123" })
UI → renders PrimeVue-based cart component

User clicks "Remove" on an item
Component → item_removed (itemId: "widget-42")
Claude → "Widget removed. Your cart now has 3 items totaling $156.50"
         → render_component("Toast", { message: "Item removed" })
```

## Architecture at a Glance

```
┌──────────────────────────────────────────────────┐
│  AI Agent (Claude, GPT, etc.)                   │
│  - Receives component tool definitions via MCP  │
│  - Chooses components based on user intent      │
│  - Receives user actions from components        │
└─────────────────┬────────────────────────────────┘
                  │ MCP Protocol
                  ▼
     ┌────────────────────────┐
     │  GenicUI MCP Server    │
     │                        │
     │  find_ui_component()   │  ← semantic search over registry
     │  render_component()    │  ← renders component in UI
     │  update_component()    │  ← live prop updates
     │  unmount_component()   │  ← cleanup
     │  get_component_state() │  ← voice resolution
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │  Adaptor Layer          │
     │  ┌──────────┐          │
     │  │ DataTable│ wraps    │
     │  │ Adaptor  │──────────│── PrimeVue DataTable
     │  └──────────┘          │
     │  ┌──────────┐          │
     │  │  Chart   │ wraps    │
     │  │ Adaptor  │──────────│── PrimeVue Chart
     │  └──────────┘          │
     └────────────────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │  Conversation Surface   │
     │  (chat + embedded UI)   │
     └────────────────────────┘
```

## Why Adaptors Instead of Building Components

| Metric | Build from scratch | Adaptor approach |
|---|---|---|
| Components | 50 × 2 weeks = 20 months | 50 × 3 days = 9 weeks |
| Testing | Full component test suite | Only adaptor logic |
| Accessibility | Build from scratch | Inherited from library |
| Theme support | Build from scratch | Inherited from library |
| Community adoption | Start from zero | Leverage existing ecosystems |

## Design Principles

1. **Library-agnostic** — The adaptor interface is independent of PrimeVue/Vuetify/ShadCN. The agent never knows which library backs a component.
2. **Thin adaptors** — 90% of components just need schema + event wiring. Only complex components need custom wrappers.
3. **Agent as orchestrator** — Components don't navigate or manage global state. The agent passes props and receives events.
4. **Standard protocol** — MCP server standardizes how any agent (Claude, GPT, etc.) discovers and uses components.
5. **Voice-first** — Every component exposes its internal state so voice commands can be resolved programmatically.
