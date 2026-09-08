---
title: GenicUI Consolidated Requirements — Step 10 Sign-off
description: Complete requirements set derived from Phase 1 elicitation + Phase 2 gap analysis (66 gaps resolved across 3 rounds). Approved 2026-09-01; feeds Phase 3 dependency planning.
audience: Engineering, framework architects, OSS maintainers
date: 2026-09-01
status: APPROVED — feeds Phase 3
---

# GenicUI Consolidated Requirements

> **Purpose:** Single source of truth for every locked decision, NFR target, and resolved gap from the requirements gathering workflow. Approved 2026-09-01.
>
> **Source:** Phase 1 elicitation (Steps 1–6) + Phase 2 ISO 25010 workshop (Step 7) + Phase 2 adversarial gap analysis (Step 8: 66 gaps) + Step 9 loop-until-dry (3 rounds) + Step 10 user sign-off.

---

## Table of Contents

- [A. Foundational Decisions](#a-foundational-decisions-locked)
- [B. Locked Technical Decisions](#b-locked-technical-decisions)
- [C. Non-Functional Requirements (ISO 25010)](#c-non-functional-requirements-iso-25010)
- [D. Tool Contracts](#d-tool-contracts-locked)
- [E. Wire Protocol](#e-wire-protocol-locked)
- [F. Component System](#f-component-system-locked)
- [G. Registry Contract](#g-registry-contract-locked)
- [H. Architecture Patterns](#h-architecture-patterns-locked)
- [I. Compliance & Lifecycle](#i-compliance--lifecycle-locked)
- [J. AG-UI Event Ownership Map](#j-ag-ui-event-ownership-map-locked)
- [K. Scope Summary](#k-scope-summary)

---

## A. Foundational Decisions (Locked)

| # | Decision | Value | Source |
|---|---|---|---|
| F1 | Tagline | **"The protocol that lets AI agents use your UI."** | [competitive-relevance-qa.md §2.4](competitive-relevance-qa.md) |
| F2 | Sub-header | "MCP-native. Library-agnostic. Render PrimeVue, Mantine, shadcn, MUI — the UI library stays yours." | [competitive-relevance-qa.md §2.4](competitive-relevance-qa.md) |
| F3 | Product name | GenicUI (with "Genic Framework" sub-brand in README) | [foundational-qa.md §2](foundational-qa.md) |
| F4 | Strategic niche | Library-agnostic + MCP-native + agent-agnostic intersection | [competitive-relevance-qa.md §1](competitive-relevance-qa.md) |
| F5 | Distribution shape | Library-as-binding (default) + library-as-service (optional) | [foundational-qa.md](foundational-qa.md) |
| F6 | Package count | 3 core (`@genicui/core`, `@genicui/server`, `@genicui/client`) + N community registries | [package-distribution.md §2](package-distribution.md) |
| F7 | Registry naming | `@genicul-<library>/registry` | [package-distribution.md §6](package-distribution.md) |

## B. Locked Technical Decisions

| # | Decision | Value |
|---|---|---|
| L1 | Dev stack | Bun + Elysia + TypeBox + WebSocket |
| L2 | Deploy template | Cloudflare Workers + Durable Objects (with `SessionStore` interface — Postgres + InMemory backends) |
| L3 | UI wrapper layer | Web Components underneath + framework shims above (subpath exports) |
| L4 | MCP positioning | Native MCP server, 4 public tools + MCP Apps adapter (`ui://` resources) |
| L5 | Voice timing | Phase 4 deferred (LiveKit Agents) |
| L6 | MVP framework scope | Vue/Nuxt only (PrimeVue registry day 1) — others as architectural capability |
| L7 | Wire protocol | AG-UI event subset (14 events enumerated) + RFC 6902 JSON-Patch (primary) + shallow merge (fallback) |
| L8 | Transport | WebSocket primary + SSE fallback (one-way only) + long-poll last |
| L9 | Schema system | TypeBox locked + `GenicSchema<T>` abstraction + Standard Schema interop |
| L10 | Auth model | API key (`gnc_live_<32>`) — Bearer header, OAuth 2.1 escape hatch |
| L11 | Validation methodology | Specification by Example + Interface Analysis |
| L12 | Schedule posture | 3-month MVP-minus + 6-month MVP (public milestone) |

## C. Non-Functional Requirements (ISO 25010)

### Performance
- `find_ui_component` p50 < 50ms, p99 < 200ms
- `render_component` < 100ms (cold), < 16ms (warm)
- `update_component` < 16ms (frame-budget compatible)
- 1K concurrent connections per conversation surface (single DO)
- Up to 100 component instances per WebSocket
- Reconnect + resync in < 500ms

### Reliability
- 99.9% uptime (Cloudflare SLA)
- Auto-reconnect with exponential backoff (1s/2s/4s/8s/30s cap)
- DO state durability + R2 hourly backup
- Backpressure via `consumer.ready { inflight }`
- Heartbeat ping every 30s; 2 missed pongs = reconnect

### Security
- API key auth (Option B, ~30 LOC) + OAuth 2.1 escape hatch
- Trust-boundary re-validation: server validates every inbound tool call
- Schema-version drift detection (> 2 minor versions rejected)
- Strip `__proto__` / `constructor` / `prototype` from all props server-side
- `additionalProperties: false` enforced on all tool input schemas
- Component IDs embed session prefix: `${prefix}-${sessionId.slice(0,8)}-${ulid()}`

### Maintainability
- 3 core packages + N registries
- Semver across all packages
- 80% test coverage core, 60% shims, 90% tool handlers
- `@genicui/conformance` test suite for all registries

### Compatibility
- npm / pnpm / bun / deno all supported
- Server bindings in v0.1: Elysia + Hono + Nitro (Fastify/Next/SvelteKit/Express as stubs)
- Framework shims: Vue 3 (Phase 1), React + Svelte 5 + Solid (Phase 2)
- Evergreen browsers (2022+)

### Portability
- Cloudflare Workers + DO primary
- Self-host via Bun/Node (Postgres `SessionStore`)
- Library-as-service for any Node-compatible host
- Cross-region opt-in (`GENICUI_REGION=eu|us|apac`)

## D. Tool Contracts (Locked)

### 4 Public MCP Tools
| Tool | Direction | Purpose |
|---|---|---|
| `find_ui_component` | Agent → GenicUI | Search catalog; returns top-K with `componentVersion`, `deprecatedFields`, `requiredCapabilities`, `estimatedBundleKb`, `preferredLayout` |
| `render_component` | Agent → GenicUI | Mount component; accepts `idempotencyKey`, `parentComponentId?`, `replaceComponentId?`, `surface`, `transition`, `render_mode` |
| `update_component` | Agent → GenicUI | Discriminated union: `{ componentId, patch: JsonPatch[] }` (primary) \| `{ componentId, merge: Record<string, any> }` (fallback) |
| `subscribe_to_events` | UI → Agent | Subscribe by `componentId?`, `actions?`, `sessionId?`, `expiresAt?`; default TTL 1h |

### Internal Tool Surface (6 — for PoC flexibility)
`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`, `unmount_component`, `get_component_state`. Map published in agent-protocol.md §1.

### Error Code Namespace (JSON-RPC)
`-32001 component_not_found`, `-32002 component_already_mounted`, `-32003 props_invalid`, `-32004 patch_invalid`, `-32005 rate_limited`, `-32006 quota_exceeded`, `-32007 auth_invalid`, `-32008 surface_unavailable`, `-32009 region_mismatch`, `-32010 internal`. Standard MCP errors (-32700..-32603) honored.

### Rate Limits
50 components/session, 20 updates/sec/component, 256KB payload, 5MB total state, 10K renders/day per API key.

## E. Wire Protocol (Locked)

### WebSocket Handshake
- Subprotocol: `genicui.v1`
- Auth: `Authorization: Bearer ${GENICUI_API_KEY}` OR `Sec-WebSocket-Protocol: genicui.v1, api-key.<key>`
- First frame: `client.hello { sessionId, capabilities: { frameworks, mcpApps, agUiVersion } }`
- Reply: `server.hello { sessionId, serverVersion, heartbeatMs: 30000 }`

### Frame Envelope
`{ v: 1, channel: string, type: string, payload: any, seq: uint64, causes?: uint64[] }`. Channel = `componentId` or reserved `__session__` / `__mcp__` / `__agent__`. Max 256 channels per socket.

### Frame Sequence Guarantees
- Every frame carries `seq: monotonic uint64`
- Server emits `STATE_DELTA` before any `COMPONENT_EVENT` that observes that state
- Client buffers until in-order, applies by `seq`
- Reconnect: client sends `client.resync { lastSeenSeq }`; server replays OR sends `STATE_SNAPSHOT` if gap > 50 frames or 30s

### AG-UI Event Subset (14 events)
Server-emitted lifecycle: `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`. Per tool call: `TOOL_CALL_STARTED`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_RESULT`. State: `STATE_SNAPSHOT`, `STATE_DELTA`. GenicUI extensions: `COMPONENT_MOUNTED`, `COMPONENT_UPDATED`, `COMPONENT_UNMOUNTED`, `COMPONENT_EVENT`, `SURFACE_READY`, `SURFACE_ERROR`.

### Compression / Binary
`permessage-deflate` offered; binary frames via `genicui.v1.msgpack` subprotocol; max frame 1MB (WS close 1009 on exceed); ping every 30s.

### MCP Apps `ui://` URI Grammar
- Catalog: `ui://genicul/{library}/{component}` → `application/vnd.genicul.component+json` (schema + whenToUse + examples)
- Live: `ui://instance/{sessionId}/{componentId}` → `text/html` (rendered component) or current snapshot
- Defensive: also emit `_meta['openai/outputTemplate']`

### `_meta` Canonical Keys
`genicui/componentSchemaVersion: semver`, `genicui/registryId: 'primevue@4.2.0'`, `genicui/agUiVersion: '0.3.0'`. Unknown keys ignored (per MCP spec).

## F. Component System (Locked)

### Render Mode
- Default: same-origin iframe (MCP Apps SEP-1865 postMessage envelope)
- Inline mode: opt-in via `render_mode: 'inline'` (faster, same-origin, trust-boundary required)
- Both share `genicui.v1` protocol envelopes internally

### Web Component Base
- Per component: `<genic-{kebab-name}>` with `observedAttributes = ['props-json', 'component-id']`
- Shadow DOM (closed) for style isolation
- Slots: default + named for action zones
- Lifecycle: `connectedCallback` (subscribe WS), `disconnectedCallback` (unsubscribe + cleanup), `attributeChangedCallback` (apply JSON-Patch)
- All events: `composed: true, bubbles: true` to cross Shadow DOM

### Framework Shims
- **Vue 3 (Phase 1):** composable `useGenicComponent(id, props)` + `v-genic` directive + `<GenicProvider>`
- **React (Phase 2):** `useGenicComponent(id, props)` hook + `<GenicComponent>` wrapper + `useLayoutEffect` + ref forwarding + idempotent `wireActions` (Strict Mode safe)
- **Svelte 5 (Phase 2):** `useGenic()` rune + `<genic:{ComponentName}>` wrapper, props in `$state.raw()`, `$state.snapshot` in `$effect.pre`
- **Solid (Phase 2):** `createGenicComponent(id, props)` signal primitive

### Prop Diffing (Server-side)
`fast-json-patch` with `{ mutate: false }` — generates RFC 6902 patch between snapshots. Fallback: full `STATE_SNAPSHOT` on diff failure. Property-based test (fast-check, 10K random pairs).

### Trust Boundary
- Server re-validates EVERY inbound tool call (TypeBox `Value.Check`)
- Rejects schema-version mismatch > 2 minor versions
- Client re-validates every inbound `STATE_DELTA` patch (sanity, not security)
- Strips `__proto__`, `constructor`, `prototype` server-side
- `additionalProperties: false` enforced

### Mount Animation
CSS View Transitions API (auto where supported) + `transition: { enter, exit, durationMs }` param. Default: fade 150ms.

### Form-Associated CE
Input-capable components: `static formAssociated = true` + `ElementInternals.setFormValue()`. DataTable = no; FormField = yes.

### Component Versioning
Server emits `component.deprecated` event on registry version bump. Agent chooses: ignore, migrate (`update_component`), or swap (`unmount` + `render`). Adaptor exports `component.migrate(fromVersion, toVersion, currentState)`.

## G. Registry Contract (Locked)

### Package Shape
- `@genicul-<library>/registry` naming locked
- Entry point: `exports['./registry']` exports `defineRegistry({ id, version, framework, components })`
- Each `ComponentAdaptor` exports `{ schema, component, getState, wireActions, cleanup, propTypes }`
- Peer-deps: host framework + component lib
- Discovery: explicit `await import('@genicul-primevue/registry')`

### Versioning
- Independent semver per registry
- Breaking: action rename/remove, required prop add, action payload schema change → major
- Minor: optional prop add
- Conflicts: `schema.namespace` field resolves; core refuses to load two registries with same `schema.name` unless `namespace` matches

### Trust / Signing
- npm `--provenance` recommended
- Core logs registry id + version on every mount
- Optional `GENICUI_REGISTRY_ALLOWLIST` env var
- Optional `genicui registry audit <pkg>` lints for `fetch(`/new WebSocket(`/eval(`

### Validation Pipeline
- `genicui registry validate <path>` CLI: 5 rules (required methods, valid TypeBox, AST-matched actions, file size <100KB, no eval/Function/raw WebSocket)
- GitHub Action: `genicui-bot validate-pr`
- `@genicui/conformance` test suite registries must pass

### Documentation Template
`@genicul/create-registry` CLI scaffolds README (Installation, Quick Start, Available Components auto-gen, Event Reference, Migration Guides, License), examples/, registry.json.

## H. Architecture Patterns (Locked)

### Self-host vs Edge Deploy Matrix
| Aspect | Self-host (Bun/Node) | Edge (Cloudflare DO) |
|---|---|---|
| State | In-memory `Map` | DO SQLite |
| Hibernation | N/A | WebSocket Hibernation API |
| Cold start | 0ms (Bun) | 50ms |
| Max WS message | Unlimited | 128KB |
| Regions | Single | Multi via `cf-ipcountry` |
| Backup | `pg_dump` | R2 hourly export |

### Session Store Interface
`SessionStore { get/set/append/subscribe }` — 3 implementations: `DODurableObjectStore` (prod), `PostgresListenNotifyStore` (self-host escape), `InMemoryStore` (dev). CI matrix runs full test suite against all three.

### Multi-Region
Sessions pinned at creation (from `cf-ipcountry` or `region` query param). Agent requests route via same-region DO; cross-region = `-32010 region_mismatch`. Opt-in via `GENICUI_REGION=eu|us|apac`. Cross-region replication: opt-in via `GENICUI_REPLICATE_TO`, +200ms write latency.

### Migration
`genicui migrate` CLI converts self-host state dumps to DO snapshots.

### Backup / DR
Self-host: `pg_dump`-style snapshot. Edge: DO SQLite → R2 hourly (`GENICUI_R2_BUCKET`). Recovery: server reads latest snapshot on cold start.

## I. Compliance & Lifecycle (Locked)

### Privacy / Residency
- `zero-retention` mode: state held only in host app store, nothing persisted beyond active WS
- `beforePersist(event, ctx)` PII redaction hook
- Compliance section in docs (what GenicUI does/doesn't promise)
- Dual-license (AGPL + commercial) only after enterprise customer asks

### Lifecycle Events
- WS disconnect: client marks components 'detached' (dimmed + banner), server retains state 5 min
- Agent receives `session.disconnected` + `session.reconnected` on MCP transport
- Server graceful shutdown: `server.shutdown { reason, retryAfterMs }` 5s before close, WS code 1012

### Deprecation
- Schema fields: TypeBox `.deprecated(...)` + JSON Schema `deprecated: true`
- `find_ui_component` returns `deprecatedFields: string[]`
- Server logs warnings on deprecated field usage
- Hard removal at next major component version

### Progress Reporting
Server honors MCP `progressToken`. `find_ui_component` with `topK > 50` emits `notifications/progress`. SSE streaming option via `find_ui_component.streaming: true`.

### Idempotency
24h dedupe by `(apiKey, idempotencyKey)`. Repeat returns original response.

## J. AG-UI Event Ownership Map (Locked)

| Event class | Owner | When |
|---|---|---|
| UI mount resource | MCP Apps `ui://` | Canonical mount surface |
| Event bus | AG-UI | When agent speaks AG-UI natively (CopilotKit, LangGraph) |
| `update_component` JSON-Patch | GenicUI | Derived convenience tool — emitted into AG-UI/MCP-Apps transports |
| Same event | Never | Defined in two namespaces |

---

## K. Scope Summary

- **66 gaps resolved** across 3 rounds (16 Critical + 36 Important + 12 Minor — 2 dedup'd)
- **5 foundational decisions** + **12 locked technical decisions** + **6 ISO 25010 categories** with concrete targets
- **4 public MCP tools** + 6 internal tools
- **14-event AG-UI subset**
- **14 wire-protocol guarantees** (handshake, envelope, sequencing, compression, MCP Apps URIs, _meta keys)
- **4 framework shim patterns** + 1 Web Component base
- **8 registry contract rules** (naming, version, signing, validation, docs)
- **3 SessionStore backends** with CI matrix
- **10 JSON-RPC error codes** + standard MCP errors
