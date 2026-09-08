---
feature_id: F43b
title: "Chat-bridge prop sanitization"
phase: "Tool Surface"
priority: High
effort: S
dependencies: [F16, F40, F46]
methodology: Specification by Example
status: approved
verified: true
verified_by: bridge-latency-uat
verified_at: 2026-09-07
sources:
  - ../architecture.md#phase-2b-chat-bridge-render-claude-code--codex-streams
related:
  - "F43: Suggestive prompts + registry selector (implemented as the chat-bridge UI)"
  - "F16: render_component tool — strict trust boundary (preserved by this fix)"
  - "F40: PrimeVue registry — DataTable schema that the sanitizer prepares for"
---

# F43b — Chat-bridge prop sanitization

`bridgeRenderComponent` in `packages/server/src/chat/chat-handler.ts` runs incoming `tool_call` arguments through `sanitizeBridgeProps` before passing them to `renderComponent()`. The sanitizer normalizes two known MCP-transport quirks so the chat-bridge path renders on the first attempt instead of triggering Claude Code's MCP retry loop.

## Why

When the agent reaches the playground via the chat bridge (Claude Code / Codex stream-json) instead of the MCP-direct trust boundary, the wire shape is not always JSON-Schema-clean:

1. **MCP-wrapped arrays.** Claude Code's MCP wrapper encodes arrays of objects as a single-key object envelope: `{ item: [...] }`. Our component schemas (e.g. `DataTable.rows`) expect a flat array. Without unwrapping, `validateProps()` rejects the call with `-32003 props_invalid`.
2. **Quoted integer scalars.** Claude Code sometimes quotes integer-looking values that the schema expects as numbers (e.g. `pageSize: "10"`).

A `-32003` rejection is a **recoverable tool failure** from Claude Code's perspective, so the MCP wrapper retries the same bad payload up to ~25 times before giving up. Each retry costs ~1s of model + tool-execution time, so a single DataTable prompt spends 25–30 s spinning in running-accordions before the user sees a mount. The same prompt in the POC rendered in ~3 s because the POC's `McpBridge` *was* the renderer — validation happened once, server-side, before Claude ever saw a tool result.

## Where the sanitizer runs

```
chat.event stream ─▶ bridgeRenderComponent()
                          │
                          ▼
                    sanitizeBridgeProps(args.props)
                          │
                          ▼
                    renderComponent({ name, props })
                          │
                          ▼
                    validateProps(props, schema)   ← strict, unchanged
                          │
                          ▼
                    componentStore.register(...)
```

The MCP-direct trust boundary at `packages/server/src/mcp/index.ts` is **not** modified. External callers still see strict validation; the sanitizer runs **only inside the chat bridge**, which is internal and only callable by our own Claude Code / Codex adaptors.

## Inputs / Outputs

**Input (raw chat-bridge `tool_call.args`):**

```json
{
  "name": "DataTable",
  "props": {
    "pageSize": "10",
    "rows": { "item": [ { "id": "ORD-1001", "customer": "Olivia Martin" } ] }
  }
}
```

**Output (after `sanitizeBridgeProps`):**

```json
{
  "name": "DataTable",
  "props": {
    "pageSize": 10,
    "rows": [ { "id": "ORD-1001", "customer": "Olivia Martin" } ]
  }
}
```

## Sanitization rules

The sanitizer (`sanitizeBridgeValue`) is intentionally conservative:

| Shape detected | Transform | Rationale |
|---|---|---|
| Array | recurse each element | preserve nested wrapping |
| `{ item: [...] }` (single-key, array value) | unwrap to the array | known MCP array envelope |
| Object (other) | recurse each field | pass-through |
| Numeric string `"<digits>"` (≤16 chars, regex-validated) | coerce to `Number` | quoted scalars from MCP wrapper |
| Any other string | pass-through | don't coerce version strings, IDs, etc. |
| Number, boolean, null | pass-through | already correct |

The 16-character cap and the regex `^-?\d+(?:\.\d+)?$` ensure we never coerce arbitrary long strings, version strings, or booleans-that-look-like-numbers.

## Acceptance Criteria (Gherkin)

### F43b-AC1: Unwrap MCP-wrapped array
- **Given** `props.rows = { "item": [...] }`
- **When** `sanitizeBridgeProps` runs
- **Then** `props.rows` becomes a flat array

### F43b-AC2: Coerce quoted integer
- **Given** `props.pageSize = "10"`
- **When** `sanitizeBridgeProps` runs
- **Then** `props.pageSize` becomes the number `10`

### F43b-AC3: Preserve nested shape
- **Given** `props.rows = [{ a: 1 }]` (already a flat array)
- **When** `sanitizeBridgeProps` runs
- **Then** the array is preserved as-is and every object inside is recursed

### F43b-AC4: Pass-through for non-numeric strings
- **Given** `props.label = "ORD-1001"`
- **When** `sanitizeBridgeProps` runs
- **Then** `props.label` remains the string `"ORD-1001"` (not coerced)

### F43b-AC5: Single-attempt render in chat bridge
- **Given** a chat-bridge `tool_call` whose props would have been rejected before sanitization
- **When** the bridge processes it
- **Then** the server emits exactly one `COMPONENT_MOUNTED` frame on the component's channel and zero `bridge render_component failed` log lines

### F43b-AC6: MCP-direct trust boundary unchanged
- **Given** a direct MCP POST to `/mcp` with `props.rows = { "item": [...] }`
- **When** the server validates it
- **Then** the request is rejected with `-32003 props_invalid` (the sanitizer does NOT run on this path)

## Test Plan

| AC | Test |
|---|---|
| F43b-AC1 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:sanitizeBridgeProps > AC1` |
| F43b-AC2 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:sanitizeBridgeProps > AC2` |
| F43b-AC3 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:sanitizeBridgeProps > AC3` |
| F43b-AC4 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:sanitizeBridgeProps > AC4` |
| F43b-AC5 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:chat bridge round-trip (F43b-AC5)` |
| F43b-AC6 | `packages/server/src/chat/__tests__/chat-bridge-sanitize.test.ts:MCP-direct trust boundary (F43b-AC6)` |

## Diagnostic signature

When triaging "DataTable render is slow" reports:

- **Fast path:** server log shows `bridged render_component -> DataTable componentId=…` exactly once per `tool_call`.
- **Slow path (regression):** server log shows `bridge render_component failed (-32003)` N times before either a successful retry or the subprocess closing. The retry count is bounded by Claude Code's MCP wrapper default (~25); total wall-clock ≈ retry-count × ~1 s.

## Cross-References

- Architecture: [architecture.md §Phase 2b Chat-Bridge Render](../architecture.md#phase-2b-chat-bridge-render-claude-code--codex-streams)
- Trust boundary: [architecture.md §Trust Boundary](../architecture.md#trust-boundary)
- F16 strict schema: [feature-016-render-component-tool.md](./feature-016-render-component-tool.md)
- F40 DataTable schema: [feature-040-primevue-registry.md](./feature-040-primevue-registry.md)
