# GenicUI — Project Dashboard

> **Last updated:** 2026-09-03
> **Last updated by:** M5-T4/T5/T6 added — Playground demo app (F41/F42/F43)
> **Development phase:** Testable MVP — 32 features / 93 ACs, 8-12 weeks, single maintainer
> **Status:** 3/6 milestones complete · 21/33 tasks complete · 12 tasks not started

---

## Milestone Summary

| ID | Title | Phase | Week | Status | Priority | Effort | Tasks | Manifest Features |
|---|---|---|---|---|---|---|---|---|
| M1 | Foundations: Core Package | Foundations | W1 | 🟢 Complete | Critical | 7-10 days | 5 | F1, F2, F3, F4, F5 |
| M2 | Transport: Server + WS + Frames | Transport | W2 | 🟢 Complete | Critical | 7-10 days | 4 | F9, F46, F10, F11 |
| M3 | Tool Surface: MCP + 4 Tools | Tool Surface | W3-W4 | 🟢 Complete | Critical | 10-14 days | 7 | F13, F14, F15, F16, F17, F18, F28 |
| M4 | Runtime: Events + WC + Engine | Runtime | W4-W8 | 🔄 In Progress | Critical | 14-21 days | 7 | F19, F20, F24, F21, F29, F30, F33 |
| M5 | Registry: Registry + PrimeVue + Playground | Registry | W7 | ✅ Complete | Critical | 10-14 days | 6 | F37, F38, F40, F41, F42, F43 |
| M6 | Deployment: CF + Bun + Nitro | Deployment | W11-W12 | ⚪ Not Started | High | 10-14 days | 4 | F61, F62, F62b, F64 |

---

## Task Register

### M1 — Foundations: Core Package (5/5 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M1-T1 | @genicui/core package skeleton | 🟢 Complete | Critical | 1 day | F1 | None (zero-dependency foundation) |
| M1-T2 | GenicSchema<T> abstraction | ✅ Complete | Critical | 1 day | F2 | M1-T1 |
| M1-T3 | Protocol envelope + sequence generator | ✅ Complete | Critical | 1 day | F3 | M1-T1 |
| M1-T4 | JSON-Patch engine wrapper | ✅ Complete | Critical | 2 days | F4 | M1-T1 |
| M1-T5 | SessionStore + InMemoryStore | ✅ Complete | Critical | 2 days | F5 | M1-T1 |

### M2 — Transport: Server + WS + Frames (4/4 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M2-T1 | Bun + Elysia HTTP server skeleton | 🟢 Complete | Critical | 1-2 days | F9 | M1-T1 |
| M2-T2 | API key auth (gnc_live_<32> Bearer) | ✅ Complete | Critical | 2-3 days | F46 | M2-T1 |
| M2-T3 | WebSocket transport (handshake + auth + heartbeat) | ✅ Complete | Critical | 3-5 days | F10 | M2-T1, M2-T2 |
| M2-T4 | Frame envelope + channel multiplexing | ✅ Complete | Critical | 2-3 days | F11 | M1-T3, M2-T1 |

### M3 — Tool Surface: MCP + 4 Tools (7/7 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M3-T1 | MCP server with 4 public tools | ✅ Complete | Critical | 2-3 days | F13 | M2-T1, M2-T4 |
| M3-T2 | Trust-boundary validation | ✅ Complete | Critical | 2 days | F14 | M1-T2, M3-T1 |
| M3-T3 | find_ui_component | ✅ Complete | High | 2 days | F15 | M1-T2, M3-T1 |
| M3-T4 | render_component | ✅ Complete | Critical | 3-5 days | F16 | M1-T2, M3-T1, M3-T3 |
| M3-T5 | update_component (JSON-Patch + replace) | ✅ Complete | Critical | 3-5 days | F17 | M1-T4, M3-T1, M3-T4 |
| M3-T6 | subscribe_to_events | ✅ Complete | High | 2-3 days | F18 | M3-T1 |
| M3-T7 | ui:// URI grammar | ✅ Complete | Medium | 1 day | F28 | M3-T1 |

### M4 — Runtime: Events + WC + Engine (7/7 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M4-T1 | Event capture from Custom Elements | ✅ Complete | High | 2 days | F19 | M3-T6 |
| M4-T2 | Internal event bus (post-emit + backpressure) | ✅ Complete | High | 2-3 days | F20 | M1-T5, M2-T4, M4-T1 |
| M4-T3 | Server-side event application | ✅ Complete | High | 2-3 days | F24 | M1-T4, M4-T2 |
| M4-T4 | GenicElement Web Component base | ✅ Complete | Critical | 3-5 days | F21 | M1-T4, M4-T5 (circular) |
| M4-T5 | Runtime engine (mount, patch, lifecycle) | ✅ Complete | Critical | 3-5 days | F29 | M4-T4, M4-T3 |
| M4-T6 | Vite plugin + auto-registration | ✅ Complete | Medium | 2-3 days | F30 | M4-T4 |
| M4-T7 | Session recovery (last-10-messages) | ✅ Complete | Medium | 2-3 days | F33 | M1-T5, M2-T3 |

### M5 — Registry: Registry + PrimeVue + Playground (6/6 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M5-T1 | Component registry + manifest loader | ✅ Complete | Critical | 3-5 days | F37 | M1-T2, M3-T1 |
| M5-T2 | Registry trust tiers | ✅ Complete | High | 2-3 days | F38 | M5-T1 |
| M5-T3 | PrimeVue DataTable registry | ✅ Complete | Critical | 5-7 days | F40 | M5-T1, M5-T2 |
| M5-T4 | Playground app skeleton (Nuxt + PrimeVue + WS) | ✅ Complete | High | 2-3 days | F41 | M5-T1 |
| M5-T5 | Agent bridge package (platform-agnostic) | ✅ Complete | Critical | 3-5 days | F42 | M3-T1, M5-T1 |
| M5-T6 | Suggestive prompts + registry selector | ✅ Complete | High | 2-3 days | F43 | M5-T4, M5-T5 |

### M6 — Deployment: CF + Bun + Nitro (0/4 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M6-T1 | Cloudflare Workers + DO deployment | ⚪ Not Started | High | 5-7 days | F61 | M1-T5, M2-T1 |
| M6-T2 | Bun self-host deployment | ⚪ Not Started | Medium | 2-3 days | F62 | M2-T1 |
| M6-T3 | DODurableObjectStore | ⚪ Not Started | High | 3-5 days | F62b | M1-T5, M6-T1 |
| M6-T4 | Nitro/Nuxt binding | ⚪ Not Started | Medium | 2-3 days | F64 | M2-T1 |

---

## Dependency Graph (Topological Order)

```
Layer 0:  M1-T1 (F1) — zero dependencies
Layer 1:  M1-T2 (F2), M1-T3 (F3), M1-T4 (F4), M1-T5 (F5), M2-T1 (F9)
Layer 2:  M2-T2 (F46), M2-T4 (F11), M6-T1 (F61), M6-T2 (F62), M6-T4 (F64)
Layer 3:  M2-T3 (F10) — depends on M2-T1, M2-T2
Layer 4:  M3-T1 (F13) — depends on M2-T1, M2-T4
Layer 5:  M3-T2 (F14), M3-T3 (F15), M3-T7 (F28) — depends on M3-T1
Layer 6:  M3-T4 (F16) — depends on M3-T3
Layer 7:  M3-T5 (F17), M3-T6 (F18) — depends on M3-T4 / M3-T1
Layer 8:  M4-T1 (F19) — depends on M3-T6
Layer 9:  M4-T2 (F20) — depends on M4-T1, M2-T4
Layer 10: M4-T3 (F24) — depends on M4-T2
Layer 11: M4-T4 (F21), M4-T5 (F29) — circular dep; build with stub
Layer 12: M4-T6 (F30), M4-T7 (F33) — depends on M4-T4 / M2-T3
Layer 13: M5-T1 (F37) — depends on M1-T2, M3-T1
Layer 14: M5-T2 (F38) — depends on M5-T1
Layer 15: M5-T3 (F40) — depends on M5-T1, M5-T2
Layer 16: M5-T4 (F41) — depends on M5-T1 (playground app)
Layer 17: M5-T5 (F42) — depends on M3-T1, M5-T1 (agent bridge)
Layer 18: M5-T6 (F43) — depends on M5-T4, M5-T5 (suggestive prompts)
Layer 16: M6-T3 (F62b) — depends on M6-T1
```

## Execution Order (Optimized for Velocity)

> **Analysis date:** 2026-09-02
> **Completed:** M1-T1..T5 (5/5), M2-T1..T2 (2/4)
> **Remaining:** 25 tasks across 5 milestones

### Ready to Start (zero unmet dependencies)

| Priority | Task | Feature | Why first | Unblocks |
|----------|------|---------|-----------|----------|
| **P0** | M2-T4 | F11 | Frame multiplexing — unlocks M3-T1 → all 7 M3 tasks | M3-T1 → All M3 |
| **P0** | M2-T4 | F11 | Gate to entire M3 milestone (7 tasks) | M3-T1 → All M3 |
| **P2** | M6-T2 | F62 | Independent, low effort (2-3 days) | Nothing critical |
| **P2** | M6-T4 | F64 | Independent, low effort (2-3 days) | Nothing critical |
| **P2** | M6-T1 | F61 | Independent, medium effort (5-7 days) | M6-T3 |

### Sequential Execution Plan

```
Step 1: M2-T2 (F46)  — API key auth [✅ Complete]
Step 2: M2-T4 (F11)  — Frame multiplexing [unlocks M3-T1 → all M3]
        ─── Both can run in parallel ───
Step 3: M2-T3 (F10)  — WebSocket transport [critical path]
Step 2: M2-T4 (F11)  — Frame multiplexing [unlocks M3-T1 → all M3]
        ─── Both can run in parallel ───
Step 3: M2-T3 (F10)  — WebSocket transport [critical path]
Step 4: M3-T1 (F13)  — MCP server + 4 tools [unlocks all M3 tools]
Step 5: M3-T2/T3/T7  — Trust boundary, find_ui, URI [3 parallel tasks]
Step 6: M3-T4 (F16)  — render_component
Step 7: M3-T5 (F17)  — update_component
Step 8: M3-T6 (F18)  — subscribe_to_events
Step 9: M4-T1 (F19)  — Event capture
Step 10: M4-T2 (F20) — Internal event bus
Step 11: M4-T3 (F24) — Server-side event application
Step 12: M4-T4/T5     — Web component + Runtime engine [circular, use stub]
Step 13: M5-T1 (F37)  — Component registry
Step 14: M5-T2 (F38)  — Registry trust tiers
Step 15: M5-T3 (F40)  — PrimeVue DataTable registry
Step 16: M5-T4 (F41)  — Playground app skeleton
Step 17: M5-T5 (F42)  — Agent bridge package
Step 18: M5-T6 (F43)  — Suggestive prompts + registry selector
Step 16: M4-T6 (F30)  — Vite plugin
Step 17: M4-T7 (F33)  — Session recovery
Step 18: M6-T1 (F61)  — CF Workers deploy [independent, can run earlier]
Step 19: M6-T3 (F62b) — DO session store
```

### Longest Critical Path (determines MVP timeline)

```
M2-T2 → M2-T3 → M2-T4 → M3-T1 → M3-T3 → M3-T4 → M3-T5 → M4-T1 → M4-T2 → M4-T3 → M4-T4/M4-T5 → M5-T1 → M5-T2 → M5-T3 → M5-T4 → M5-T5 → M5-T6
```

---

## Post-MVP Backlog (30 deferred items)

| Feature | Description | Bucket | Trigger |
|---|---|---|---|
| F12 | Long-poll transport fallback | P1 | After W12 v0.1.0 tag |
| F22 | _meta['openai/outputTemplate'] | P1 | After W12 v0.1.0 tag |
| F25 | React shim | P2 | Phase 2 (months 4-6) |
| F26 | Inline render mode | P1 | After W12 v0.1.0 tag |
| F27 | Svelte 5 shim | P2 | Phase 2 (months 4-6) |
| F31 | genicul-cli validate | P1 | After W12 v0.1.0 tag |
| F32 | Solid shim | P2 | Phase 2 (months 4-6) |
| F34 | Mantine registry | Phase 2 | Phase 2 (months 6-9) |
| F35 | shadcn registry | Phase 2 | Phase 2 (months 6-9) |
| F36 | Registry test framework + conformance | P2 | Phase 2 (months 4-6) |
| F39 | @genicui/conformance suite | P2 | Phase 2 (months 4-6) |
| F41 | Skeleton registry | Phase 2 | Phase 2 (months 6-9) |
| F42 | MUI registry | Phase 2 | Phase 2 (months 6-9) |
| F43 | Flowbite registry | Phase 2 | Phase 2 (months 6-9) |
| F44 | Mantine registry (v2) | Phase 2 | Phase 2 (months 6-9) |
| F45 | shadcn registry (v2) | Phase 2 | Phase 2 (months 6-9) |
| F47 | JWT auth + identity propagation | Phase 2 | Phase 2 (months 6-9) |
| F48 | PostgresListenNotifyStore | P1 | After W12 v0.1.0 tag |
| F49 | DO hibernation semantics | P1 | After W12 v0.1.0 tag |
| F50 | Rate limiting per API key | P2 | Phase 2 (months 4-6) |
| F51 | Quota per API key | P2 | Phase 2 (months 4-6) |
| F52 | OAuth 2.1 escape hatch | P2 | Phase 2 (months 4-6) |
| F53 | SSE fallback | P2 | Phase 2 (months 4-6) |
| F54 | CLI scaffold (create-genicui-app) | P2 | Phase 2 (months 4-6) |
| F55 | CLI scaffold (create-registry) | P2 | Phase 2 (months 4-6) |
| F56 | Animation primitives | Phase 2 | Phase 2 (months 6-9) |
| F57 | Form-associated custom elements | Phase 2 | Phase 2 (months 6-9) |
| F58 | R2 backups | P2 | Phase 2 (months 4-6) |
| F59 | Multi-region replication | P2 | Phase 2 (months 4-6) |
| F60 | GDPR mode | P2 | Phase 2 (months 4-6) |
| F63 | SvelteKit deploy binding | Phase 4 | Phase 4 (months 12+) |
| F65 | CDN distribution of registry metadata | Phase 4 | Phase 4 (months 12+) |
| F66 | Marketplace / discovery hub | Phase 4 | Phase 4 (months 12+) |
| F67 | Voice (LiveKit Agents) | Phase 4 | Phase 4 (months 12+) |

---

## Velocity Check

- **Current date:** 2026-09-03
- **Week 6 integration milestone:** Target date ~W6 of 12-week plan
- **Scope:** 32 features, 93 ACs, 6 milestones, 33 tasks
- **If any feature slips past W6:** propose cutting to deferred_for_post_mvp
