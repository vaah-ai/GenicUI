---
title: GenicUI Generative UI Best Practices (Sep 2026)
description: Industry best practices across five areas — schema-driven rendering, state bridges, multi-framework wrappers, agent-agnostic tools, and streaming partial updates — synthesized for GenicUI
audience: Engineering, framework architects
date: 2026-09-01
---

# Generative UI Best Practices

> **Synthesis for GenicUI:** This document distills industry best practices across the five core areas of generative agentic UI development: schema-driven UI rendering, state bridges (component → agent events), multi-framework wrappers, agent-agnostic tool registration, and streaming + partial UI updates.
>
> **Most important takeaway:** The five areas together suggest GenicUI's strongest design posture is **schemas (Zod as source of truth) + state bridges (three orthogonal mechanisms) + multi-framework wrappers (Web Components + AG-UI transport) + agent-agnostic tools (Zod-derived JSON Schema for all providers) + streaming (AG-UI event taxonomy).** This synthesis validates GenicUI's existing architecture.

---

## Executive Summary

Five best practices converge across the 2026 generative UI ecosystem:

1. **Schema as single source of truth** — define once with Zod/TypeBox; let `z.infer` produce TS types and `z.toJSONSchema()` produce the JSON Schema sent to the model
2. **Three orthogonal state bridges** — tool-call (with HITL), shared-state (AG-UI JSON-Patch), sandbox (typed postMessage envelope)
3. **Runtime/components split + transport-agnostic protocol** — assistant-ui pattern + AG-UI protocol
4. **Schema-first tool registration with strict validation** — generate Anthropic/OpenAI/MCP schemas from one Zod definition
5. **AG-UI event taxonomy as wire format** — 16+ event types; JSON-Patch state deltas; stream spec not DOM

**AG-UI's event taxonomy is the emerging convergence point** between CopilotKit, assistant-ui, Mastra, and LangGraph adapters — making it the natural backbone for GenicUI's transport layer.

---

## Table of Contents

1. [Schema-Driven UI Rendering](#1-schema-driven-ui-rendering)
2. [State Bridges (Component → Agent)](#2-state-bridges-component--agent)
3. [Multi-Framework Component Wrappers](#3-multi-framework-component-wrappers)
4. [Agent-Agnostic Tool Registration](#4-agent-agnostic-tool-registration)
5. [Streaming + Partial UI Updates](#5-streaming--partial-ui-updates)
6. [Synthesis for GenicUI](#6-synthesis-for-genicui)

---

## 1. Schema-Driven UI Rendering

### Production Reality (2026)

| Schema System | TS-Native | Wire Format | MCP Apps | Notes |
|---|---|---|---|---|
| **Zod** | ✅ (z.infer) | via `z.toJSONSchema()` (v4) | ✅ works | Dominant TS-native ecosystem (assistant-ui, CopilotKit, json-render, Tambo, Vercel AI SDK) |
| **TypeBox** | ✅ (Static) | ✅ native JSON Schema | ✅ works | Cleanest bridge; native JSON Schema + TS types |
| **JSON Schema** | ❌ (manual) | ✅ native | ✅ native | Wins at the wire (AG-UI, OpenAI Apps SDK, MCP-UI/MCP Apps) |
| **Valibot** | ✅ | via conversion | ✅ works | Smaller bundle; Standard Schema compatible |
| **ArkType** | ✅ | via conversion | ✅ works | TS-native with competitive perf |

**Key insight:** Zod dominates the TS-native ecosystem. JSON Schema wins at the wire. TypeBox is the cleanest bridge (native JSON Schema, native TS types); Zod needs `zod-to-json-schema` and may produce schemas models reject.

### Five Best Practices

1. **Schema as single source of truth** — define once with Zod/TypeBox; let `z.infer` produce TS types and `z.toJSONSchema()` (Zod v4) produce the JSON Schema sent to the model
2. **Re-validate at the trust boundary** — never trust the model. Every production system validates LLM/tool output before rendering
3. **Split catalog (what LLM may emit) from registry (what renders)** — the json-render pattern, dominant in 2026
4. **Prefer TypeBox or curated JSON Schema at LLM boundaries** — Zod-to-JSON-Schema conversion can produce schemas models fail to parse
5. **Stream the schema spec, not the rendered DOM** — `createSpecStreamCompiler` (json-render), AG-UI `STATE_DELTA` / `ToolCallChunk`, Vercel AI SDK `data-*` parts

### Concrete Pattern (json-render)

```ts
const catalog = defineCatalog(schema, {
  components: {
    Card: { props: z.object({ title: z.string() }), description: "A card container" },
    // ...
  },
  actions: {
    export_report: { description: "Export dashboard to PDF" },
  },
});

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <div className="card">
        <h3>{props.title}</h3>
        {children}
      </div>
    ),
    // ...
  },
});
```

### GenicUI Application

- **Zod or TypeBox as source of truth** for component prop schemas
- **Split into catalog (LLM may emit) and registry (renders)** — already implicit in GenicUI's design (the `find_ui_component` tool returns from a catalog; the renderer consumes a registry)
- **Stream schema spec via AG-UI** for component update events
- **`z.toJSONSchema()` for the wire format** — JSON Schema sent to Claude, GPT, LangGraph, MCP

---

## 2. State Bridges (Component → Agent)

### Three Orthogonal Mechanisms

1. **Frontend tools** — agent calls a browser function; browser executes and returns result
2. **Human-in-the-loop (HITL) tools** — UI blocks until `respond()` / `addResult()`
3. **Bidirectional shared state** — synchronous state mirroring via JSON-Patch diffs

### Five Best Practices

1. **Frontend tools registered in the browser**
   - CopilotKit: `useFrontendTool`
   - Vercel AI SDK: `useChat` + `onToolCall` + `addToolOutput`
   - assistant-ui: `makeAssistantTool`

2. **Human-in-the-loop tools**
   - CopilotKit: `useHumanInTheLoop` / `renderAndWaitForResponse`
   - assistant-ui: `humanTool()`
   - Vercel AI SDK: `addToolApprovalResponse`

3. **Bidirectional shared state**
   - CopilotKit: `useCoAgent` + `useCoAgentStateRender`
   - Agent emits state via AG-UI's `STATE_DELTA` / `STATE_SNAPSHOT` events

4. **Cross-origin sandboxed widgets via postMessage**
   - OpenAI Apps SDK: `window.openai.callTool` / `setWidgetState`
   - MCP-UI: typed envelope (`tool`, `prompt`, `link`, `intent`, `notify`)

5. **AG-UI as normalized event bus**
   - 16+ event types: `RUN_STARTED/FINISHED/ERROR`, `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START/ARGS/END/RESULT`, `STATE_DELTA` (RFC 6902 JSON-Patch), `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT`, `REASONING`

### GenicUI Application

GenicUI's design directly maps to all three orthogonal mechanisms:

| Bridge | GenicUI Tool/Event |
|---|---|
| Frontend tools | `render_component`, `update_component` (agent → UI) |
| HITL | Implicit in event subscriptions (user clicks button → component event → agent tool call) |
| Bidirectional shared state | `subscribe_to_events` (UI → agent) + `update_component` (agent → UI) |
| Sandboxed widgets | (Not primary — GenicUI mounts natively; MCP Apps adapter is optional) |
| AG-UI event bus | Adopt AG-UI as GenicUI's internal event taxonomy |

---

## 3. Multi-Framework Component Wrappers

### Per-System Landscape

| System | Approach | Library-Agnostic? |
|---|---|---|
| **assistant-ui** | Runtime/components split; React-only by design | ❌ React |
| **CopilotKit + AG-UI** | AG-UI is multi-framework; React primary | ✅ AG-UI is transport-agnostic |
| **MCP-UI / MCP Apps** | Iframe + postMessage; works in any framework | ✅ iframe-isolated |
| **AG-UI** | Transport-agnostic event protocol; SDKs in 8+ languages | ✅ transport-agnostic |
| **shadcn/ui + Radix Slot** | Gold-standard composition primitive (`asChild`) | ❌ React (but pattern is portable) |
| **React Aria** | Render-props + hooks reference | ❌ React |
| **Bit.dev / Lit + Web Components** | Scope-based cross-framework sharing | ✅ Web Components |

### Five Best Practices

1. **Separate rendering from logic via a runtime/headless layer** — assistant-ui's runtime/components split
2. **Use AG-UI for transport-agnostic agent↔UI communication** — event-stream abstraction, replaceable transport
3. **Slot pattern (`asChild`) for framework-agnostic composition** — Radix Slot merges props/refs onto consumer's child element
4. **Render props / children-as-function to expose internal state** — React Aria's pattern
5. **Iframe-sandboxed UI over postMessage for cross-framework widgets** — MCP-UI / OpenAI Apps SDK

### GenicUI Application

Per the tech stack recommendation (Stack B — Bun + Elysia + TypeBox + WebSocket):
- **Web Components underneath** as the lowest-common-denominator render target
- **Framework shims** (Vue/React/Svelte/Solid) consume the Web Components
- **AG-UI as the transport-agnostic event protocol**
- **Slot pattern (`asChild` for React, native slots for Vue/Svelte)** for framework-native composition

```ts
// Web Component defined once
class GenicUIElement extends HTMLElement {
  static schema = Type.Object({ cartId: Type.String() });
  static events = Type.Object({ removeItem: Type.Object({ itemId: Type.String() }) });
  // Lifecycle, prop diffing, event emission
}
customElements.define('genic-cart-viewer', GenicUIElement);

// Vue shim
export const CartViewer = defineComponent({
  props: { cartId: String },
  setup(props) {
    return () => h('genic-cart-viewer', { cartId: props.cartId });
  },
});

// React shim
export const CartViewer = ({ cartId }) => <genic-cart-viewer cartId={cartId} />;
```

---

## 4. Agent-Agnostic Tool Registration

### Comparison Matrix

| Aspect | Anthropic | OpenAI | MCP | LangChain | Vercel AI SDK | Gemini |
|---|---|---|---|---|---|---|
| **Container** | `tools: [...]` | `tools: [...]` | `tools/list` + `tools/call` | `tools=[...]` | `tools: { name: tool({...}) }` | `tools: [{functionDeclarations:[...]}]` |
| **Schema dialect** | flat `input_schema` | nested `function.parameters` (JSON Schema + `strict:true`) | JSON-RPC + `inputSchema` + `outputSchema` | type hints / Pydantic `args_schema` | Zod (preferred) or JSON Schema | OpenAPI 3.0 JSON Schema subset |
| **Call signal** | `content: [{type:"tool_use", id, name, input}]` | `output: [{type:"function_call", call_id, name, arguments}]` | `tools/call` JSON-RPC | inherited from provider | inherited | `function_call` part |
| **Result echo** | `user` `tool_result` blocks (`tool_use_id`) | `function_call_output` keyed by `call_id` | `tools/call` result `{content, structuredContent?, isError}` | `ToolMessage` | `tool-result` part (auto) | `function_response` with matching `id` |
| **UI hooks** | none native | Apps SDK `_meta` extensions | `_meta["openai/outputTemplate"]`, `_meta["ui"].resourceUri`, `_meta["openai/widgetAccessible"]` (Deferred) | none native | `streamUI` returns React | none native |

### Five Best Practices

1. **Schema-first with 3-4+ sentence descriptions** — Anthropic: "by far the most important factor in tool performance"
2. **Consolidate related ops into one tool with an `action` parameter** — fewer, more capable tools
3. **Use strict/validated mode** — OpenAI `strict:true`, Anthropic `strict:true`, Gemini `tool_choice:"validated"`
4. **Return only high-signal data** — UUIDs/slugs, not opaque blobs
5. **For UI-bearing tools, expose via MCP with `_meta["openai/outputTemplate"]` + `ui://` resource URI**

### GenicUI Application

- **Generate Anthropic / OpenAI / MCP schemas from one Zod or TypeBox definition**
- **Mark `strict:true`** for Anthropic and OpenAI variants
- **Expose UI-bearing tools via MCP** with `_meta["ui"].resourceUri` for MCP Apps compatibility
- **Use 3-4+ sentence descriptions** for each tool's purpose, params, and expected behavior

```ts
// GenicUI's find_ui_component tool — schema-first with detailed description
const findUiComponentTool = {
  name: 'find_ui_component',
  description: `
    Find UI components in the user's conversation surface that match a natural-language
    description of what the user wants to see or interact with. Returns matching component
    metadata including the component ID, a description of what it does, and the props
    schema. Use this before calling render_component to ensure the component is available.
    Always prefer components that exactly match the user's intent over generic ones.
  `,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural-language description of the UI the user wants' },
      limit: { type: 'number', description: 'Maximum number of components to return (default: 5)' },
    },
    required: ['query'],
  },
};
```

---

## 5. Streaming + Partial UI Updates

### Provider SSE Formats

- **OpenAI `chat.completions`** uses `data:` SSE chunks with `choices[].delta`; tool calls stream progressively (`function.arguments` accumulates as a string)
- **Anthropic `messages.stream`** uses lifecycle:
  - `message_start` → `content_block_start` → N×`content_block_delta` → `content_block_stop` → `message_delta` → `message_stop`
  - Deltas carry `text_delta`, `input_json_delta`, `thinking_delta`, `signature_delta`

### Standardized Event Protocol (AG-UI)

- 16+ event types including `RUN_STARTED/FINISHED/ERROR`, `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START/ARGS/END/RESULT`, `STATE_SNAPSHOT`, `STATE_DELTA` (RFC 6902 JSON-Patch), `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT`

### Vercel AI SDK UI Message Stream

- Discriminated-union parts: `text`, `reasoning`, `source-url`, `tool-call`, `tool-result`, `data-*` (custom structured parts for streaming UI)
- `validateUIMessages` with `TypeValidationError` fallback is required

### Streaming a UI Tree

assistant-ui `ExternalStoreRuntime` + `useExternalMessageConverter`:
```ts
// push empty assistant message → for-await chunks → setMessages(...)
```

### Decoupled Widget Pattern (OpenAI Apps SDK)

Split into **data tools** (return `structuredContent`, no template) and **render tools** (attach `ui://` template via `_meta.ui.resourceUri`). Avoids iframe remount churn.

**Widget calls data tools directly** via `window.openai.callTool` — no remount.

**Three-tier state model:**
- **Business data** (MCP server, long-lived)
- **UI state** (iframe, ephemeral)
- **Cross-session** (server storage, durable)

### Five Best Practices

1. **Two-phase tool pattern for generative UI** — separate data tools from render tools
2. **Validate `data-*` parts with schemas** — `validateUIMessages` + catch `TypeValidationError`
3. **JSON Patch (RFC 6902) for state deltas** — emit `STATE_DELTA` events instead of full snapshots
4. **Index content blocks by `index`, not arrival order** (Anthropic) — always track `index` from `content_block_start`
5. **Mutate assistant messages in-place in your store for streaming** (assistant-ui) — immutable updates + memoize callbacks + `useShallow`

### GenicUI Application

- **Two-phase tool pattern** for GenicUI's render flow:
  - **Data tools:** `get_cart_data`, `get_user_profile` (return JSON, no UI)
  - **Render tools:** `render_cart_viewer` (attaches `_meta.ui.resourceUri`)
- **AG-UI event taxonomy** as internal wire format
- **JSON-Patch (RFC 6902) state deltas** for `update_component` — emit patches, not full snapshots
- **Strict validation at trust boundary** — every event re-validated against component's TypeBox schema
- **Index-by-`index`** for Anthropic content blocks

```ts
// AG-UI event for component prop update
const updateEvent: STATE_DELTA = {
  type: 'STATE_DELTA',
  timestamp: Date.now(),
  componentId: 'cart-viewer-abc123',
  patch: [
    { op: 'replace', path: '/props/items/0/quantity', value: 3 },
    { op: 'add', path: '/props/items', value: { /* new item */ } },
  ],
  reason: 'User clicked "+" on widget-42',
};
```

---

## 6. Synthesis for GenicUI

### Combined Best-Practice Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GenicUI MCP Server                                         │
│  ├── Four primary tools (find/render/update/subscribe)     │
│  │   ├── Zod/TypeBox schemas → JSON Schema for all agents  │
│  │   ├── Strict validation at trust boundary               │
│  │   └── 3-4+ sentence descriptions per Anthropic guidance │
│  ├── MCP Apps adapter (SEP-1865 compatibility)              │
│  │   └── _meta.ui.resourceUri on UI-bearing tools          │
│  └── AG-UI protocol adapter                                 │
│      └── 16+ event types; JSON-Patch state deltas          │
├─────────────────────────────────────────────────────────────┤
│  Transport                                                  │
│  ├── WebSocket primary (bidirectional state)                │
│  ├── SSE for LLM token streaming                            │
│  ├── MCP stdio / Streamable HTTP for tool calls             │
│  └── Multiplexed channels (one socket, many components)     │
├─────────────────────────────────────────────────────────────┤
│  UI Wrapper Layer (Web Components underneath)                │
│  ├── Framework-agnostic core                                │
│  ├── Vue / React / Svelte / Solid shims                     │
│  └── Slot pattern for framework-native composition          │
├─────────────────────────────────────────────────────────────┤
│  Conversation Surface                                       │
│  ├── Catalog (what LLM may emit)                            │
│  ├── Registry (what renders)                                │
│  └── Streaming component updates via JSON-Patch            │
└─────────────────────────────────────────────────────────────┘
```

### Five Synthesis Points

1. **Schemas** — Zod as source of truth, `z.toJSONSchema()` for the wire, catalog/registry split (json-render pattern), re-validate at the trust boundary
2. **State bridges** — Expose three orthogonal bridges:
   - Tool-call (with HITL `respond`/`addResult`)
   - Shared-state (AG-UI `STATE_SNAPSHOT` / `STATE_DELTA` JSON-Patch)
   - Sandbox (typed postMessage envelope, optional)
3. **Multi-framework wrappers** — assistant-ui runtime/components split, AG-UI transport-agnostic protocol, Slot/render-prop primitives, iframe/postMessage escape hatch
4. **Agent-agnostic tools** — Generate Anthropic / OpenAI / MCP schemas from one Zod definition, mark `strict:true`, expose UI-bearing tools via MCP with `_meta.openai/outputTemplate`
5. **Streaming** — Adopt AG-UI's 16+ event taxonomy as wire format; stream the schema spec (not the DOM); use decoupled data-tool + render-tool pattern for iframe widgets

### Adopted Best Practices Checklist

- [x] Schema as single source of truth (Zod/TypeBox)
- [x] Catalog/registry split (json-render pattern)
- [x] Three orthogonal state bridges (tool-call + shared-state + sandbox)
- [x] Runtime/components split (assistant-ui pattern)
- [x] AG-UI transport-agnostic protocol
- [x] Slot pattern (`asChild` for React, native slots for Vue/Svelte)
- [x] Schema-first tool registration with strict mode
- [x] 3-4+ sentence tool descriptions
- [x] Two-phase tool pattern (data tools + render tools)
- [x] JSON-Patch (RFC 6902) for state deltas
- [x] Strict validation at trust boundary
- [x] Index-by-`index` for Anthropic content blocks

---

## Sources

### Production Systems Studied
- [Vercel AI SDK](https://ai-sdk.dev) · [vercel/ai-elements](https://github.com/vercel/ai-elements)
- [assistant-ui](https://www.assistant-ui.com/docs)
- [CopilotKit](https://docs.copilotkit.ai/) · [AG-UI](https://docs.ag-ui.com)
- [json-render](https://json-render.dev)
- [Tambo](https://docs.tambo.co)
- [LangGraph](https://langchain-ai.github.io/langgraph/concepts/streaming/)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)

### Provider Specs
- [Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Anthropic Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI Chat Streaming](https://platform.openai.com/docs/api-reference/chat-streaming)
- [MCP Tools Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [LangChain Tools](https://docs.langchain.com/oss/python/langchain/tools)

### Composition Primitives
- [Radix Slot](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [React Aria](https://react-aria.adobe.com/getting-started)
- [Bit.dev](https://bit.dev)
- [Lit](https://lit.dev)

### Standards
- [JSON-Patch RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)
- [JSON Schema](https://json-schema.org/)
- [Standard Schema](https://github.com/standard-schema/standard-schema)
