---
title: GenicUI Streaming UI Patterns Research (Sep 2026)
description: Comprehensive analysis of streaming transports (SSE, WebSocket, MCP stdio), SDK patterns (Vercel AI SDK, LangGraph, assistant-ui, CopilotKit), and partial-update mechanisms for generative agentic UIs
audience: Engineering, framework architects
date: 2026-09-01
---

# Streaming UI Patterns Research

> **Context for GenicUI:** GenicUI needs bidirectional state flow between LLM agents and UI components — agent pushes component prop updates, components emit user-action events. Streaming is core to the UX, not a feature.
>
> **Scope:** This document covers transport protocols, SDK patterns, partial-rendering strategies, and emerging standards (AG-UI) as of September 2026.

---

## Executive Summary

The streaming UI space has converged on three dominant transports (SSE for LLM text, WebSocket for multimodal, MCP for tool calls) and three dominant client SDKs (Vercel AI SDK for breadth, LangGraph for semantics, assistant-ui + CopilotKit for UX). **AG-UI protocol (CopilotKit)** is emerging as the convergence event-taxonomy — its 16+ event types and JSON-Patch state deltas are the natural backbone for any future agent↔UI protocol.

For GenicUI specifically:
- **Transport:** WebSocket primary (bidirectional state), MCP stdio/SSE for tool calls to external servers
- **Streaming pattern:** Stream the schema spec (not rendered DOM); partial JSON repair; two-phase tool pattern
- **State:** JSON-Patch (RFC 6902) state deltas, not full snapshots
- **Validation:** Strict validation at trust boundary; never trust LLM/tool output

---

## Table of Contents

1. [Transport Protocols](#1-transport-protocols)
2. [Client SDKs](#2-client-sdks)
3. [Partial Rendering Patterns](#3-partial-rendering-patterns)
4. [Industry-Leading Patterns](#4-industry-leading-patterns)
5. [Recommendations for GenicUI](#5-recommendations-for-genicui)

---

## 1. Transport Protocols

### 1a. Server-Sent Events (SSE) for AI Streaming

| | |
|---|---|
| **Spec** | [HTML Living Standard / EventSource](https://html.spec.whatwg.org/multipage/server-sent-events.html) |
| **Direction** | Server → Client (unidirectional) |
| **Format** | `text/event-stream` with `data:`, `event:`, `id:`, `retry:` fields |

#### Features
- **Streaming primitives:** SSE events with structured fields; native `EventSource` API; resumable via `Last-Event-ID` header
- **Partial rendering:** Clients typically parse delta JSON (e.g., `{choices:[{delta:{content:"..."}}]}`) and append to message buffer on each event
- **JSON streaming:** Anthropic and OpenAI emit one SSE event per token; structured tool-call deltas are streamed as separate typed events (`event: tool_use`, `event: content_block_delta`)
- **Cancellation / disconnect:** Closing the `EventSource` or the HTTP request cancels the upstream inference call when the server respects `req.on('close')`

#### Adoption
- **Backed natively** by OpenAI, Anthropic, Google, Mistral, Groq, xAI, and every major LLM proxy
- Documented in the Vercel AI SDK (`streamText`, `streamUI`), LangChain (`streamEvents`), and LangGraph
- Polyfills: `eventsource` and `@microsoft/fetch-event-source` (combined 10M+ downloads/week)

#### Limitations
- **HTTP/1.1 6-connection-per-origin limit per browser tab** — real-world issue for multi-tab GenicUI hosts
- **Unidirectional** — agent → UI only; component → agent events need a separate HTTP POST channel
- Mitigated by HTTP/2 multiplexing but requires explicit reverse-proxy config

---

### 1b. WebSocket for Bidirectional Streaming

| | |
|---|---|
| **Spec** | RFC 6455 |
| **Direction** | Full-duplex bidirectional |
| **Format** | Binary or text frames; supports subprotocols |

#### When to Use (vs SSE)
- **Voice/audio:** Realtime voice agents (LiveKit, Vapi, Retell, Pipecat)
- **Collaborative:** Multi-user editing, multiplayer state
- **Multimodal:** Real-time image/video/screen-share updates
- **Sub-100ms interactive feedback:** Anything where SSE's per-event overhead matters

#### Libraries
- `socket.io` (~5M weekly downloads) — opinionated, room/topic multiplexing
- `ws` (~150M weekly downloads) — minimalist, raw WebSocket
- `@microsoft/fetch-event-source` (~7M weekly downloads) — SSE alternative with better headers

#### Limitations
- **Reverse proxy fragility:** nginx, Cloudflare proxy, corporate firewalls frequently strip or hang WS upgrades
- **WebTransport future-proofing needed:** HTTP/2 + WebTransport is the path forward; WebTransport isn't Safari-stable yet
- **Per-message deflate / subprotocol negotiation varies** between runtimes — abstraction required for cross-runtime portability

---

### 1c. MCP Transport

| | |
|---|---|
| **Spec** | [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) |
| **Direction** | Bidirectional via JSON-RPC 2.0 |
| **Format** | JSON-RPC over stdio, SSE, or Streamable HTTP |

#### Features
- **Tools, resources, prompts** as core primitives
- **Stateless HTTP** deployment for horizontal scaling
- **Server-initiated sampling** — servers can request LLM completions from clients (new in 2026-07-28 spec)
- **OAuth 2.1 hardening** for governance-first security

#### Adoption
- 10,000+ active public MCP servers (Anthropic, Dec 2025/2026)
- 67M monthly downloads of local MCP servers (Anthropic, April 2026)
- Adoption roughly doubling every 6 months

#### Relevant to GenicUI
- GenicUI's four MCP tools (`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`) ride on MCP transport
- Cloudflare's `@modelcontextprotocol/sdk` now ships Workers-compatible transport
- FastMCP (Python) has ~70% MCP server market share

---

## 2. Client SDKs

### 2a. Vercel AI SDK

| | |
|---|---|
| **URL** | https://ai-sdk.dev · npm: `ai` |
| **Latest** | v7.0.85 (Apache-2.0, published 2026-08-30) |
| **Frameworks** | React, Svelte, Vue, Angular |
| **Weekly downloads** | ~6M/week (across AI SDK family) |

#### Core APIs
- `generateText` / `streamText` / `generateObject` / `streamObject`
- React hooks: `useChat`, `useCompletion`, `useObject`
- Tool/agent runtime with multi-step execution
- Structured output via Zod schemas

#### Streaming Primitives
- **`streamText()` returns a `UIMessageStream`**
- `useChat` and `useCompletion` automatically render each delta as it arrives
- `streamUI` lets a tool/agent emit JSX-shaped UI chunks that stream into the chat surface (foundation of agentic generative UI)

#### Partial Rendering
- `useChat` updates managed message state per delta
- `UIMessage.parts[]` carries typed parts (`text`, `tool-call`, `tool-result`, `data`, `reasoning`) that render incrementally

#### JSON Streaming
- **`streamObject({ schema })` incrementally parses a JSON document against a Zod schema** using `partialDeepClone` so the UI can render typed objects before the full payload arrives

#### Tool/Agent Integration
- `tool({...})`, `maxSteps` for multi-step agents, `stopWhen`
- `experimental_generateImage`, MCP client support
- `onData` / `onFinish` callbacks for analytics

#### Interrupts
- `addToolOutput`, `addToolApprovalResponse`, `addToolResult`, `experimental_resume` to rehydrate streams on reconnect

#### MCP Support
- `@ai-sdk/mcp` (experimental) — `experimental_createMCPClient` with stdio or SSE
- MCP tools surface as `dynamicTool` runtime schemas

---

### 2b. AI Elements (Vercel)

| | |
|---|---|
| **URL** | [vercel/ai-elements](https://github.com/vercel/ai-elements) · npm: `ai-elements` |
| **GitHub stars** | 2.4k★ |
| **License** | Apache-2.0 |

#### Description
A shadcn/ui-style component registry (not a runtime dependency — components are copied into your codebase) that ships pre-built, customizable React primitives for AI-native interfaces.

#### Components
- `<Conversation>`, `<Message>`, `<MessageContent>`, `<MessageResponse>`
- `<Reasoning>`, `<Sources>`, `<Tool>`, `<Plan>`, `<Attachment>`, `<InlineCitation>`

#### Integration
- Built directly on `useChat()` from `@ai-sdk/react`
- Role-based message rendering via `from="user" | "assistant" | "system"`
- Streaming-aware: each component subscribes to `UIMessage.parts[]` and re-renders incrementally
- Tool/agent rendering: `<Tool>` and related components consume tool-call / tool-result parts and show pending → running → completed states

---

### 2c. LangChain / LangGraph

| | |
|---|---|
| **URL** | [LangGraph Streaming Docs](https://langchain-ai.github.io/langgraph/concepts/streaming/) · npm: `@langchain/core` |
| **Latest** | `@langchain/core@1.2.9` (MIT, ~1 week ago) |

#### Stream Modes
LangGraph models agents as stateful graphs whose nodes can be LLMs, tools, or sub-agents, and exposes five stream modes:
- `values` — full state snapshots after each node
- `updates` — deltas after each node
- `messages` — token-by-token LLM messages
- `events` — low-level callback events
- `custom` — user-defined

**2026 addition:** `agent.run()` native `stream_mode='partial'` that surfaces in-progress tool calls, token buffers, and reasoning chains before the final answer is returned.

#### Partial Rendering
- Each node update is a `{nodeName: partialState}` delta
- UIs typically merge these into a single observable state, then render each component conditionally on whether its field is populated

#### JSON Streaming
- `JsonOutputParser`, `StructuredOutputParser`, and `stream_object`-style incremental parsers in LangChain core
- Tool-call deltas stream through `messages` mode

#### Interrupts
- `interrupt_before` / `interrupt_after` + `Command` resume for human-in-the-loop, which pairs with UI approval cards

---

### 2d. assistant-ui

| | |
|---|---|
| **URL** | [assistant-ui](https://github.com/assistant-ui/assistant-ui) · npm: `@assistant-ui/core` |
| **Latest** | `@assistant-ui/core@0.3.16` (~4 days old) |
| **GitHub stars** | 12k★ · MIT |
| **Backing** | Y Combinator |

#### Architecture
Composes the entire chat surface — messages, threads, runs, tools, attachments, interrupts — as composable primitives rather than a single chat component.

#### Streaming Primitives
- `useChatRuntime` (and `useExternalStoreRuntime` / `useCloudRuntime`) subscribe to an `assistant-stream` transport
- `assistant-stream` carries typed events for text, reasoning, tool calls, attachments, and approvals

#### Message Model
- Messages expose a `parts[]` model (`text`, `tool-call`, `tool-result`, `data`, `reasoning`) so each part renders incrementally

#### Tool UI
- `makeAssistantTool`, `makeAssistantToolUI`, `useAssistantInstructions`
- Autoscroll/retry primitives

#### Multi-Platform
- Shared runtime for web, mobile, and terminal (March 2026 launch)

---

### 2e. CopilotKit

| | |
|---|---|
| **URL** | [CopilotKit](https://github.com/CopilotKit/CopilotKit) · npm: `@copilotkit/runtime` |
| **Latest** | `@copilotkit/runtime@1.69.3` (MIT, 5 days ago) |
| **GitHub stars** | 37.1k★ |
| **Funding** | $27M Series A (May 2026) |

#### Description
Full-stack layer that ships a runtime agent server, a React client SDK (`<CopilotChat>`, `useAgent`, `useFrontendTool`, `useHumanInTheLoop`), and the open AG-UI protocol for bi-directional agent↔UI streaming.

#### Streaming Primitives
- AG-UI events (`TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `STATE_DELTA`, `STEP_STARTED/FINISHED`, `REASONING`) emitted over Server-Sent Events by the runtime, consumed by `useAgent`

#### Partial Rendering
- `useFrontendTool` exposes `status` + `args` props so the rendered component streams live into the chat surface
- Reasoning streams render directly in the chat for o3/o4-mini and Claude extended-thinking

#### JSON Streaming
- `untruncate-json` + `clarinet`-style incremental JSON parsing for tool args and generative-UI payloads

#### Generative UI Spectrum
- Controlled (`useComponent` with predefined library)
- Declarative (Google A2UI protocol)
- Open-ended (sandboxed iframe HTML)

#### Shared State
- `useAgent` exposes `agent.state` readable/writable from the UI
- `agent.setState()` for direct mutation

---

## 3. Partial Rendering Patterns

### 3a. Tool UI Streaming

**Description:** A pattern where the agent emits a `tool-call` event that resolves into a fully-typed React component streamed inline into the chat. The component renders with a `pending`/`running`/`complete` status prop, so the UI shows a skeleton or partial result while the underlying tool/agent work executes.

**Adopters:**
- [Vercel AI SDK `streamUI`](https://ai-sdk.dev/docs/foundations/streaming)
- [CopilotKit `useFrontendTool`](https://docs.copilotkit.ai/)
- [assistant-ui Tool UI](https://www.assistant-ui.com/docs)

**Features:**
- Inline component render
- Status-driven props (`status: "pending" | "running" | "complete"`)
- Partial args rendered as the JSON args stream in
- Supports confirmation/approval interrupts before execution

---

### 3b. JSON Delta Parsing

**Description:** A streaming parser that incrementally accepts a partial JSON document, validates each prefix against a Zod (or standard-schema) schema, and emits a typed object whose fields populate as soon as they are well-formed. This lets UIs render form fields, tables, and charts progressively without waiting for the full object.

**Adopters:**
- Vercel AI SDK's `streamObject`
- assistant-ui's `assistant-stream`
- CopilotKit's `untruncate-json`

**Features:**
- `partialDeepClone` for nested objects
- Field-by-field emission
- Tolerated trailing commas / unterminated strings
- Tolerant of truncated tokens

---

### 3c. Progressive Rendering

**Description:** Coordinates three streams at once: (a) text token deltas, (b) structured tool/part deltas, and (c) agent-state updates. Each layer renders independently so the user sees something — text first, then reasoning, then tool cards, then the finalized component — within the first few hundred milliseconds.

**Features:**
- Multi-layer state machines (running → awaiting-approval → completed)
- Skeleton/placeholder shells
- Optimistic UI
- Reasoning/CoT streams rendered in collapsible `<Reasoning>` panels
- Partial JSON repair
- Auto-scroll & virtualized lists via `use-stick-to-bottom` / `@tanstack/react-virtual`
- AG-UI protocol standardizes the event order across runtimes

---

## 4. Industry-Leading Patterns

### 4a. Two-Phase Tool Pattern (OpenAI Apps SDK)

**Description:** Split into **data tools** (return `structuredContent`, no template) and **render tools** (attach `ui://` template via `_meta.ui.resourceUri`). Avoids iframe remount churn.

**Implementation:**
- Widget calls data tools directly via `window.openai.callTool` — no remount
- Three-tier state model:
  - **Business data** (MCP server, long-lived)
  - **UI state** (iframe, ephemeral)
  - **Cross-session** (server storage, durable)

**Benefit:** Avoids the costly remount + state loss when a tool call returns and the widget re-renders with new data.

---

### 4b. AG-UI Event Protocol (Emerging Standard)

**Description:** CopilotKit's open event-based protocol with 16+ event types standardizing agent↔UI communication.

**Event Types:**
- `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`
- `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`
- `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_RESULT`
- `STATE_SNAPSHOT`, `STATE_DELTA` (RFC 6902 JSON-Patch)
- `MESSAGES_SNAPSHOT`
- `ACTIVITY_SNAPSHOT`
- `REASONING_*`

**Adoption:**
- 1st-party integrations: Microsoft Agent Framework, Google ADK, AWS Strands, AWS Bedrock AgentCore, Mastra, Pydantic AI, Agno, LlamaIndex, AG2, LangChain, CrewAI
- Community: Claude Agent SDK, Langroid, OpenAI Agent SDK, Cloudflare Agents

**Significance:** AG-UI is the emerging convergence point for agent↔UI protocols. Adopting it as GenicUI's wire format gives broad compatibility for free.

---

### 4c. Streaming-Spec Pattern (json-render)

**Description:** Stream the schema spec (not the rendered DOM). `createSpecStreamCompiler` (json-render) emits a stream of catalog/registry operations that the client incrementally applies to its local component tree.

**Pattern:**
1. Server emits catalog spec chunks over SSE
2. Client buffers chunks
3. Each valid prefix triggers a re-render of the partial tree
4. Final chunk triggers a reconciliation pass

**Benefit:** Server-side authority over what components are available, but client-side performance for rendering.

---

### 4d. Two-Tier State Model (CopilotKit)

**Description:** Separate **agent state** (long-lived, agent-owned) from **UI state** (ephemeral, browser-owned) with explicit sync events.

**Implementation:**
- `STATE_SNAPSHOT` — agent emits full state at conversation start
- `STATE_DELTA` — agent emits JSON-Patch diffs on mutation
- UI subscribes to both events and merges into its local store

**Benefit:** Clean separation of concerns; agent owns business logic, UI owns view state.

---

## 5. Recommendations for GenicUI

### Transport Strategy
- **Primary:** WebSocket for bidirectional state flow between MCP server and conversation surface
- **Tool calls:** MCP stdio + Streamable HTTP (per MCP 2026-07-28 spec)
- **LLM text streaming:** SSE (use OpenAI/Anthropic patterns)
- **Component prop updates:** WebSocket with multiplexed channels (one socket per conversation, many component streams inside)

### Streaming Pattern
- **Stream the schema spec, not the rendered DOM** — `update_component` sends JSON Patch (RFC 6902) state deltas to the Web Components
- **Partial JSON repair** for LLM-emitted JSON args
- **Two-phase tool pattern** — separate data tools (`get_cart_data`) from render tools (`render_cart_viewer`)

### Event Taxonomy
- **Adopt AG-UI as the wire format** — gives broad compatibility and 16+ event types for free
- Add GenicUI-specific extensions:
  - `RENDER_COMPONENT` (component mounted)
  - `UPDATE_COMPONENT` (prop diff)
  - `COMPONENT_EVENT` (user-action back-channel)
  - `FIND_COMPONENT_RESULT` (semantic search match)

### State Management
- **JSON-Patch state deltas** for component prop updates (not full snapshots)
- **Strict validation at trust boundary** — never trust LLM/tool output
- **Re-validate every event** against the component's TypeBox schema

### Tool/API Patterns
- **Schema-first with 3-4+ sentence descriptions** — Anthropic: "by far the most important factor in tool performance"
- **Consolidate related ops into one tool with an `action` parameter** — fewer, more capable tools
- **Use strict/validated mode** — `strict:true` for Anthropic/OpenAI
- **Return only high-signal data** — UUIDs/slugs, not opaque blobs

### Specific Implementation Notes

```ts
// GenicUI WebSocket event (extends AG-UI)
type GenicUIEvent =
  | AGUIEvent
  | { type: 'RENDER_COMPONENT'; componentId: string; schema: TypeBox; props: unknown }
  | { type: 'UPDATE_COMPONENT'; componentId: string; patch: JSONPatch; reason: string }
  | { type: 'COMPONENT_EVENT'; componentId: string; event: string; payload: unknown };

// GenicUI tool definition (TypeBox-derived JSON Schema for MCP)
const findUiComponentTool = {
  name: 'find_ui_component',
  description: '...', // 3-4+ sentences per Anthropic best practice
  inputSchema: Type.Object({
    query: Type.String({ description: 'Natural language description of the UI the user wants' }),
    limit: Type.Optional(Type.Number({ default: 5 })),
  }),
};
```

### KPI Targets
- Time-to-first-byte for `render_component`: <100ms (server) + <50ms (client mount)
- `update_component` roundtrip: <50ms WebSocket latency
- Stream reliability: 99.9% with auto-reconnect and replay

---

## Sources

### Specs
- [WHATWG Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [WebSocket RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [JSON-Patch RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)
- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)

### SDKs
- [Vercel AI SDK](https://ai-sdk.dev) · [Vercel AI Elements](https://github.com/vercel/ai-elements)
- [LangGraph Streaming](https://langchain-ai.github.io/langgraph/concepts/streaming/)
- [assistant-ui](https://www.assistant-ui.com/docs)
- [CopilotKit](https://docs.copilotkit.ai/)

### Patterns
- [OpenAI Apps SDK Storage](https://developers.openai.com/apps-sdk/build/storage)
- [AG-UI Protocol Events](https://docs.ag-ui.com/concepts/events)
- [json-render Streaming](https://json-render.dev)
- [Vercel AI SDK UIMessage](https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message)
