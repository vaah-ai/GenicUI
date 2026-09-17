# GenicUI — Project Dashboard

> **Last updated:** 2026-09-17
> **Last updated by:** M5.2 planning session — VaahStore Guest-Shopper Journey example workspace (`examples/playground-ecommerce/`)
> **Development phase:** Testable MVP — 32 features / 93 ACs, 8-12 weeks, single maintainer
> **Status:** 5/7 milestones complete (M1–M5 done) · 43/49 tasks complete · 6 tasks not started (M6) · 5 tasks planned (M5.2)

---

## Milestone Summary

| ID | Title | Phase | Week | Status | Priority | Effort | Tasks | Manifest Features |
|---|---|---|---|---|---|---|---|---|
| M1 | Foundations: Core Package | Foundations | W1 | 🟢 Complete | Critical | 7-10 days | 5 | F1, F2, F3, F4, F5 |
| M2 | Transport: Server + WS + Frames | Transport | W2 | 🟢 Complete | Critical | 7-10 days | 4 | F9, F46, F10, F11 |
| M3 | Tool Surface: MCP + 4 Tools | Tool Surface | W3-W4 | 🟢 Complete | Critical | 10-14 days | 7 | F13, F14, F15, F16, F17, F18, F28 |
| M4 | Runtime: Events + WC + Engine | Runtime | W4-W8 | 🔄 In Progress | Critical | 14-21 days | 7 | F19, F20, F24, F21, F29, F30, F33 |
| M5 | Registry: Registry + PrimeVue + Playground | Registry | W7 | ✅ Complete | Critical | 10-14 days | 7 | F37, F38, F40, F41, F42, F43, F47 |
| M5.1 | Documentation Site (Docus + Vercel) | Post-M5, parallel to M6 | W8-W9 | 🔄 In Progress | High | 17 days | 15 | F68, F69a, F69b, F70, F71a–F71f, F72, F73, F74, F75, F76 |
| M5.2 | Worked Examples: VaahStore Guest-Shopper Journey | Post-M5, parallel to M5.1/M6 | W9-W10 | ⚪ Not Started | High | 12 days | 5 | (none new — extends F13/F14/F16/F17/F18/F37/F40/F42/F43/F76) |
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

### M5 — Registry: Registry + PrimeVue + Playground (7/7 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M5-T1 | Component registry + manifest loader | ✅ Complete | Critical | 3-5 days | F37 | M1-T2, M3-T1 |
| M5-T2 | Registry trust tiers | ✅ Complete | High | 2-3 days | F38 | M5-T1 |
| M5-T3 | PrimeVue DataTable registry | ✅ Complete | Critical | 5-7 days | F40 | M5-T1, M5-T2 |
| M5-T4 | Playground app skeleton (Nuxt + PrimeVue + WS) | ✅ Complete | High | 2-3 days | F41 | M5-T1 |
| M5-T5 | Agent bridge package (platform-agnostic) | ✅ Complete | Critical | 3-5 days | F42 | M3-T1, M5-T1 |
| M5-T6 | Suggestive prompts + registry selector | ✅ Complete | High | 2-3 days | F43 | M5-T4, M5-T5 |
| M5-T7 | Component-event interactivity (CityPicker → WeatherCard) | ✅ Complete | High | 5-7 days | F47 | M5-T1, M5-T3, M5-T4, M5-T6 |

### M6 — Deployment: CF + Bun + Nitro (0/4 complete)

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M6-T1 | Cloudflare Workers + DO deployment | ⚪ Not Started | High | 5-7 days | F61 | M1-T5, M2-T1 |
| M6-T2 | Bun self-host deployment | ⚪ Not Started | Medium | 2-3 days | F62 | M2-T1 |
| M6-T3 | DODurableObjectStore | ⚪ Not Started | High | 3-5 days | F62b | M1-T5, M6-T1 |
| M6-T4 | Nitro/Nuxt binding | ⚪ Not Started | Medium | 2-3 days | F64 | M2-T1 |

### M5.1 — Documentation Site (Docus + Vercel) (13/15 complete)

> **Folder:** `milestone-05.1-documentation-site/`
> **Convention note:** `M5.1` deliberately violates the planner's `M{n}` no-zero-pad rule (user-authorized extension). Permitted as a one-off; see project-conventions memory entry.
> **Manifest mapping:** F68 (scaffold), F69a (corpus reconciliation), F69b (IA), F70 (API Reference), F71a (landing), F71b (Getting Started), F71c (Concepts), F71d (Guides), F71e (Cookbook), F71f (Deployment section), F72 (search/SEO/llms.txt), F73 (Vercel deploy), F74 (Mantine walkthrough), F75 (chat-events vocabulary), F76 (provider registry). 15 new IDs; manifest tops out at F67 today, F41/F42/F43/F47 already double-booked. F74/F75/F76 added 2026-09-16 to close 3 docs-vs-playground gaps (memory: genicui-docs-vs-playground-gap.md).

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M5.1-T1 | Docus scaffold + workspace wiring | 🟢 Complete | Critical | 0.5 day | F68 | None |
| M5.1-T2 | Corpus reconciliation + cross-ref rewrite | 🟢 Complete | Critical | 1 day | F69a | None |
| M5.1-T3 | Information architecture + `.navigation.yml` | 🟢 Complete | Critical | 1 day | F69b | M5.1-T1 |
| M5.1-T4 | Landing page + global layout | 🟢 Complete | High | 1 day | F71a | M5.1-T1, M5.1-T3 |
| M5.1-T5 | Getting Started (3 pages) | 🟢 Complete | Critical | 1 day | F71b | M5.1-T1, M5.1-T3 |
| M5.1-T6 | Concepts section (7 pages) | 🟢 Complete | Critical | 2 days | F71c | M5.1-T1, M5.1-T3 |
| M5.1-T7 | Guides section (5 pages) | 🟢 Complete | Critical | 2 days | F71d | M5.1-T1, M5.1-T3 |
| M5.1-T8 | API Reference (5 packages + 1 registry + MCP tools) | 🟢 Complete | Critical | 2 days | F70 | M5.1-T1, M5.1-T3 |
| M5.1-T9 | Cookbook (4–6 recipes) | 🟢 Complete | Medium | 1 day | F71e | M5.1-T6, M5.1-T8 |
| M5.1-T10 | Deployment section (4 landing pages) | 🟢 Complete | Medium | 1 day | F71f | M5.1-T3 |
| M5.1-T11 | Search + SEO + llms.txt | 🟠 Deferred | High | 1 day | F72 | M5.1-T4 |
| M5.1-T12 | Vercel deploy + smoke test | 🟠 Deferred | Critical | 0.5 day | F73 | M5.1-T1–M5.1-T11 |
| M5.1-T13 | Mantine walkthrough (library-agnosticism proof) | 🟢 Complete | High | 1 day | F74 | None |
| M5.1-T14 | Chat events vocabulary (Concepts) | 🟢 Complete | High | 1 day | F75 | None |
| M5.1-T15 | Provider registry (Concepts) | 🟢 Complete | High | 1 day | F76 | None |

> **T11/T12 deferral note (2026-09-17):** T11 (AC9 Vercel preset + AC10 browser MCP) and T12 (Vercel link/deploy/DNS/Lighthouse/preview-banner manual steps) are deferred pending user action — code/config shipped, deploy gate awaits manual verification.

### M5.2 — Worked Examples: VaahStore Guest-Shopper Journey (0/5 planned)

> **Folder:** `milestone-05.2-worked-examples-vaahstore/`
> **Workspace:** `examples/playground-ecommerce/` (NEW sibling workspace — separate from `examples/playground/`, picked up by root `workspaces: ["examples/*"]` glob).
> **Convention note:** `M5.2` mirrors the user-authorized `M5.1` compound-ID extension. Permitted as a one-off.
> **Manifest mapping:** no new F-IDs assigned — this milestone is additive to existing F13/F14/F16/F17/F18/F37/F40/F42/F43/F76 surface, not a new framework feature. Goal: showcase GenicUI driving a real headless-commerce API end-to-end.
> **Journey spec:** `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` (9-step guest-shopper journey, 18 components, 12 VaahStore tools, EJG-AC1–3 + EJG-COMP-1–5 + EJG-ADAPT-1–3 + EJG-LAYOUT-1–3).

| ID | Title | Status | Priority | Effort | Manifest | Dependencies |
|---|---|---|---|---|---|---|
| M5.2-T1 | Verify VaahStore API surface (7 assumptions in §6) | ⚪ Not Started | Critical | 2 days | None new | None |
| M5.2-T2 | VaahStore chat provider adapter (`packages/server/src/chat/providers/vaahstore.ts`, 12 TypeBox tools, fixtures, F14 wrap) | ⚪ Not Started | Critical | 3 days | None new (extends F13/F14/F76) | M5.2-T1 |
| M5.2-T3 | 18 ecommerce component registry entries + import-graph test (`examples/playground-ecommerce/app/components/ecommerce/registry/`) | ⚪ Not Started | High | 2 days | None new (extends F37/F38) | M5.2-T1 |
| M5.2-T4 | Ecommerce UI components — 18 `.vue` files in `ui/` (EJG-COMP-1–5) | ⚪ Not Started | High | 3 days | None new (extends F16/F21) | M5.2-T3 |
| M5.2-T5 | Agent journey state machine + Playwright end-to-end smoke (EJG-AC1–3) | ⚪ Not Started | Critical | 2 days | None new (extends F42/F43) | M5.2-T2, M5.2-T3, M5.2-T4 |

> **Workspace isolation rule (2026-09-17):** M5.2 introduces a NEW `examples/playground-ecommerce/` workspace per user direction ("we should completed different ecommerce playground like /Users/pk/Projects/GenicUI/examples/playground-ecommerce so that they don't affect each other"). Zero edits to `examples/playground/`, `packages/`, or root `package.json` — the new workspace is purely additive and is picked up automatically by the existing `workspaces: ["examples/*"]` glob.

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

- **Current date:** 2026-09-17
- **Week 6 integration milestone:** Target date ~W6 of 12-week plan
- **Scope:** 32 features, 93 ACs, 7 milestones (M1–M5 ✅, M5.1 🔄, M5.2 ⚪, M6 ⚪), 38 tasks (43 complete, 5 M5.2 planned, 6 not-started in M6)
- **If any feature slips past W6:** propose cutting to deferred_for_post_mvp
- **M5.2 note:** VaahStore journey milestone is **additive, not framework-blocking** — every task extends already-shipped surface (F13/F14/F16/F17/F18/F37/F40/F42/F43/F76). Slip beyond W10 is acceptable; M6 Deployment timeline is not coupled.
