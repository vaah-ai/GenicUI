---
title: GenicUI Glossary — Testable MVP
description: Authoritative definitions for every term used in GenicUI documentation. Cross-references the locked decisions and feature IDs.
audience: Engineering, OSS maintainers, contributors, technical writers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Glossary

> **Purpose:** Single source of truth for vocabulary used across GenicUI docs. Terms map to locked decisions in [consolidated-requirements.md](../idea/consolidated-requirements.md) and feature IDs in [features.md](./features.md).
>
> **Format:** Each entry is `term → definition → (cross-refs)`. Bold indicates first-use terminology.

---

## Table of Contents

- [A](#a)
- [B](#b)
- [C](#c)
- [D](#d)
- [E](#e)
- [F](#f)
- [G](#g)
- [I](#i)
- [J](#j)
- [L](#l)
- [M](#m)
- [P](#p)
- [R](#r)
- [S](#s)
- [T](#t)
- [U](#u)
- [W](#w)

---

## A

### Adaptor
A small piece of code that wraps a third-party UI component (e.g., PrimeVue DataTable) and exposes it as a **GenicUI component**. Lives in a **registry package** (e.g., `@genicul-primevue/registry`). See [F37, F40](./features.md#phase-f36f40-registry), [package-distribution.md](../idea/package-distribution.md#4-why-registries-are-separate-packages).

### AG-UI (Agent-UI Protocol)
Emerging event protocol from CopilotKit with 16+ event types for agent-UI interaction. GenicUI adopts the **14-event subset** that maps to its needs. See [consolidated-requirements.md §E AG-UI Event Subset](../idea/consolidated-requirements.md#e-wire-protocol-locked), [F20](./features.md#phase-f16f20-event-system).

### AG-UI Event
A typed message on the wire (`RUN_STARTED`, `TOOL_CALL_RESULT`, `STATE_DELTA`, `COMPONENT_EVENT`, etc.) that follows the AG-UI protocol shape. GenicUI emits 14 events; the schema is in [features.md F20](./features.md#f20--ag-ui-event-subset-14-events).

### API Key
A `gnc_live_<32-char-hex>` or `gnc_test_*` token used in `Authorization: Bearer ...` for every WebSocket upgrade and HTTP request. See [consolidated-requirements.md §L10 Auth model](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F46](./features.md#phase-f46-auth).

---

## B

### Backpressure
Mechanism for slowing down producers when consumers can't keep up. Phase 2 feature (`consumer.ready { inflight }`); not in MVP.

### Bun
A JavaScript runtime (`oven/bun`) used as GenicUI's dev stack. Compiles TypeScript natively, runs TypeBox validation at the edge. See [L1 Dev stack](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F9, F62](./features.md#phase-f9-bun--elysia-http-server-skeleton).

---

## C

### Catalog
The set of all components the agent knows about. Queried via `find_ui_component`. See [consolidated-requirements.md §D Tool Contracts](../idea/consolidated-requirements.md#d-tool-contracts-locked), [F15](./features.md#f15--find_ui_component-basic).

### Channel
A logical stream of frames multiplexed over a single WebSocket. One channel per mounted component (`dt-...`) plus reserved channels `__session__`, `__mcp__`, `__agent__`. Max 256 per socket. See [F11, F16](./features.md#phase-f6f10-transport).

### Channel Multiplexer
Subsystem that demultiplexes incoming frames to per-channel handlers and serializes outgoing frames in `seq` order. See [architecture.md Transport Topology](./architecture.md#transport-topology), [F11](./features.md#f11--frame-envelope-serialization--channel-multiplexing).

### `composed: true`
CustomEvent flag that allows an event to cross Shadow DOM boundaries. Required for all events forwarded from a child to the **GenicComponent base**. See [F30](./features.md#f30--event-bridging).

### Component (GenicUI Component)
A reusable, schema-described UI unit that an AI agent can render. Has a `name`, `namespace`, `version`, `framework`, `schema`, and `events`. Lives in a **registry**. See [F37](./features.md#f37--defineregistry--componentadaptor-contract-types).

### Component ID
Unique identifier of the form `${prefix}-${sessionId.slice(0,8)}-${ulid()}` (e.g., `dt-sess9f8e-01HK9X`). Used in `componentId` parameters and channel names. See [consolidated-requirements.md §C Security](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010), [F16](./features.md#f16--render_component-basic).

### Conversation Surface
The UI the user sees — chat messages, mounted components, system messages. Not the same as a `surface` parameter; the surface is a **mount point** within the conversation.

### Custom Element
Web Components standard for defining new HTML tags (`<genic-data-table>`). GenicUI uses `defineGenicComponent()` to register them. See [F29](./features.md#f29--web-component-base-class).

---

## D

### Discriminated Union
TypeScript pattern where the runtime shape of an object determines which fields are valid. GenicUI uses this for `update_component` (`{ componentId, patch }` XOR `{ componentId, merge }`). See [F17](./features.md#f17--update_component-basic-discriminated-union).

### DO (Durable Object)
Cloudflare Workers' stateful compute primitive. Used in deploy template as `GenicSessionDO` to hold per-session WebSocket state. See [consolidated-requirements.md §H Self-host vs Edge Deploy Matrix](../idea/consolidated-requirements.md#h-architecture-patterns-locked), [F61](./features.md#f61--cloudflare-workers-deploy-template).

### `defineComponent()`
Core helper that produces a typed Component definition with runtime validation. See [F37](./features.md#f37--defineregistry--componentadaptor-contract-types).

### `defineRegistry()`
Core helper that produces a typed Registry. Validates that every component has `name`, `namespace`, `version`, `framework`, `schema`, `events`. See [F37](./features.md#f37--defineregistry--componentadaptor-contract-types).

---

## E

### Elysia
TypeScript-first HTTP framework on Bun. Used in dev stack as the HTTP server. See [L1 Dev stack](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F9](./features.md#f9--bun--elysia-http-server-skeleton).

### Error Code Namespace
JSON-RPC codes `-32001` through `-32010` reserved for GenicUI tool errors. Standard MCP errors (`-32700..-32603`) honored outside this range. See [F21](./features.md#f21--json-rpc-error-code-namespace).

### Event (UI Event)
A `CustomEvent` dispatched by a DOM element. GenicUI components forward events with `composed: true, bubbles: true` so they cross Shadow DOM. See [F30](./features.md#f30--event-bridging).

### Event (Wire Event)
A typed message on the wire envelope. AG-UI event types (`RUN_STARTED`, `STATE_DELTA`, etc.) plus GenicUI extensions (`COMPONENT_MOUNTED`, `COMPONENT_EVENT`).

---

## F

### fast-json-patch
The library GenicUI wraps for RFC 6902 JSON-Patch operations. Used with `{ mutate: false }` to keep snapshots immutable. See [consolidated-requirements.md §F Prop Diffing](../idea/consolidated-requirements.md#f-component-system-locked), [F4](./features.md#f4--json-patch-engine-wrapper).

### fast-check
Property-based testing library. GenicUI uses it for invariants (sequence monotonicity, JSON-Patch round-trip). See [testing-strategy.md Property-Based Tests](./testing-strategy.md#property-based-tests).

### Frame
A single message on the WebSocket: `{ v, channel, type, payload, seq, causes? }`. See [consolidated-requirements.md §E Frame Envelope](../idea/consolidated-requirements.md#e-wire-protocol-locked), [F3, F11](./features.md#f3--protocol-envelope--sequence-generator).

### Framework Shim
A subpath export in `@genicui/client` (e.g., `@genicui/client/vue`) that adapts Web Components to a specific framework. Phase 1: Vue 3. Phase 2: React, Svelte, Solid. See [F33](./features.md#f33--vue-3-shim), [consolidated-requirements.md §F Framework Shims](../idea/consolidated-requirements.md#f-component-system-locked).

---

## G

### GenicClient
The browser-side WebSocket client. One per page (typically inside `<GenicProvider>`). Handles connect, reconnect (exponential backoff), heartbeat, frame dispatch. See [F28](./features.md#f28--genicuiclient-package-skeleton--websocket-client).

### GenicComponent
The HTMLElement base class for `<genic-{name}>` custom elements. Handles WS subscription, attribute change → re-render, event forwarding. See [F29](./features.md#f29--web-component-base-class).

### `GenicProvider`
Vue 3 component that provides a single `GenicClient` to all child components via Vue's provide/inject. See [F33](./features.md#f33--vue-3-shim).

### `GenicSchema<T>`
Abstraction over TypeBox / Zod / Standard Schema. Emits JSON Schema Draft 2020-12 with `additionalProperties: false`. See [consolidated-requirements.md §L9 Schema system](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F2](./features.md#f2--genicschemat-abstraction).

### GenicUI Component
See **Component**.

---

## I

### Idempotency Key
A client-supplied token that deduplicates repeat tool calls within 24 hours. Same key + same payload → same response. See [consolidated-requirements.md §I Idempotency](../idea/consolidated-requirements.md#i-compliance--lifecycle-locked), F16 input parameters.

### In-Memory Store
The `InMemoryStore` implementation of `SessionStore`. Uses `Map` for dev and CI; lost on restart. MVP-only. See [F5](./features.md#f5--sessionstore-interface--inmemorystore), [consolidated-requirements.md §H Session Store Interface](../idea/consolidated-requirements.md#h-architecture-patterns-locked).

### Internal Tool
MCP tools not exposed in the public 4-tool contract. MVP includes `unmount_component` and `get_component_state` for PoC flexibility. See [consolidated-requirements.md §D Internal Tool Surface](../idea/consolidated-requirements.md#d-tool-contracts-locked), [F19](./features.md#f19--internal-tools-unmount_component--get_component_state).

---

## J

### JSON-Patch (RFC 6902)
Standard format for describing changes to a JSON document. Operations: `add`, `remove`, `replace`, `move`, `copy`, `test`. GenicUI uses `patch` as the primary `update_component` mechanism. See [consolidated-requirements.md §F Prop Diffing](../idea/consolidated-requirements.md#f-component-system-locked), [F4, F17](./features.md#f4--json-patch-engine-wrapper).

### JSON-RPC
The framing protocol MCP uses. GenicUI tools return errors with code in `-32001..-32010`. See [F21](./features.md#f21--json-rpc-error-code-namespace).

---

## L

### Library-Agnostic
Architectural capability: GenicUI's wrapper layer can target any framework (Vue, React, Svelte, Solid) or any UI library (PrimeVue, Mantine, shadcn). MVP ships only Vue 3 + PrimeVue DataTable. See [consolidated-requirements.md §L6 MVP framework scope](../idea/consolidated-requirements.md#b-locked-technical-decisions).

---

## M

### MCP (Model Context Protocol)
Protocol standard for agent-tool communication. GenicUI ships as an MCP server with 4 tools. Spec version pinned to `2026-07-28`. See [consolidated-requirements.md §L4 MCP positioning](../idea/consolidated-requirements.md#b-locked-technical-decisions).

### MCP Apps (SEP-1865)
MCP extension finalized Jan 28, 2026. Defines how MCP servers expose UI-bearing tools via `ui://` resources. GenicUI implements the adapter. See [consolidated-requirements.md §E MCP Apps UI:// URI Grammar](../idea/consolidated-requirements.md#e-wire-protocol-locked), [F23, F24](./features.md#phase-f21f25-component-system).

### Mount
The act of putting a component into a conversation surface. Triggered by `render_component`. Emits `COMPONENT_MOUNTED`. See [F16](./features.md#f16--render_component-basic).

### Mount Point
The DOM element where components are rendered. Typically inside a `<GenicProvider>` for Vue 3, or a custom element host for vanilla.

---

## P

### PassThrough API (PrimeVue)
PrimeVue 4 feature exposing the DOM structure of every component. Lets adaptors inject custom markup without forking the library. GenicUI uses this for the DataTable adaptor. See [component-libraries-research.md §5](../idea/component-libraries-research.md).

### Patch
A JSON-Patch document (array of operations). GenicUI's primary `update_component` payload. See [F17](./features.md#f17--update_component-basic-discriminated-union).

### PrimeVue
Vue 3 component library. The **only** library shipped in the MVP registry. Provides DataTable via its PassThrough API. See [F40](./features.md#f40--genicul-primevueregistry-datatable-only).

### Property-Based Test
Test that asserts an invariant across thousands of generated inputs (via fast-check). Used for sequence monotonicity, JSON-Patch round-trip, schema serialization. See [testing-strategy.md §Property-Based Tests](./testing-strategy.md#property-based-tests).

---

## R

### `render_component`
MCP tool. Mounts a component on the connected client. Returns `componentId`. See [consolidated-requirements.md §D Tool Contracts](../idea/consolidated-requirements.md#d-tool-contracts-locked), [F16](./features.md#f16--render_component-basic).

### Render Mode
Where the component is rendered: `default` (same-origin iframe, MCP Apps), or `inline` (same-origin, no iframe). MVP supports `default` only. See [consolidated-requirements.md §F Render Mode](../idea/consolidated-requirements.md#f-component-system-locked).

### Req (Requirement)
A locked decision in [consolidated-requirements.md](../idea/consolidated-requirements.md). Each has an ID like F1 (Foundational), L1 (Locked Technical), or section+name (e.g., §C Security).

### Registry
A package that exports one or more **adaptors**. Named `@genicul-<library>/registry`. Has a single entry point: `exports['./registry']`. See [package-distribution.md §4](../idea/package-distribution.md#4-why-registries-are-separate-packages), [F37, F38, F40](./features.md#phase-f36f40-registry).

### Resolved Decision
A question that went through the gap-analysis process and reached a default that the user approved (with "defaults are okay" or equivalent). 66 such decisions across 3 rounds.

### Resync
Post-MVP feature: `client.resync { lastSeenSeq }` replays missed frames after disconnect. Not in MVP. See [consolidated-requirements.md §E Frame Sequence Guarantees](../idea/consolidated-requirements.md#e-wire-protocol-locked).

### Room / Surface
A mount point within a conversation. The `surface` parameter on `render_component` selects which surface receives the component.

---

## S

### Schema (Component Schema)
The JSON Schema (Draft 2020-12) describing a component's props. Generated via `GenicSchema<T>`. Enforced with `additionalProperties: false`.

### Schema-Version Drift Detection
Server rejects components whose schema version is more than 2 minor versions behind the agent's expected version. See [consolidated-requirements.md §C Security](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010).

### Sequence Generator
A monotonic uint64 counter shared across all channels. Every frame's `seq` is sourced from this. See [F3](./features.md#f3--protocol-envelope--sequence-generator).

### Session
A single WebSocket connection + its mounted components + its subscription state. Identified by `sessionId`. Stored in `SessionStore`.

### SessionStore
Interface: `{ get, set, append, subscribe }`. Three implementations: `InMemoryStore` (MVP), `DODurableObjectStore` (Phase 2), `PostgresListenNotifyStore` (Phase 2). See [consolidated-requirements.md §H Session Store Interface](../idea/consolidated-requirements.md#h-architecture-patterns-locked), [F5](./features.md#f5--sessionstore-interface--inmemorystore).

### Shadow DOM (closed)
Web Components feature that encapsulates component internals. GenicUI uses **closed** Shadow DOM to prevent host CSS leaks. See [F29](./features.md#f29--web-component-base-class).

### shadcn
React component distribution model (copy-paste, not npm). Listed in the strategic positioning as a future registry target. Not in MVP. See [competitive-relevance-qa.md §1](../idea/competitive-relevance-qa.md).

### Standard Schema
A schema interop standard supported by Zod, Valibot, ArkType. GenicUI's `GenicSchema<T>` accepts any Standard-Schema-compliant library. See [F2](./features.md#f2--genicschemat-abstraction).

### State Delta
A change to a component's props expressed as a JSON-Patch. Emitted as `STATE_DELTA` on the wire. See [F17](./features.md#f17--update_component-basic-discriminated-union).

### Subprotocol (`Sec-WebSocket-Protocol`)
The negotiated identifier on a WebSocket upgrade. GenicUI requires `genicui.v1` and optionally accepts `api-key.<key>` for auth. See [F10](./features.md#f10--websocket-transport-handshake--auth--heartbeat).

### Subscribe to Events
MCP tool. Registers an agent subscription for component events. Default TTL 1h. See [consolidated-requirements.md §D Tool Contracts](../idea/consolidated-requirements.md#d-tool-contracts-locked), [F18](./features.md#f18--subscribe_to_events-basic).

### Surface
A mount point within a conversation. The `surface` parameter on `render_component` selects which surface receives the component.

---

## T

### Testable MVP
29-feature scope approved by user as "as soon as possible". Single PrimeVue DataTable, 8-12 week estimate. See [roadmap.md](./roadmap.md).

### Trust Boundary
The server-side validation gate that re-checks every inbound tool call against its schema, strips prototype pollution keys, and enforces `additionalProperties: false`. See [consolidated-requirements.md §F Trust Boundary](../idea/consolidated-requirements.md#f-component-system-locked), [F14](./features.md#f14--trust-boundary-validation).

### TypeBox
Schema-as-TypeScript library. Locked as GenicUI's primary schema source. See [consolidated-requirements.md §L9 Schema system](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F2](./features.md#f2--genicschemat-abstraction).

---

## U

### `ui://` URI
Resource namespace for MCP Apps. Two flavors:
- `ui://genicul/{lib}/{comp}` — catalog descriptor
- `ui://instance/{sessionId}/{componentId}` — live rendered component

See [F23, F24](./features.md#phase-f21f25-component-system).

### ULID
Universally Unique Lexicographically Sortable Identifier. GenicUI uses ULID as the trailing portion of `componentId`. See [consolidated-requirements.md §C Security](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010).

### Unmount
The act of removing a component from a surface. Triggered by `unmount_component`. Emits `channel.closed`. See [F19](./features.md#f19--internal-tools-unmount_component--get_component_state).

### `update_component`
MCP tool. Applies a JSON-Patch or merge to a live component's props. Emits `STATE_DELTA`. See [F17](./features.md#f17--update_component-basic-discriminated-union).

### Use Case (UC)
A worked example of GenicUI in practice. See [competitive-relevance-qa.md §3](../idea/competitive-relevance-qa.md#3-q3--practical-use-cases-competitors-cant-or-cant-easily-do).

---

## W

### Web Component
W3C standard for custom HTML elements (`HTMLElement` subclass + `customElements.define`). GenicUI's render target. See [F29](./features.md#f29--web-component-base-class).

### WebSocket (WS)
The primary transport for the GenicUI wire protocol. Subprotocol `genicui.v1`. See [L8 Transport](../idea/consolidated-requirements.md#b-locked-technical-decisions), [F10, F11](./features.md#phase-f6f10-transport).

### Wire Frame
A message on the wire: `{ v, channel, type, payload, seq, causes? }`. See [consolidated-requirements.md §E Frame Envelope](../idea/consolidated-requirements.md#e-wire-protocol-locked).

### Workspace (monorepo)
The `/Users/pk/Projects/GenicUI` repo. Contains `packages/core`, `packages/server`, `packages/client`, `registries/primevue`, `examples/nuxt-primevue`. See [package-distribution.md §7](../idea/package-distribution.md#7-monorepo-layout).

---

## Cross-Reference

- [consolidated-requirements.md](../idea/consolidated-requirements.md) — locked decisions referenced throughout
- [features.md](./features.md) — 29 features with feature IDs
- [architecture.md](./architecture.md) — system topology
- [package-distribution.md](../idea/package-distribution.md) — 3 core packages + N registries
- [competitive-relevance-qa.md](../idea/competitive-relevance-qa.md) — strategic positioning
