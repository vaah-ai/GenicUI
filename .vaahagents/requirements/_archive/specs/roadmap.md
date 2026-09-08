---
title: GenicUI Implementation Roadmap — Testable MVP
description: Week-by-week implementation roadmap for the 29 Testable MVP features, ordered by dependency. Single-maintainer, 8-12 week estimate. Defines Definition of Done.
audience: Engineering, OSS maintainers, project sponsors
date: 2026-09-01
status: APPROVED — Phase 3 sign-off
---

# GenicUI Implementation Roadmap — Testable MVP

> **Purpose:** Dependency-ordered implementation plan for the 29 Testable MVP features. Single-maintainer, 8-12 week estimate.
>
> **Source:** [consolidated-requirements.md](../idea/consolidated-requirements.md) (locked decisions) + [features.md](./features.md) (93 acceptance criteria).

---

## Table of Contents

- [Constraints](#constraints)
- [Milestone Overview](#milestone-overview)
- [Week-by-Week Plan](#week-by-week-plan)
- [Definition of Done — Testable MVP](#definition-of-done--testable-mvp)
- [Risk Register](#risk-register)
- [Post-MVP Backlog](#post-mvp-backlog)

---

## Constraints

| Constraint | Value | Source |
|---|---|---|
| Team size | 1 maintainer | User directive: "we need to reach the testable mvp asap" |
| Timeline | 8-12 weeks | Phase 3 dependency map |
| Components | PrimeVue DataTable only | [L6 MVP framework scope](../idea/consolidated-requirements.md#b-locked-technical-decisions) |
| Deployment | Bun dev + Cloudflare Workers template | [L1, L2](../idea/consolidated-requirements.md#b-locked-technical-decisions) |
| Transport | WebSocket primary only | [L8 Transport](../idea/consolidated-requirements.md#b-locked-technical-decisions) |
| Auth | API key only | [L10 Auth model](../idea/consolidated-requirements.md#b-locked-technical-decisions) |

---

## Milestone Overview

```
Week 1-2  ─── Foundation ────────────────────────── F1, F2, F3, F4, F5
Week 3-4  ─── Server skeleton ──────────────────── F9, F10, F11, F13
Week 5-6  ─── Tool surface ─────────────────────── F14, F15, F16, F17, F18, F19, F20, F21
Week 7-8  ─── Client + registry ────────────────── F28, F29, F30, F33, F37, F38, F40
Week 9-10 ─── MCP Apps + auth ──────────────────── F23, F24, F46
Week 11-12 ─ Deploy + Nitro binding ───────────── F61, F62, F64
```

Each milestone ends with an integration smoke test. If the smoke test fails, the next milestone doesn't start.

---

## Week-by-Week Plan

### Week 1: Monorepo + Core Foundations (F1, F2, F3, F4, F5)

| Day | Feature | Output |
|---|---|---|
| 1 | F1 | `packages/core` skeleton with strict TS, ESLint, bun test |
| 2 | F2 | `genicSchema()` wrapper + TypeBox tests, Standard Schema interop |
| 3 | F3 | `SequenceGenerator` + envelope helper + monotonic uint64 tests |
| 4 | F4 | `JsonPatchEngine` wrapper + 10K-pair fast-check property test |
| 5 | F5 | `SessionStore` interface + `InMemoryStore` + subscribe test |

**Smoke test:** `bun test packages/core` passes; 100% line coverage on F2/F3/F4/F5.

### Week 2: Server Skeleton (F9, F10, F11)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F9 | Elysia server on `:8080` with `/health`, `/ws` route stub |
| 3-4 | F10 | WS handshake + API key auth + heartbeat (30s ping/pong) |
| 5 | F11 | Channel multiplexer + frame envelope serialization + sequence ordering |

**Smoke test:** `wscat -c ws://localhost:8080/ws -H "Authorization: Bearer gnc_live_xxx"` receives `server.hello`; sending two frames on different channels dispatches in order.

### Week 3: MCP Server + Trust Boundary (F13, F14)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F13 | MCP server bootstrap with `tools/list` returning 4 tools |
| 3-4 | F14 | TypeBox `Value.Check()` on every inbound tool call + prototype stripping |
| 5 | — | Integration: `find_ui_component` returns a hard-coded component |

**Smoke test:** `claude-code` (or any MCP client) connects; calls `tools/list`; gets 4 tools; calls `find_ui_component` and gets the stub response.

### Week 4: Tool Handlers (F15, F16, F17, F18, F19)

| Day | Feature | Output |
|---|---|---|
| 1 | F15 | `find_ui_component` with in-memory catalog |
| 2-3 | F16 | `render_component` mounts on connected client; emits COMPONENT_MOUNTED |
| 4 | F17 | `update_component` discriminated union (patch primary, merge fallback) |
| 5 | F18, F19 | `subscribe_to_events` + internal `unmount_component` + `get_component_state` |

**Smoke test:** Agent calls `render_component` → component appears in browser → agent calls `update_component` → component updates in place → user clicks → agent receives event.

### Week 5: AG-UI Events + Error Codes (F20, F21)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F20 | AG-UI event emitter (14 events: RUN_*, TOOL_CALL_*, STATE_*, COMPONENT_*) |
| 3 | F21 | JSON-RPC error code namespace (-32001..-32010) + standard MCP errors |
| 4-5 | — | Buffer: integration tests, property-based tests, doc polish |

**Smoke test:** A multi-tool agent turn emits 5 AG-UI events in order; an invalid tool call returns -32003 with field-level details.

### Week 6: Client Skeleton + Web Component (F28, F29, F30)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F28 | `@genicui/client` package + GenicClient with reconnect backoff |
| 3-4 | F29 | Web Component base class with closed Shadow DOM + observedAttributes |
| 5 | F30 | Event bridging (composed: true forwarding) |

**Smoke test:** Browser connects, server emits COMPONENT_MOUNTED, browser renders custom element, clicking fires COMPONENT_EVENT back to server.

### Week 7: ProxyVue Registry (F37, F38, F40)

| Day | Feature | Output |
|---|---|---|
| 1 | F37 | `defineRegistry()` + `defineComponent()` helpers + type contracts |
| 2 | F38 | `loadRegistry()` with peer-dep validation |
| 3-5 | F40 | `@genicul-primevue/registry` with DataTable adaptor using PrimeVue 4 PassThrough API |

**Smoke test:** Install `@genicul-primevue/registry`; load it; DataTable's schema + events are exposed; rendering mounts PrimeVue DataTable in Shadow DOM; clicking a row fires `row_selected` with correct `rowId`.

### Week 8: Vue 3 Shim + Integration (F33)

| Day | Feature | Output |
|---|---|---|
| 1-3 | F33 | `@genicui/client/vue` with `useGenicComponent`, `<GenicProvider>`, `v-genic` |
| 4-5 | — | Integration: full PoC end-to-end (agent → DataTable → click → agent) |

**Smoke test:** Nuxt example app demonstrates agent renders DataTable, agent updates DataTable, user clicks DataTable row, agent receives event. Recorded as a 2-minute video.

### Week 9: MCP Apps Adapter (F23, F24)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F23 | `resources/list` + `resources/read` MCP Apps implementation |
| 3-4 | F24 | `ui://` URI grammar (catalog + instance namespaces) |
| 5 | — | Test with Claude Desktop (verify `ui://genicul/primevue/DataTable` resolves) |

**Smoke test:** Claude Desktop shows DataTable as a usable component in its resources picker; selecting it opens a resource panel with schema + whenToUse + examples.

### Week 10: API Key Auth (F46)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F46 | API key validation middleware + dev-mode (`gnc_test_*`) + rate limit hooks |
| 3-4 | — | Security review of trust boundary + prototype pollution tests |
| 5 | — | Penetration test: attempt `__proto__` injection, schema bypass, key brute force |

**Smoke test:** HTTP 401 on missing key; HTTP 403 on test key to prod; HTTP 400 on missing `Sec-WebSocket-Protocol`.

### Week 11: Cloudflare Workers Deploy (F61)

| Day | Feature | Output |
|---|---|---|
| 1-2 | F61 | wrangler.toml + Worker entry + Durable Object class + DO SQLite setup |
| 3-4 | — | Deploy to Cloudflare, test end-to-end against deployed URL |
| 5 | — | Buffer: fix deploy issues, write deploy doc |

**Smoke test:** `wrangler deploy` succeeds; deployed Worker serves `/health`, `/ws`; WS connection routed to per-session DO; state persists across hibernation.

### Week 12: Bun Self-host + Nitro (F62, F64) + Final Polish

| Day | Feature | Output |
|---|---|---|
| 1 | F62 | `bun run start` + `bun build --compile` binary |
| 2-3 | F64 | `nuxt-genicui` module + Nitro binding at `/api/ws` |
| 4-5 | — | Tag v0.1.0; publish `@genicui/core`, `@genicui/server`, `@genicui/client`, `@genicul-primevue/registry` to npm; write launch post |

**Smoke test:** `npx genicul start` boots in a clean Linux container; `pnpm create nuxt-app + nuxt-genicui` produces a working chat-with-DataTable example.

---

## Definition of Done — Testable MVP

The Testable MVP is "done" when **all 10 of these checkboxes pass**:

- [ ] `bun install && bun run dev` boots the example Nuxt app on `localhost:8080` with no warnings
- [ ] `curl http://localhost:8080/health` returns `{"status":"ok"}` in <10ms
- [ ] A browser at `http://localhost:8080` shows a working chat surface
- [ ] An MCP-capable agent (Claude Code, Cursor, or `mcp-inspector`) connects via Streamable HTTP
- [ ] Agent calls `tools/list` and sees exactly 4 tools
- [ ] Agent calls `find_ui_component({ query: "data table" })` and gets DataTable
- [ ] Agent calls `render_component({ name: "DataTable", props: { rows: [...] } })` and the table appears in the browser
- [ ] Agent calls `update_component({ patch: [...] })` and the table updates in place (no remount, no flicker)
- [ ] User clicks a row; agent receives `{ action: "row_selected", detail: { rowId: "..." } }`
- [ ] The same flow works on the deployed Cloudflare Worker (https://genicui-mvp.<account>.workers.dev)

Plus the **infrastructure checks**:
- [ ] `bun test` passes with 80%+ line coverage on `@genicui/core`, 90%+ on tool handlers
- [ ] No `any` types in `src/` (enforced by ESLint)
- [ ] All 4 packages publishable to npm via `bun run publish`
- [ ] README + examples run from a clean clone

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare DO hibernation edge cases break WS | M | High | Spike in week 11; fall back to Bun self-host if DO fails |
| PrimeVue 4 PassThrough API changes | L | M | Pin PrimeVue version in registry peerDeps |
| Bun 1.2 stability issues | L | M | Have Node 20 fallback ready |
| Single-maintainer burnout | M | High | Cut to 25 features if week 6 integration slips |
| MCP spec drift (2026-07-28 → next) | L | M | Pin protocol version; compat shim if needed |

---

## Post-MVP Backlog

### Post-MVP Priority 1 (next 3 months after MVP ships)

- F12 — Long-poll transport fallback (Cloudflare WS limits)
- F31 — `genicul-cli` validate command
- F22 — `_meta['openai/outputTemplate']` for OpenAI Apps SDK
- F26 — Inline render mode (same-origin, no iframe)
- F48 — `PostgresListenNotifyStore` for self-host
- F49 — DO hibernation semantics + state persistence

### Post-MVP Priority 2 (months 4-6)

- F25, F27, F32, F34, F35 — extra framework shims (React, Svelte, Solid)
- F36, F39 — registry test framework + `@genicui/conformance` suite
- F50, F51 — rate limiting + quota per API key
- F52 — OAuth 2.1 escape hatch
- F53 — SSE fallback for one-way streams
- F54, F55 — CLI scaffold (`create-genicui-app`, `create-registry`)
- F58, F59, F60 — R2 backups, multi-region replication, GDPR mode

### Phase 2 (months 6-9)

- F6 — Multi-DO coordination
- F41, F42, F43, F44, F45 — Mantine, shadcn, Skeleton, MUI, Flowbite registries
- F47 — JWT auth + identity propagation
- F56, F57 — animation primitives + form-associated custom elements

### Phase 4 Growth (months 12+)

- F63 — SvelteKit deploy binding
- F65 — CDN distribution of registry metadata
- F66 — Marketplace / discovery hub
- F67 — Voice (LiveKit Agents integration)

**Total deferred:** 30 features + 7 framework/library expansions + voice + marketplace = ~38 items.

---

## Cross-Reference

- [features.md](./features.md) — 29 features with 93 acceptance criteria
- [architecture.md](./architecture.md) — system topology + lifecycle
- [deployment.md](./deployment.md) — Cloudflare + Bun + Nitro deploy guides
- [testing-strategy.md](./testing-strategy.md) — how we verify the 93 ACs
- [consolidated-requirements.md](../idea/consolidated-requirements.md) — locked decisions behind every feature
