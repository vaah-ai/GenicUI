# Milestone M5.2 — Worked Examples: VaahStore Guest-Shopper Journey

> **Roadmap phase:** Post-M5, parallel to M5.1 (docs) and M6 (Deployment)
> **Roadmap week:** W9–W10 (parallel; slip-acceptable since it is a worked example, not a framework feature)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 12 days (≈ 2.5 weeks × single maintainer, partly parallel with M5.1/M6)
> **Dependencies:** None blocking — soft read-only on M5 (registry contract), M5-T5 (agent bridge), M5.1-T15 (provider registry docs). M3-T2 (F14 trust-boundary) is the safety net every new tool call must satisfy.

## Objective

Ship a **separate workspace** at `examples/playground-ecommerce/` that proves GenicUI drives a real, end-to-end e-commerce flow against the **VaahStore** headless commerce API — a guest-shopper journey across 9 steps (browse → filter → detail → cart → checkout → order → tracking → optional account conversion), supported by a new chat-provider adapter (`examples/playground-ecommerce/server/providers/vaahstore/`, 12 TypeBox tools — workspace-resident, NOT in `packages/server/src/chat/providers/`) and 18 new PrimeVue-backed registry entries.

The example is **isolated from `examples/playground/` AND from `packages/`** — separate Nuxt app, separate component registry, separate fixture harness, separate `devServer.port`, separate provider plugin API. It exists to:

1. Validate the **`M5-T5` agent-bridge + `M5.1-T15` provider-registry** surface against a real external API (not the in-process Claude Code provider).
2. Demonstrate the **three-layer `ui/agent/registry` split** as a reusable shape — a follow-on worked example (cartviewer.md already proved the multi-framework shape).
3. Demonstrate the **in-workspace plugin pattern** — a workspace-resident `defineProvider` + `registerProvider` API that lets each example workspace ship its own providers without modifying `@genicui/core` or `@genicui/server`. Future example workspaces can copy this pattern.
4. Provide the **headline guest-flow demo** (no auth, deferred server-cart handoff, post-purchase conversion) — the kind of journey every framework showcase skips.

The journey spec lives at `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` (10 sections, 9-step journey, 18 components, 12 tool calls, 7 unverified API assumptions, EJG-AC1–3 + EJG-COMP-1–5 + EJG-ADAPT-1–3 + EJG-LAYOUT-1–3). This milestone operationalises it.

## Workspace Isolation Rules (Locked, 2026-09-17)

Per user redirect ("provider-vaahstore should exist in `/Users/pk/Projects/GenicUI/examples/playground-ecommerce` ... none of these tasks should affect core of genicui"):

- **Provider location.** VaahStore provider source lives at `examples/playground-ecommerce/server/providers/vaahstore/`. **NOT** at `packages/provider-vaahstore/`, **NOT** at `packages/server/src/chat/providers/vaahstore.ts`.
- **Plugin API location.** `defineProvider` + `registerProvider` + `unregisterProvider` + `listProviderIds` + `getProviderAdaptor` + `discoverWorkspaceProviders` live at `examples/playground-ecommerce/server/providers/{index,registry,types,boot}.ts`. **NOT** in `@genicui/core`. **NOT** in `@genicui/server`. The API is workspace-resident.
- **Zero core edits.** No M5.2 task edits any file under `packages/core/`, `packages/server/`, or root `package.json`. The only exception is the deletion of `packages/server/src/chat/providers/vaahstore.ts` + `vaahstore.test.ts` + the 12 VaahStore fixtures (cut-paste into the new workspace location). `packages/server/src/chat/providers/registry.ts` is untouched. `claude-code.ts` and `codex.ts` stay where they are.
- **Workspace isolation gate.** Every M5.2 task's Completion Criteria invokes `bun --filter playground-ecommerce check-isolation`, which runs `examples/playground-ecommerce/scripts/check-isolation.sh` and asserts `git diff packages/`, `git diff examples/playground/`, and `git diff package.json` are all empty modulo the VaahStore source deletion.
- **Docs-update mandate.** Every M5.2 task includes a docs-update sub-step in its Implementation Plan. M5.2-T2-1 owns the rewrite of `docs/content/2.concepts/9.providers.md` + `examples/playground-ecommerce/README.md`. M5.2-T3/T4/T5 each own an update to `examples/playground-ecommerce/docs/<their-slug>.md` plus any cross-references they touch.
- **Bun workspace glob is unchanged.** Root `package.json:9-13` already picks up `examples/*`, so the new workspace is auto-registered without any root-level edit.

## Success Criteria

- [ ] `examples/playground-ecommerce/` is a self-contained Bun workspace picked up by the root `workspaces: ["examples/*"]` glob; `bun install` at the repo root succeeds; `bun --filter playground-ecommerce dev` boots the app on its own port
- [ ] Zero edits under `examples/playground/`, `packages/`, or root `package.json` — the new workspace is purely additive
- [ ] 7 VaahStore API assumptions in §6 of the journey spec are verified or downgraded to fallbacks (EJG-ADAPT-1 covers both paths)
- [ ] All 12 VaahStore tools return fixture data when `VITE_VAAHSTORE_LIVE=0` (default); the same tool calls hit live VaahStore endpoints when the env var is set with credentials present
- [ ] Every VaahStore tool call is wrapped with `wrapWithValidation` (F14) — invalid LLM output is rejected with `-32003 props_invalid` before any HTTP request (EJG-ADAPT-2)
- [ ] The VaahStore bearer token never appears in client logs, server log output, or `RenderedComponent` props (EJG-ADAPT-3, verified by inspecting fixture + live log output)
- [ ] Journey smoke: a guest user can complete Steps 1→7 against mocked fixtures without ever creating an account (EJG-AC1)
- [ ] Journey smoke: closing the browser, reopening, and typing *"where's my order?"* resolves the prior order via `sessionId` + `lastOrderEmail` (EJG-AC2)
- [ ] Journey smoke: the post-checkout `AccountUpgradePrompt` converts a guest into an authed customer and the previously-placed order is attached via `claim_order` (EJG-AC3)
- [ ] All 18 components render in the new workspace via the existing `render_component` flow (F16) without touching the original `examples/playground/app/components/resolve-mounted-component.ts`
- [ ] Component-level ACs from the journey spec: EJG-COMP-1 (no remount on filter), EJG-COMP-2 (stock indicator <300ms), EJG-COMP-3 (MiniCartToast 3s auto-dismiss, no sibling unmount), EJG-COMP-4 (per-step retry on order failure), EJG-COMP-5 (ShipmentTracker timeline)
- [ ] Layout-level ACs: no file under `components/ecommerce/ui/` imports from `agent/` or calls `useFetch` (enforced by EJG-LAYOUT-1 import-graph test); `registry/components.ts` stays under 50 lines of logic (EJG-LAYOUT-2)

## Tasks

| Task | Title | Maps to (manifest/journey AC) | Effort |
|---|---|---|---|
| M5.2-T1 | Verify VaahStore API surface (7 assumptions) | EJG-ADAPT-1 prerequisites | 2 days |
| M5.2-T2 | VaahStore chat provider adapter (12 TypeBox tools, fixtures, F14 wrap) | EJG-ADAPT-1, EJG-ADAPT-2, EJG-ADAPT-3 | 3 days |
| M5.2-T3 | 18 ecommerce component registry entries + import-graph test | EJG-LAYOUT-1, EJG-LAYOUT-2, EJG-LAYOUT-3 | 2 days |
| M5.2-T4 | Ecommerce UI components (ui/ Vue layer, 18 files) | EJG-COMP-1–5 | 3 days |
| M5.2-T5 | Agent journey state machine + Playwright end-to-end smoke | EJG-AC1, EJG-AC2, EJG-AC3 | 2 days |

**Total: 5 tasks, 12 days.**

## Dependencies

- **Blocks:** No downstream milestones. Worked example is terminal — it consumes prior milestones and produces nothing they depend on.
- **Requires:** Soft reads from M5-T1 (registry contract), M5-T5 (agent-bridge `ProviderWirePayload` shape from M5.1-T15), M3-T2 (F14 `wrapWithValidation`). All three are ✅ Complete.

## Manifest Cross-References

- **Features:** None new — extends existing F13 (MCP), F14 (trust boundary), F15/F16/F17/F18 (render/update/subscribe), F37/F38 (registry contract + trust tiers), F40 (PrimeVue), F42/F43 (agent bridge + chat), F76 (provider registry docs).
- **Quality attributes covered:**
  - **Usability** (primary — the entire milestone is a usability demonstration)
  - **Security** (F14 `wrapWithValidation` applied to every new tool; bearer token scrubbing per EJG-ADAPT-3)
  - **Maintainability** (three-layer rule enforced by import-graph test EJG-LAYOUT-1; <50-line registry per EJG-LAYOUT-2)
- **Pipeline handoff invariants honoured:**
  - `quality_attributes.elicited.security` — every tool call goes through `stripProtoKeys` + `Value.Check`
  - `quality_attributes.elicited.usability` — the worked example exists to make the framework's affordances visible to a new evaluator
  - `pipeline_handoff.deferred_for_post_mvp` — this milestone does **not** add to the 30 deferred items; it is additive to the existing MVP surface, not a new framework feature

## Smoke Test (Integration Gate)

The milestone is "done" when **all** of the following green:

1. `bun install` at the repo root succeeds with `examples/playground-ecommerce/` in the workspace tree
2. `bun --filter playground-ecommerce build` exits 0
3. `bun --filter playground-ecommerce dev` boots the new Nuxt app on its assigned port without errors
4. Playwright journey test: fills the chat input with *"show me running shoes under $120"*, clicks through to checkout, places the order, returns in a second browser context, asks *"where's my order?"*, and verifies the prior order resolves (EJG-AC1 + EJG-AC2)
5. Playwright journey test: completes the `AccountUpgradePrompt` flow and verifies the order moves from guest-keyed-by-email to account-attached (EJG-AC3)
6. `bun --filter playground-ecommerce test` exits green — covers unit (per-AC), integration (registry load + F14 wrap), import-graph test (EJG-LAYOUT-1), and Playwright journey
7. EJG-ADAPT-1 dual-mode verified: with `VITE_VAAHSTORE_LIVE=0` the 12 tools return fixtures; with the env var set, the same tool calls hit live VaahStore
8. EJG-ADAPT-3 verified: bearer token does not appear in any captured log, server stdout, or rendered component prop payload (grep the Playwright run output)
9. EJG-LAYOUT-1 enforced: the import-graph test refuses any future change that introduces `from '../agent/'` inside `ui/`
10. The original `examples/playground/` dev server still boots with zero behaviour change (regression gate)

## Notes

- **Naming precedent:** `M5.2` deliberately mirrors the user-authorized `M5.1` compound-ID extension (see memory `genicui-planner-conventions-extended.md`). Permitted as a one-off.
- **Workspace isolation:** the new workspace exists to prove the GenicUI surface is composable across apps, not to fork the playground. If a future task ever wants to consolidate, the import-graph test (EJG-LAYOUT-1) is the seam.
- **Fixture-first:** the default `VITE_VAAHSTORE_LIVE=0` mode exists so evaluators can `bun dev` the workspace without VaahStore credentials. The live mode is opt-in and only exercised in CI under a secret guard.
- **No new F-ID assigned** in `manifest.json` — this milestone produces no new manifest features. The 18 components + 12 tools + journey state machine are implementation work under existing manifest entries (F13/F14/F15/F16/F17/F18/F37/F38/F40/F42/F43/F76).