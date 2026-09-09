# GenicUI Playground — Design Document

> **Date:** 2026-09-03
> **Milestone:** M5 (Registry)
> **Tasks:** M5-T4, M5-T5, M5-T6
> **Status:** Draft — awaiting user approval

## Overview

A polished demo/showcase Nuxt 4 + PrimeVue app at `examples/playground/` that demonstrates the full GenicUI pipeline:

**User prompt → LLM API → MCP tools → GenicUI server → WebSocket → Browser render**

The playground mirrors exactly how developers use GenicUI:
1. The GenicUI server exposes MCP tools (`/mcp`) and WebSocket (`/ws`)
2. Any AI agent (Claude Code, LangGraph, CrewAI, etc.) connects via MCP
3. The browser connects via WebSocket to receive rendered components

## Architecture

### System Topology

```
┌─────────────────────────────────────────────────────────────┐
│              Browser (Nuxt 4 + PrimeVue)                    │
│  ┌─────────────┐ ┌──────────────┐  ┌─────────────────────┐  │
│  │ LLM Config   │ │ Suggestive   │  │ Render Surface      │  │
│  │ Registry     │ │ Prompts      │  │ (WebSocket client)  │  │
│  └──────┬───────┘ └──────┬───────┘  └──────────▲──────────┘  │
│         └────────────────┘                      │             │
│              User prompt                        │             │
└──────────────┬───────────────────────────────────┘             │
               │  ws://localhost:3040/ws                         │
               ▼                                                 │
┌───────────────────────────────────────────────┐   ┌──────────┐│
│          GenicUI Server (port 3040)           │   │ LLM API  ││
│                                               │   │(OpenAI/  ││
│  ┌─────────────┐   ┌──────────────────────┐  │   │ Anthropic)│
│  │ Chat Route  │   │ MCP Endpoint (/mcp)   │  │   └───┬────┘│
│  │ (/ws)       │   │                      │  │       │      │
│  └──────┬──────┘   └──────────┬───────────┘  │       │      │
│         │                    │               │       │      │
│  ┌──────▼───────┐  ┌─────────▼───────────┐   │       │      │
│  │ Agent Bridge │  │ MCP Tool Handlers   │◀──┼───────┘      │
│  │ (MCP Client) │  │ (existing, M3-T1)   │   │              │
│  └──────┬───────┘  └─────────────────────┘   │              │
│         │                                     │              │
│         │  Calls LLM with MCP tools           │              │
│  ┌──────▼───────┐                              │              │
│  │ Registry     │                              │              │
│  │ Schema Loader │                             │              │
│  └──────────────┘                              │              │
│                                                │              │
│  WebSocket push: component results ────────────┘              │
└───────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **Playground App** | `examples/playground/` | Nuxt 4 + PrimeVue UI, WebSocket client, 3-panel layout |
| **Agent Bridge** | `packages/agent-bridge/` | Thin wrapper around `@modelcontextprotocol/sdk`, calls LLM with MCP tools |
| **Chat Route** | `packages/server/` (new) | WebSocket handler that bridges UI prompts → agent bridge |
| **MCP Endpoint** | `packages/server/` (existing) | Standard MCP endpoint (M3-T1), already exists |
| **Registry Loader** | `packages/server/` (existing) | Loads `registry.json` files (M5-T1), already exists |

### Data Flow

1. **User clicks a prompt** (e.g., "Show a data table with 5 sample orders")
2. **Browser → Server** via WebSocket: `{ type: "chat", message: "...", config: { provider, model, apiKey } }`
3. **Server → Agent Bridge**: Receives chat message, fetches MCP tool definitions from registry
4. **Agent Bridge → LLM API**: Calls LLM with system prompt (built from registry schemas) + user message + MCP tool definitions
5. **LLM → Agent Bridge**: Returns tool calls (e.g., `render_component` with DataTable props)
6. **Agent Bridge → MCP Endpoint**: Executes tool calls via MCP SDK
7. **MCP Endpoint → Tool Handlers**: Existing handlers (M3-T4, M3-T5) execute the render
8. **Server → Browser** via WebSocket: `{ type: "component", componentId: "...", props: {...} }`
9. **Browser renders** PrimeVue DataTable in the render surface

## Design Decisions

### Platform Independence

GenicUI must work with any AI agent framework. The design achieves this:

- **MCP Endpoint** (`/mcp`): Standard MCP protocol. Any MCP client (LangGraph, CrewAI, Claude Code) can connect.
- **Agent Bridge** (`packages/agent-bridge/`): Uses `@modelcontextprotocol/sdk` — the standard library. Pluggable LLM providers (OpenAI, Anthropic, OpenAI-compatible).
- **WebSocket** (`/ws`): Browser receives rendered components. Framework-agnostic.

The agent bridge is a thin wrapper — not a custom LLM framework. It:
1. Fetches tool definitions from the MCP endpoint
2. Calls the LLM with those tools
3. Routes tool calls through the MCP SDK
4. Returns results

### Suggestive Prompts

Each registry's `registry.json` includes an `examplePrompts` array:

```json
{
  "examplePrompts": [
    "Show a data table with 5 sample orders",
    "Add sorting by price column",
    "Filter to active users only",
    "Enable row selection mode",
    "Show the first page with 3 rows per page"
  ]
}
```

These are **static, human-written prompts** — not dynamically generated. They demonstrate the component's capabilities and events.

### UI Layout — 3 Panel

| Panel | Width | Content |
|-------|-------|---------|
| **Left** | ~25% | LLM config, registry selector, suggestive prompts, chat input |
| **Right** | ~75% | Rendered components area |

- **LLM Config**: Provider (OpenAI/Anthropic/OpenAI-compatible), model, API key
- **Registry Selector**: Dropdown of available registries (PrimeVue for MVP)
- **Suggestive Prompts**: "Try it" chips derived from `examplePrompts`
- **Chat Input**: Freeform text input for custom prompts
- **Render Surface**: Receives components via WebSocket, renders them with PrimeVue

## Task Breakdown

### M5-T4: Playground App Skeleton (2-3 days)

Create the Nuxt 4 + PrimeVue app shell at `examples/playground/`.

**Deliverables:**
- Nuxt 4 app with PrimeVue (Aura theme) configured
- 3-panel layout: Config panel (left), Render surface (right)
- WebSocket client connects to `ws://localhost:3040/ws`
- Component renderer: receives `component` messages, renders PrimeVue components
- Empty state placeholder ("Start by configuring your LLM and clicking a prompt")
- Basic styling (PrimeVue components)

**Dependencies:** M5-T1 (registry exists)

### M5-T5: Agent Bridge Package (3-5 days)

Create `packages/agent-bridge/` — a platform-agnostic agent bridge using `@modelcontextprotocol/sdk`.

**Deliverables:**
- `AgentBridge` class: `connect(llmConfig, mcpEndpoint) → execute(prompt)`
- Uses `@modelcontextprotocol/sdk` as the MCP client (standard library)
- Supports: OpenAI, Anthropic, OpenAI-compatible providers (pluggable)
- Fetches MCP tool definitions from GenicUI server
- Routes LLM tool calls to MCP endpoint, returns results
- Single responsibility: bridge between LLM and MCP tools
- Tests: tool fetching, LLM call routing, error handling

**Dependencies:** M3-T1 (MCP server), M5-T1 (registry schemas)

### M5-T6: Suggestive Prompts + Registry Selector (2-3 days)

Add suggestive prompts, registry selector, and chat integration to the playground.

**Deliverables:**
- Registry selector dropdown (loads available registries from server)
- `examplePrompts` array added to `registry.json` (PrimeVue: 5-6 prompts)
- "Try it" prompt chips in the left panel
- Click → sends as chat message via WebSocket → agent bridge → LLM → render
- Chat history panel showing previous prompts and responses

**Dependencies:** M5-T4 (playground app), M5-T5 (agent bridge)

## Testing Strategy

- **M5-T4**: Visual inspection (demo app), WebSocket connection test
- **M5-T5**: Unit tests for `AgentBridge` class — mock LLM responses, verify MCP tool calls
- **M5-T6**: End-to-end flow test — click prompt → component renders in browser

## Out of Scope (Post-MVP)

- Multiple component registries beyond PrimeVue (Mantine, shadcn, etc.)
- Persistent chat sessions
- Multi-agent orchestration
- Voice input
- Marketplace/discovery hub

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API rate limits | Demo breaks | Use small models (Haiku, GPT-4o-mini) for demo |
| CORS issues (browser → server) | WebSocket fails | Server allows localhost origins |
| MCP SDK changes | Agent bridge breaks | Pin `@modelcontextprotocol/sdk` version |
