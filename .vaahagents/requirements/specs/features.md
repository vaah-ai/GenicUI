---
title: GenicUI Testable MVP — Feature Catalog
description: Authoritative feature reference for the 29 Testable MVP features, each with locked inputs, outputs, examples, and Gherkin acceptance criteria. This is the contract for Phase 5 verification.
audience: Engineering, framework architects, OSS maintainers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Testable MVP — Feature Catalog

> **Purpose:** Single source of truth for every Testable MVP feature: locked decisions, concrete input/output examples, and Gherkin `Given/When/Then` acceptance criteria. The 93 acceptance criteria across 29 features form the verification contract for Phase 5.
>
> **Source:** [consolidated-requirements.md](../idea/consolidated-requirements.md) (Step 10 sign-off, 66 gaps resolved) + Testable MVP scope (Phase 3, 30 features, 8-12 week estimate, single maintainer).

---

## Table of Contents

- [Feature ID Convention](#feature-id-convention)
- [Effort Scale](#effort-scale)
- [Phase F1–F5: Foundations](#phase-f1f5-foundations)
- [Phase F6–F10: Transport](#phase-f6f10-transport)
- [Phase F11–F15: Tool Surface](#phase-f11f15-tool-surface)
- [Phase F16–F20: Event System](#phase-f16f20-event-system)
- [Phase F21–F25: Component System](#phase-f21f25-component-system)
- [Phase F26–F30: Client Runtime](#phase-f26f30-client-runtime)
- [Phase F31–F35: Framework Shims](#phase-f31f35-framework-shims)
- [Phase F36–F40: Registry](#phase-f36f40-registry)
- [Phase F46: Auth](#phase-f46-auth)
- [Phase F61–F64: Deploy](#phase-f61f64-deploy)
- [Acceptance Criteria Summary](#acceptance-criteria-summary)

---

## Feature ID Convention

Format: `F{n} — {Title}`. IDs follow dependency order from the [Testable MVP dependency map](../idea/consolidated-requirements.md#k-scope-summary). Effort: S (< 3 days), M (3-7 days), L (> 7 days).

---

## Effort Scale

| Size | Days | Notes |
|---|---|---|
| **S** | 1-2 | Single file, well-defined interface, low risk |
| **M** | 3-7 | Multi-file, requires integration with prior features |
| **L** | 8-14 | Architectural decision, multiple subsystems, may need spike |

---

## Phase F1–F5: Foundations

### F1 — `@genicui/core` package skeleton

**What:** Monorepo workspace; `packages/core` with ESM exports, strict TypeScript, zero runtime deps.

**Locked by:** [L9 (Schema system)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F6 (Package count)](../idea/consolidated-requirements.md#a-foundational-decisions-locked).

**Example (input):**
```bash
mkdir -p packages/core/src && cd packages/core
cat > package.json <<'EOF'
{ "name": "@genicui/core", "version": "0.1.0", "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc", "test": "bun test" } }
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "strict": true,
  "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true } }
EOF
echo 'export const VERSION = "0.1.0";' > src/index.ts
```

**Example (output):**
```bash
$ bun test
✓ src/index.test.ts (1 test) [12ms]
$ bun run build
$ ls dist
index.js  index.d.ts
```

**Acceptance criteria:**
- **Given** a developer runs `bun install` at the monorepo root, **When** they import `@genicui/core`, **Then** TypeScript types resolve and the package loads in <50ms
- **Given** the package is built, **When** consumers `import { something } from '@genicui/core'`, **Then** ESM resolution works in Node 20+, Bun 1.2+, Deno 1.40+
- **Given** strict TypeScript is enabled, **When** the build runs, **Then** zero `any` types in `src/` (enforced by ESLint rule `@typescript-eslint/no-explicit-any`)

**Effort:** S

---

### F2 — `GenicSchema<T>` abstraction

**What:** Wrapper that normalizes TypeBox/Zod to JSON Schema Draft 2020-12 with `additionalProperties: false`, deprecated field metadata, and Standard Schema interop.

**Locked by:** [L9 (Schema system)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F (Trust Boundary)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input):**
```ts
import { Type } from '@sinclair/typebox';
import { genicSchema } from '@genicui/core';

const T = Type.Object({
  rows: Type.Array(Type.Object({ id: Type.String(), name: Type.String() })),
  pageSize: Type.Integer({ minimum: 1, maximum: 100, default: 10 }),
});
const schema = genicSchema(T, { name: 'DataTableProps' });
```

**Example (output):**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "rows": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } }, "required": ["id", "name"], "additionalProperties": false } },
    "pageSize": { "type": "integer", "minimum": 1, "maximum": 100, "default": 10 }
  },
  "required": ["rows"],
  "additionalProperties": false,
  "x-genicui-name": "DataTableProps",
  "x-genicui-version": "0.1.0"
}
```

**Acceptance criteria:**
- **Given** a TypeBox schema, **When** `genicSchema()` is called, **Then** JSON Schema Draft 2020-12 is emitted with `additionalProperties: false`
- **Given** a Zod schema, **When** passed to `genicSchema()`, **Then** it compiles equivalently via Standard Schema interop
- **Given** a schema with `.deprecated(...)` on a field, **When** emitted as JSON Schema, **Then** the field has `deprecated: true`

**Effort:** S

---

### F3 — Protocol envelope + sequence generator

**What:** Monotonic uint64 sequence generator + envelope `{ v, channel, type, payload, seq, causes? }`.

**Locked by:** [L7 (Wire protocol)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [E (Wire Protocol)](../idea/consolidated-requirements.md#e-wire-protocol-locked).

**Example (input):**
```ts
import { SequenceGenerator, envelope } from '@genicui/core';
const seq = new SequenceGenerator();
const frame = envelope({
  channel: 'dt-7f3a9b2c',
  type: 'STATE_DELTA',
  payload: [{ op: 'replace', path: '/rows/1/name', value: 'updated' }],
  seq: seq.next(),
});
```

**Example (output — wire):**
```
{"v":1,"channel":"dt-7f3a9b2c","type":"STATE_DELTA","payload":[{"op":"replace","path":"/rows/1/name","value":"updated"}],"seq":42}
```

**Acceptance criteria:**
- **Given** a sequence generator instance, **When** `seq.next()` is called 1000 times, **Then** values are monotonic uint64 with no duplicates
- **Given** an envelope with `seq: 5`, **When** another envelope with `seq: 3` arrives, **Then** the second is buffered until `seq: 4` and `seq: 5` are seen
- **Given** a reserved channel (`__session__`, `__mcp__`, `__agent__`), **When** used as a component channel, **Then** the server rejects with `-32008 surface_unavailable`

**Effort:** S

---

### F4 — JSON-Patch engine wrapper

**What:** Wraps `fast-json-patch` with `{ mutate: false }`, falls back to full snapshot on non-serializable values.

**Locked by:** [L7 (Wire protocol)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F (Prop Diffing)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input):**
```ts
import { JsonPatchEngine } from '@genicui/core';
const engine = new JsonPatchEngine();
const before = { rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] };
const after = { rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'updated' }] };
const patch = engine.diff(before, after);
```

**Example (output):**
```json
[{ "op": "replace", "path": "/rows/1/name", "value": "updated" }]
```

**Acceptance criteria:**
- **Given** two object snapshots, **When** `diff()` is called, **Then** RFC 6902 patches are returned with `{ mutate: false }`
- **Given** a patch, **When** `apply()` is called against the original, **Then** the result equals `after`
- **Given** 10,000 random property pairs (fast-check), **When** diff+apply round-trips, **Then** all pairs satisfy `apply(diff(a, b), a) === b`
- **Given** a Date or Map value, **When** diff is attempted, **Then** fallback to full snapshot (`STATE_SNAPSHOT` event) is emitted

**Effort:** M

---

### F5 — `SessionStore` interface + `InMemoryStore`

**What:** `SessionStore { get/set/append/subscribe }` abstraction; `InMemoryStore` uses `Map` for dev/test.

**Locked by:** [H (Session Store Interface)](../idea/consolidated-requirements.md#h-architecture-patterns-locked).

**Example (input):**
```ts
import { InMemoryStore } from '@genicui/core';
const store = new InMemoryStore();
await store.set('session-123', { mountedIds: ['dt-1'], lastSeq: 42 });
const session = await store.get('session-123');
```

**Example (output):**
```ts
session === { mountedIds: ['dt-1'], lastSeq: 42 }
```

**Acceptance criteria:**
- **Given** a session ID, **When** `store.set()` is called, **Then** subsequent `store.get()` returns the same object reference
- **Given** multiple concurrent `set()` calls on the same session, **When** they race, **Then** the last write wins (no torn state)
- **Given** a `subscribe(sessionId, callback)`, **When** another caller `set()`s the session, **Then** the callback fires with the new value

**Effort:** M

---

## Phase F6–F10: Transport

### F9 — Bun + Elysia HTTP server skeleton

**What:** `bun run dev` starts Elysia server on `:8080` with `/health` route.

**Locked by:** [L1 (Dev stack)](../idea/consolidated-requirements.md#b-locked-technical-decisions).

**Example (input):**
```ts
import { Elysia } from 'elysia';
const app = new Elysia()
  .get('/health', () => ({ status: 'ok' }))
  .listen({ port: 8080, hostname: '0.0.0.0' });
console.log(`Server running at ${app.server!.url}`);
```

**Example (output):**
```bash
$ curl http://localhost:8080/health
{"status":"ok"}
```

**Acceptance criteria:**
- **Given** the server starts, **When** `GET /health` is called, **Then** response is 200 with `{ status: 'ok' }` in <10ms
- **Given** Bun is not available, **When** `bun run dev` is invoked, **Then** error message names Bun installation as the fix
- **Given** TypeScript strict mode, **When** route handlers are registered, **Then** end-to-end types from Elysia route to client (no `any`)

**Effort:** S

---

### F10 — WebSocket transport (handshake + auth + heartbeat)

**What:** WS upgrade with subprotocol `genicui.v1`, API key in `Sec-WebSocket-Protocol` or `Authorization` header, `server.hello` first frame, 30s heartbeat.

**Locked by:** [L8 (Transport)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [L10 (Auth model)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [E (WebSocket Handshake)](../idea/consolidated-requirements.md#e-wire-protocol-locked).

**Example (input — client handshake):**
```
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Protocol: genicui.v1, api-key.gnc_live_abc123
Sec-WebSocket-Version: 13
```

**Example (output — server first frame):**
```
{"v":1,"channel":"__session__","type":"server.hello","payload":{"sessionId":"sess-9f8e7d","serverVersion":"0.1.0","heartbeatMs":30000},"seq":1}
```

**Acceptance criteria:**
- **Given** a client sends a WS upgrade with subprotocol `genicui.v1` and API key, **When** the key validates, **Then** connection upgrades and server sends `server.hello` within 100ms
- **Given** an invalid API key, **When** the upgrade arrives, **Then** server returns HTTP 401 and closes
- **Given** no `Sec-WebSocket-Protocol` header, **When** the upgrade arrives, **Then** server returns HTTP 400 (rejects non-genicui clients)
- **Given** a connection is open for 30s with no traffic, **When** heartbeat timer fires, **Then** server sends a ping frame; client must pong within 5s
- **Given** client misses 2 pongs, **When** server detects timeout, **Then** server closes with WS code 1011

**Effort:** L

---

### F11 — Frame envelope serialization + channel multiplexing

**What:** Per-channel subscription routing with `seq` ordering, max 256 channels per socket.

**Locked by:** [E (Frame Envelope)](../idea/consolidated-requirements.md#e-wire-protocol-locked).

**Example (input — two channels):**
```ts
const frameA = { v: 1, channel: '__mcp__', type: 'TOOL_CALL_RESULT', payload: { ... }, seq: 10 };
const frameB = { v: 1, channel: 'dt-7f3a9b2c', type: 'STATE_DELTA', payload: [...], seq: 11 };
```

**Example (output — wire):**
```
{"v":1,"channel":"__mcp__","type":"TOOL_CALL_RESULT","payload":{...},"seq":10}
{"v":1,"channel":"dt-7f3a9b2c","type":"STATE_DELTA","payload":[...],"seq":11}
```

**Acceptance criteria:**
- **Given** a frame with channel `__session__`, **When** serialized, **Then** JSON is single-line with `seq` monotonic
- **Given** 256 channels are open, **When** a 257th is registered, **Then** server rejects with `-32001 component_not_found` and emits `channel.closed`
- **Given** a frame arrives with `seq: 11` after `seq: 10`, **When** channel handler reads, **Then** frames are dispatched in `seq` order (not arrival order)
- **Given** a frame is malformed (missing `v` or `channel`), **When** server receives, **Then** connection closes with WS code 1003

**Effort:** M

---

## Phase F11–F15: Tool Surface

### F13 — MCP server with 4 public tools

**What:** `@genicui/server` exposes `tools/list` with exactly 4 tools; each tool's `inputSchema` is JSON Schema derived from `GenicSchema<T>`.

**Locked by:** [L4 (MCP positioning)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [D (4 Public MCP Tools)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input — MCP initialize):**
```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
  "protocolVersion": "2026-07-28",
  "capabilities": {},
  "clientInfo": { "name": "claude-code", "version": "1.0.0" }
}}
```

**Example (output — tools/list):**
```json
{ "jsonrpc": "2.0", "id": 2, "result": {
  "tools": [
    { "name": "find_ui_component", "description": "...", "inputSchema": {...} },
    { "name": "render_component", "description": "...", "inputSchema": {...} },
    { "name": "update_component", "description": "...", "inputSchema": {...} },
    { "name": "subscribe_to_events", "description": "...", "inputSchema": {...} }
  ]
}}
```

**Acceptance criteria:**
- **Given** an MCP client connects via stdio or Streamable HTTP, **When** it calls `tools/list`, **Then** exactly 4 tools are returned with correct names
- **Given** a tool is called with invalid input, **When** the server validates, **Then** it returns `{ isError: true, content: [...] }` with a JSON-RPC error code from the -32001..-32010 namespace
- **Given** a tool is called with valid input, **When** execution completes, **Then** the result conforms to the tool's output schema

**Effort:** L

---

### F14 — Trust-boundary validation

**What:** Every inbound tool call is re-validated against `GenicSchema<T>`; prototype pollution keys stripped; `additionalProperties: false` enforced.

**Locked by:** [C (Security)](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010), [F (Trust Boundary)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input — payload with prototype pollution):**
```json
{ "componentId": "dt-1", "props": { "rows": [], "__proto__": { "isAdmin": true } } }
```

**Example (output — server rejects):**
```json
{ "isError": true, "content": [{ "type": "text", "text": "{\"code\":-32003,\"message\":\"props_invalid\",\"data\":{\"details\":[\"prototype pollution detected: __proto__\"]}}" }] }
```

**Acceptance criteria:**
- **Given** a tool call with `__proto__`, `constructor`, or `prototype` in any field, **When** server validates, **Then** it strips these keys before processing and logs a warning
- **Given** a tool call whose props don't match the registered TypeBox schema, **When** `Value.Check()` runs, **Then** server returns `-32003 props_invalid` with field-level details
- **Given** a tool call with `additionalProperties: true` in the schema, **When** server validates, **Then** server rejects the schema at registry-load time
- **Given** an inbound patch op `replace` with a path that doesn't exist in current state, **When** applied, **Then** server returns `-32004 patch_invalid`

**Effort:** M

---

### F15 — `find_ui_component` (basic)

**What:** In-memory catalog lookup; returns top-K components matching a query.

**Locked by:** [D (Tool Contracts)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input):**
```json
{ "query": "data table with rows", "topK": 1 }
```

**Example (output):**
```json
{ "components": [{
  "name": "DataTable",
  "registryId": "primevue@4.2.0",
  "description": "Display tabular data with sorting and pagination",
  "whenToUse": "When the agent needs to render structured rows the user can interact with",
  "inputSchema": { "type": "object", "properties": { "rows": { "type": "array" }, "pageSize": { "type": "integer", "default": 10 } }, "required": ["rows"], "additionalProperties": false },
  "examples": [{ "rows": [{"id":"1","name":"Alice"}], "pageSize": 10 }]
}]}
```

**Acceptance criteria:**
- **Given** a query "data table with rows", **When** `find_ui_component` is called, **Then** `DataTable` from PrimeVue registry is returned in the top-K
- **Given** a query that matches no component, **When** called, **Then** empty array returned with `topK` requested (no error)
- **Given** `topK: 5` is requested but registry has 3 components, **When** called, **Then** all 3 are returned

**Effort:** L

---

## Phase F16–F20: Event System

### F16 — `render_component` (basic)

**What:** Mounts a component on the connected client; returns `componentId` and emits `COMPONENT_MOUNTED`.

**Locked by:** [D (Tool Contracts)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input):**
```json
{ "name": "DataTable", "props": { "rows": [{"id":"1","name":"Alice"},{"id":"2","name":"Bob"}], "pageSize": 10 }, "surface": "default" }
```

**Example (output):**
```json
{ "componentId": "dt-sess9f8e-01HK9X", "channel": "dt-sess9f8e-01HK9X", "surface": "default", "schema": {...}, "initialState": {"rows":[...]} }
```

**Acceptance criteria:**
- **Given** a valid component name + props, **When** `render_component` is called, **Then** server returns a `componentId` of the form `${prefix}-${sessionId.slice(0,8)}-${ulid()}`
- **Given** the same componentId is requested again (via `replaceComponentId`), **When** server processes, **Then** existing component is updated, not duplicated
- **Given** props fail TypeBox validation, **When** called, **Then** server returns `-32003 props_invalid` and no component is mounted

**Effort:** L

---

### F17 — `update_component` (basic discriminated union)

**What:** Accepts either `{ patch: JsonPatch[] }` (primary) or `{ merge: object }` (fallback); emits `STATE_DELTA`.

**Locked by:** [D (Tool Contracts)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input — patch primary):**
```json
{ "componentId": "dt-sess9f8e-01HK9X", "patch": [{"op":"replace","path":"/rows/1/name","value":"updated"}] }
```

**Example (output — wire frame):**
```
{"v":1,"channel":"dt-sess9f8e-01HK9X","type":"STATE_DELTA","payload":[{"op":"replace","path":"/rows/1/name","value":"updated"}],"seq":42}
```

**Acceptance criteria:**
- **Given** a `patch` array with valid RFC 6902 ops, **When** `update_component` is called, **Then** server emits one `STATE_DELTA` frame with the patch
- **Given** a `merge` object, **When** called, **Then** server diffs current state vs merged state and emits the patch
- **Given** both `patch` and `merge` are provided, **When** called, **Then** server rejects with `-32003 props_invalid` (discriminated union requires exactly one)

**Effort:** L

---

### F18 — `subscribe_to_events` (basic)

**What:** Filtered event subscription; UI forwards component events back to agent.

**Locked by:** [D (Tool Contracts)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input):**
```json
{ "componentId": "dt-sess9f8e-01HK9X", "actions": ["row_selected"] }
```

**Example (output — event on click):**
```
{"v":1,"channel":"dt-sess9f8e-01HK9X","type":"COMPONENT_EVENT","payload":{"action":"row_selected","detail":{"rowId":"2"}},"seq":43}
```

**Acceptance criteria:**
- **Given** a subscription for `row_selected` on a component, **When** the user clicks a row, **Then** the agent receives a `COMPONENT_EVENT` frame
- **Given** no `actions` filter, **When** subscribed, **Then** all events for the component are received
- **Given** an event fires while the agent is disconnected, **When** agent reconnects, **Then** events are not replayed (MVP loses events on disconnect)

**Effort:** M

---

### F19 — Internal tools (`unmount_component` + `get_component_state`)

**What:** Two MCP tools for PoC flexibility; documented in agent-protocol but not required for external clients.

**Locked by:** [D (Internal Tool Surface)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input — unmount):**
```json
{ "componentId": "dt-sess9f8e-01HK9X" }
```

**Example (output — get state):**
```json
{ "componentId": "dt-sess9f8e-01HK9X", "state": { "rows": [{"id":"1","name":"Alice"},{"id":"2","name":"updated"}] } }
```

**Acceptance criteria:**
- **Given** a mounted component, **When** `unmount_component` is called, **Then** server emits `channel.closed` and removes state
- **Given** a mounted component, **When** `get_component_state` is called, **Then** server returns current state without mutation

**Effort:** S

---

### F20 — AG-UI event subset (14 events)

**What:** Server emits AG-UI-style lifecycle events alongside GenicUI-specific events.

**Locked by:** [E (AG-UI Event Subset)](../idea/consolidated-requirements.md#e-wire-protocol-locked), [J (AG-UI Event Ownership Map)](../idea/consolidated-requirements.md#j-ag-ui-event-ownership-map-locked).

**Example (lifecycle — agent turn):**
```
seq 1: RUN_STARTED { runId: "r-1" }
seq 2: TOOL_CALL_STARTED { toolCallId: "tc-1", toolName: "render_component" }
seq 3: TOOL_CALL_ARGS { toolCallId: "tc-1", args: {...} }
seq 4: TOOL_CALL_RESULT { toolCallId: "tc-1", result: { componentId: "dt-..." } }
seq 5: RUN_FINISHED { runId: "r-1" }
```

**Example (state events):**
```
seq 10: COMPONENT_MOUNTED { componentId: "dt-...", schema: {...}, initialState: {...} }
seq 11: STATE_DELTA { componentId: "dt-...", patch: [...] }
seq 12: COMPONENT_EVENT { componentId: "dt-...", action: "row_selected", detail: {...} }
```

**Acceptance criteria:**
- **Given** an agent turn with one tool call, **When** it completes, **Then** server emits exactly 5 AG-UI events in order: RUN_STARTED, TOOL_CALL_STARTED, TOOL_CALL_ARGS, TOOL_CALL_RESULT, RUN_FINISHED
- **Given** a tool errors, **When** it returns, **Then** server emits `TOOL_CALL_RESULT` with `isError: true` and then `RUN_FINISHED`
- **Given** a component mounts, **When** event fires, **Then** `COMPONENT_MOUNTED` precedes any `STATE_DELTA` for that component

**Effort:** M

---

### F21 — JSON-RPC error code namespace

**What:** All GenicUI tool errors use codes -32001..-32010; standard MCP errors (-32700..-32603) honored.

**Locked by:** [D (Error Code Namespace)](../idea/consolidated-requirements.md#d-tool-contracts-locked).

**Example (input — invalid componentId):**
```json
{ "name": "DataTable", "props": {}, "surface": "default" }
```

**Example (output — error):**
```json
{ "isError": true, "content": [{ "type": "text", "text": "{\"code\":-32003,\"message\":\"props_invalid\",\"data\":{\"details\":[\"required: rows\"]}}" }] }
```

**Acceptance criteria:**
- **Given** any tool error, **When** returned to agent, **Then** the JSON-RPC code is one of `-32001` through `-32010`
- **Given** a code outside the namespace (e.g., `-32603`), **When** returned, **Then** it's a standard MCP error, not GenicUI-specific

**Effort:** S

---

## Phase F21–F25: Component System

### F23 — MCP Apps adapter (`resources/list` + `resources/read`)

**What:** Implements MCP Apps SEP-1865 `resources/list` and `resources/read` so GenicUI components surface as `ui://` resources.

**Locked by:** [L4 (MCP positioning)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [E (MCP Apps URI Grammar)](../idea/consolidated-requirements.md#e-wire-protocol-locked).

**Example (input — resources/list):**
```json
{ "jsonrpc": "2.0", "id": 3, "method": "resources/list", "params": {} }
```

**Example (output):**
```json
{ "jsonrpc": "2.0", "id": 3, "result": {
  "resources": [
    { "uri": "ui://genicul/primevue/DataTable", "name": "PrimeVue.DataTable", "description": "...", "mimeType": "application/vnd.genicul.component+json" },
    { "uri": "ui://instance/sess-9f8e7d/dt-sess9f8e-01HK9X", "name": "Live DataTable", "mimeType": "text/html" }
  ]
}}
```

**Acceptance criteria:**
- **Given** the MCP server is initialized, **When** `resources/list` is called, **Then** it returns one entry per catalog component + one per live mounted instance
- **Given** a `ui://genicul/primevue/DataTable` URI, **When** `resources/read` is called, **Then** response mimeType is `application/vnd.genicul.component+json` with schema + whenToUse + examples

**Effort:** M

---

### F24 — `ui://` URI grammar (catalog + instance)

**What:** Two URI namespaces — `ui://genicul/{lib}/{comp}` for catalog, `ui://instance/{sessionId}/{componentId}` for live.

**Locked by:** [E (MCP Apps URI Grammar)](../idea/consolidated-requirements.md#e-wire-protocol-locked).

**Example (catalog read):**
```json
{ "uri": "ui://genicul/primevue/DataTable" }
→ { "mimeType": "application/vnd.genicul.component+json", "text": "{\"schema\":{...},\"whenToUse\":\"...\",\"examples\":[...]}" }
```

**Example (instance read):**
```json
{ "uri": "ui://instance/sess-9f8e7d/dt-sess9f8e-01HK9X" }
→ { "mimeType": "text/html", "text": "<genic-data-table component-id=\"dt-sess9f8e-01HK9X\" props-json=\"...\"></genic-data-table>" }
```

**Acceptance criteria:**
- **Given** a catalog URI matching `ui://genicul/{lib}/{comp}`, **When** read, **Then** schema + whenToUse + examples are returned
- **Given** an instance URI matching `ui://instance/{sessionId}/{componentId}`, **When** read, **Then** rendered HTML with the live state is returned
- **Given** a malformed URI, **When** read, **Then** server returns resource not found

**Effort:** M

---

## Phase F26–F30: Client Runtime

### F28 — `@genicui/client` package skeleton + WebSocket client

**What:** `packages/client` with WS client; auto-reconnect with exponential backoff.

**Locked by:** [F6 (Package count)](../idea/consolidated-requirements.md#a-foundational-decisions-locked).

**Example (input — client connect):**
```ts
import { GenicClient } from '@genicui/client';
const client = new GenicClient({ url: 'ws://localhost:8080/ws', apiKey: 'gnc_live_...' });
await client.connect();
```

**Example (output):**
```
[GenicClient] connected to ws://localhost:8080/ws
[GenicClient] server.hello received { sessionId: "sess-9f8e7d", serverVersion: "0.1.0" }
```

**Acceptance criteria:**
- **Given** a valid URL + API key, **When** `connect()` is called, **Then** connection establishes and `server.hello` is received within 200ms
- **Given** an invalid API key, **When** `connect()` is called, **Then** promise rejects with `AuthError`
- **Given** connection drops, **When** client detects, **Then** it reconnects with exponential backoff (1s, 2s, 4s, 8s, 30s cap)

**Effort:** S

---

### F29 — Web Component base class

**What:** `defineGenicComponent(name, options)` registers a custom element; closed Shadow DOM; subscribes to WS on connect, unsubscribes on disconnect.

**Locked by:** [F (Web Component Base)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input — registration):**
```ts
import { defineGenicComponent } from '@genicui/client';
defineGenicComponent('data-table', {
  observedAttributes: ['props-json', 'component-id'],
  schema: DataTableSchema,
});
```

**Example (DOM output):**
```html
<genic-data-table component-id="dt-sess9f8e-01HK9X" props-json='{"rows":[...]}'></genic-data-table>
<!-- Shadow DOM: closed -->
```

**Acceptance criteria:**
- **Given** `defineGenicComponent()` is called, **When** the custom element is upgraded, **Then** it renders into a closed Shadow DOM
- **Given** `props-json` attribute changes, **When** `attributeChangedCallback` fires, **Then** component re-renders with new props
- **Given** component is removed from DOM, **When** `disconnectedCallback` fires, **Then** WS subscription is unsubscribed

**Effort:** L

---

### F30 — Event bridging

**What:** Forward `CustomEvent`s from children to the GenicComponent base via `composed: true, bubbles: true`; emit `COMPONENT_EVENT` frames.

**Locked by:** [F (Web Component Base — All events)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input — child event):**
```ts
this.dispatchEvent(new CustomEvent('row_selected', {
  detail: { rowId: '2' },
  bubbles: true,
  composed: true,
}));
```

**Example (output — wire frame):**
```
{"v":1,"channel":"dt-sess9f8e-01HK9X","type":"COMPONENT_EVENT","payload":{"action":"row_selected","detail":{"rowId":"2"}},"seq":43}
```

**Acceptance criteria:**
- **Given** a child element dispatches a `CustomEvent`, **When** it has `composed: true`, **Then** the event crosses Shadow DOM and reaches the GenicComponent base
- **Given** an event without `composed: true`, **When** dispatched inside Shadow DOM, **Then** it's NOT seen by the base class (silently swallowed)
- **Given** an event reaches the base, **When** forwarded, **Then** the wire frame includes `action` (event name) and `detail` (event.detail)

**Effort:** S

---

## Phase F31–F35: Framework Shims

### F33 — Vue 3 shim

**What:** `@genicui/client/vue` provides `useGenicComponent`, `v-genic` directive, `<GenicProvider>`.

**Locked by:** [F (Framework Shims — Vue 3)](../idea/consolidated-requirements.md#f-component-system-locked).

**Example (input — composable usage):**
```vue
<script setup>
import { useGenicComponent, GenicProvider } from '@genicui/client/vue';
const props = useGenicComponent('dt-sess9f8e-01HK9X', { rows: [], pageSize: 10 });
</script>
<template>
  <GenicProvider :client="client">
    <genic-data-table v-bind="props" />
  </GenicProvider>
</template>
```

**Example (output — reactive props):**
```ts
// When server emits STATE_DELTA, `props.rows` updates reactively
props.value.rows === [{id:'1',name:'Alice'},{id:'2',name:'updated'}]
```

**Acceptance criteria:**
- **Given** a Vue 3 component uses `useGenicComponent`, **When** server emits a patch, **Then** the returned reactive ref updates within 16ms
- **Given** `<GenicProvider>` wraps the app, **When** it mounts, **Then** a single WebSocket subscription is shared across all child components
- **Given** `v-genic` directive is used on an element, **When** the directive binds, **Then** the element is replaced with the appropriate `<genic-{name}>` custom element

**Effort:** M

---

## Phase F36–F40: Registry

### F37 — `defineRegistry()` + `ComponentAdaptor` contract types

**What:** TypeScript types and runtime helpers for declaring a registry.

**Locked by:** [G (Package Shape)](../idea/consolidated-requirements.md#g-registry-contract-locked).

**Example (input — registry definition):**
```ts
import { defineRegistry, defineComponent } from '@genicui/core';
import { Type } from '@sinclair/typebox';

const DataTable = defineComponent({
  name: 'DataTable',
  namespace: 'primevue',
  version: '4.2.0',
  framework: 'vue3',
  schema: Type.Object({
    rows: Type.Array(Type.Object({ id: Type.String(), name: Type.String() })),
    pageSize: Type.Integer({ minimum: 1, maximum: 100, default: 10 }),
  }),
  events: {
    row_selected: { detailSchema: Type.Object({ rowId: Type.String() }) },
  },
});

export const registry = defineRegistry({
  id: 'primevue',
  version: '4.2.0',
  framework: 'vue3',
  components: [DataTable],
});
```

**Example (output — registry object):**
```ts
{
  id: 'primevue',
  version: '4.2.0',
  framework: 'vue3',
  components: [DataTable], // includes name, namespace, schema, events
}
```

**Acceptance criteria:**
- **Given** `defineRegistry()` is called, **When** validated, **Then** every component has `name`, `namespace`, `version`, `framework`, `schema`, and `events`
- **Given** two components in the registry share `schema.name`, **When** loaded, **Then** they're allowed only if `schema.namespace` differs

**Effort:** S

---

### F38 — Registry loader

**What:** `loadRegistry(packageName)` imports `exports['./registry']` and returns the registry.

**Locked by:** [G (Package Shape — Discovery)](../idea/consolidated-requirements.md#g-registry-contract-locked).

**Example (input):**
```ts
import { loadRegistry } from '@genicui/core';
const registry = await loadRegistry('@genicul-primevue/registry');
```

**Example (output):**
```ts
registry === { id: 'primevue', version: '4.2.0', framework: 'vue3', components: [DataTable] }
```

**Acceptance criteria:**
- **Given** a registry package is installed, **When** `loadRegistry()` is called, **Then** it imports `exports['./registry']` and returns the registry object
- **Given** a registry package is not installed, **When** `loadRegistry()` is called, **Then** it throws `RegistryNotFoundError` with the package name
- **Given** peer-deps mismatch (e.g., PrimeVue 3 installed, registry expects 4), **When** loaded, **Then** loader throws `PeerDepMismatchError`

**Effort:** S

---

### F40 — `@genicul-primevue/registry` (DataTable only)

**What:** Single package exporting the PrimeVue DataTable as a GenicUI component.

**Locked by:** [F7 (Registry naming)](../idea/consolidated-requirements.md#a-foundational-decisions-locked), [L6 (MVP framework scope)](../idea/consolidated-requirements.md#b-locked-technical-decisions).

**Example (package.json):**
```json
{
  "name": "@genicul-primevue/registry",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./registry": "./dist/registry.js"
  },
  "peerDependencies": {
    "primevue": "^4.0.0",
    "vue": "^3.4.0"
  }
}
```

**Example (registry export):**
```ts
export const registry = defineRegistry({
  id: 'primevue',
  version: '4.2.0',
  framework: 'vue3',
  components: [DataTable],
});
```

**Acceptance criteria:**
- **Given** the package is published to npm, **When** installed, **Then** `import { registry } from '@genicul-primevue/registry'` returns the registry object
- **Given** DataTable's component renders, **When** tested with sample props, **Then** PrimeVue's DataTable is the underlying DOM
- **Given** row click fires `row_selected`, **When** tested, **Then** the event payload includes `rowId` matching the clicked row

**Effort:** M

---

## Phase F46: Auth

### F46 — API key auth

**What:** `Authorization: Bearer gnc_live_<32>` required on every WS upgrade and HTTP request; test keys (`gnc_test_*`) restricted to dev mode.

**Locked by:** [L10 (Auth model)](../idea/consolidated-requirements.md#b-locked-technical-decisions), [C (Security)](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010).

**Example (input — Bearer header):**
```
Authorization: Bearer gnc_live_abc123def456ghi789jkl012mno345pq
```

**Example (output — accepted):**
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
```

**Acceptance criteria:**
- **Given** a request with `Authorization: Bearer gnc_live_...`, **When** the key validates, **Then** request is accepted
- **Given** a request with `Authorization: Bearer gnc_test_...` to a prod server, **When** checked, **Then** it's rejected with HTTP 403 (test keys only work in dev mode)
- **Given** a missing `Authorization` header, **When** request arrives, **Then** server returns HTTP 401 with `WWW-Authenticate: Bearer` header

**Effort:** S

---

## Phase F61–F64: Deploy

### F61 — Cloudflare Workers deploy template

**What:** `wrangler.toml` + Worker entry that routes WS to per-session Durable Object.

**Locked by:** [L2 (Deploy template)](../idea/consolidated-requirements.md#b-locked-technical-decisions).

**Example (wrangler.toml):**
```toml
name = "genicui-mvp"
main = "src/index.ts"
compatibility_date = "2026-09-01"

[[durable_objects.bindings]]
name = "SESSION"
class_name = "GenicSessionDO"

[[migrations]]
tag = "v1"
new_classes = ["GenicSessionDO"]
```

**Example (deploy + access):**
```bash
$ wrangler deploy
Published genicui-mvp (5.67 sec)
  https://genicui-mvp.<account>.workers.dev
$ curl https://genicui-mvp.<account>.workers.dev/health
{"status":"ok"}
```

**Acceptance criteria:**
- **Given** `wrangler deploy` runs, **When** the build completes, **Then** the Worker is published with a Durable Object binding
- **Given** the deployed Worker receives a WS upgrade, **When** handled, **Then** the request is routed to the per-session DO instance
- **Given** a session is idle for 30s, **When** DO hibernates, **Then** state is persisted to SQLite and the connection auto-resumes on next message

**Effort:** M

---

### F62 — Bun self-host entry point

**What:** `bun run start` and `bun build --compile` both produce a server that listens on `0.0.0.0:8080`.

**Locked by:** [L1 (Dev stack)](../idea/consolidated-requirements.md#b-locked-technical-decisions).

**Example (input — start):**
```bash
$ bun run start
[GenicUI] Server running at http://localhost:8080
[GenicUI] WebSocket endpoint: ws://localhost:8080/ws
```

**Example (output — single binary):**
```bash
$ bun build src/server.ts --compile --outfile genicui
$ ./genicui
[GenicUI] Server running at http://localhost:8080
```

**Acceptance criteria:**
- **Given** `bun run start` is invoked, **When** the server binds, **Then** it listens on `0.0.0.0:8080`
- **Given** `bun build --compile` runs, **When** the binary is executed, **Then** it serves identically to `bun run start`
- **Given** the server runs with no `GENICUI_API_KEY` env var, **When** it starts, **Then** it logs a warning that auth is disabled (dev mode)

**Effort:** S

---

### F64 — Nitro/Nuxt deploy binding

**What:** `nuxt-genicui` module mounts GenicUI at `/api/ws` in a Nitro app.

**Locked by:** [@genicui/server Nitro subpath](../idea/package-distribution.md#3-what-lives-in-each-package).

**Example (input — Nuxt module):**
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-genicui'],
  genicui: {
    apiKey: process.env.GENICUI_API_KEY,
    surface: 'default',
  },
});
```

**Example (output — API route):**
```ts
// server/api/ws.ts (auto-generated)
import { mountGenicUI } from '@genicui/server/nitro';
export default mountGenicUI({ /* config */ });
```

**Acceptance criteria:**
- **Given** `nuxt-genicui` module is added, **When** Nuxt dev server starts, **Then** a WebSocket route is mounted at `/api/ws`
- **Given** the Nitro binding is used, **When** a request arrives, **Then** it delegates to `@genicui/server` core
- **Given** `nitro build` runs, **When** the output is deployed, **Then** the WebSocket handler is included in the server bundle

**Effort:** S

---

## Acceptance Criteria Summary

| Phase | Features | AC count |
|---|---|---|
| Foundations (F1-F5) | 5 | 16 |
| Transport (F9-F11) | 3 | 12 |
| Tool Surface (F13-F15) | 3 | 9 |
| Event System (F16-F21) | 6 | 17 |
| Component System (F23-F24) | 2 | 5 |
| Client Runtime (F28-F30) | 3 | 9 |
| Framework Shims (F33) | 1 | 3 |
| Registry (F37-F40) | 4 | 10 |
| Auth (F46) | 1 | 3 |
| Deploy (F61-F64) | 3 | 9 |
| **Total** | **29** | **93** |

Plus **F12, F22, F25, F27, F31, F32, F34-F36, F39, F41-F45, F47-F60, F63, F65-F67** = 30 deferred features (Phase 2/4 or Post-MVP).

---

## Cross-Reference Index

- All features reference locked decisions in [consolidated-requirements.md](../idea/consolidated-requirements.md)
- Architecture diagram in [architecture.md (Testable MVP)](./architecture.md)
- Implementation roadmap in [roadmap.md](./roadmap.md)
- Deployment guides in [deployment.md](./deployment.md)
- Testing strategy in [testing-strategy.md](./testing-strategy.md)
- Domain glossary in [glossary.md](./glossary.md)
- Security model in [security.md](./security.md)
