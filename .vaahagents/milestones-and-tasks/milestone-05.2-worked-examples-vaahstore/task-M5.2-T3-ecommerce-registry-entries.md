# Task M5.2-T3 — 18 ecommerce component registry entries + import-graph test

> **Milestone:** M5.2 (Worked Examples: VaahStore Guest-Shopper Journey)
> **Manifest feature:** None new — extends F37 (registry contract) + F38 (trust tiers); new file at `examples/playground-ecommerce/app/components/ecommerce/registry/components.ts`
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days
> **Workspace isolation constraint (locked, 2026-09-17):** zero edits to `packages/core/`, `packages/server/`, or root `package.json`. VaahStore provider source lives at `examples/playground-ecommerce/server/providers/vaahstore/` (NOT in `packages/server/src/chat/providers/`). The registry entries in this task read the 12 TypeBox schemas from the workspace-resident provider location, not from core.

## Task Goals

- Land `examples/playground-ecommerce/app/components/ecommerce/registry/components.ts` with all 18 component entries (name → import, props schema, events, examples)
- Land `examples/playground-ecommerce/app/components/ecommerce/registry/prompts.ts` re-exporting seed prompts for the workspace's PromptsPanel
- Land `examples/playground-ecommerce/app/components/ecommerce/registry/README.md` explaining how a new VaahStore component joins the catalog
- Land `examples/playground-ecommerce/app/components/ecommerce/index.ts` barrel export
- Land `examples/playground-ecommerce/app/components/resolve-mounted-component.ts` wired to the new `ECOMMERCE_REGISTRY`
- Write the **import-graph enforcement test** at `examples/playground-ecommerce/__tests__/ecommerce-import-graph.test.ts` that fails the build if any `ui/*.vue` file imports from `../agent/` or calls `useFetch` directly (EJG-LAYOUT-1)
- Write the **registry-50-line test** at `examples/playground-ecommerce/__tests__/registry-size.test.ts` that asserts `registry/components.ts` ≤ 50 lines of executable code (EJG-LAYOUT-2)

## Implementation Plan

> ⚠️ Analyze this plan thoroughly before implementing. Invoke relevant skills and MCP servers as needed.

### Pre-Implementation Analysis

- Read M5-T1 (`packages/server/src/registry/loader.ts` and the existing registry.ts shape) — the new entries must match the same contract (name, import, schema, events, examples) so the same render path works
- Read M5-T3 (PrimeVue registry precedent at `examples/playground/app/providers/registry.ts`) — the structure of name→import + events mirrors it
- Read the journey spec §4 layout — 18 component names + their categories (`ui/`, `agent/`, `registry/`) are spelled out; do not re-derive
- The 18 components themselves are NOT in this task — they land in M5.2-T4. This task only registers them. **Stub imports** point at `./ui/{Name}.vue` files that may not exist yet; the build will be wired in T4
- The import-graph test is the **structural contract** that makes the three-layer rule machine-enforced, not a convention

### Steps

1. Create the workspace `examples/playground-ecommerce/` — `package.json` (mirror `examples/playground/package.json`'s deps + PrimeVue + Vue 3 + @genicui/client), `nuxt.config.ts` (own `devServer.port`, PrimeVue styles, SSR off), `tsconfig.json`, `app/`, `__fixtures__/` (already populated by T2), `__tests__/`
2. Create `examples/playground-ecommerce/app/components/ecommerce/registry/components.ts` with the 18 entries — each entry is `{ name, import, propsSchema, events, examples }`, with TypeBox schemas (F2) and the existing registry contract shape from M5-T1
3. Create `examples/playground-ecommerce/app/components/ecommerce/registry/prompts.ts` re-exporting the 4 seed prompts from §7 (`"Show me running shoes under $120"`, `"Pick size 10, red or blue"`, `"Add to cart and checkout"`, `"Where's my order?"`)
4. Create `examples/playground-ecommerce/app/components/ecommerce/registry/README.md` — the "how to add a new VaahStore component" doc, mirroring `M5-T7`'s CityPicker + WeatherCard precedent
5. Create `examples/playground-ecommerce/app/components/ecommerce/index.ts` barrel export
6. Create `examples/playground-ecommerce/app/components/resolve-mounted-component.ts` with one branch: `import { ECOMMERCE_REGISTRY } from './ecommerce/registry/components'; const registries = [/* existing */, ECOMMERCE_REGISTRY];` — the new workspace starts with **zero** existing registries, so the array is `[ECOMMERCE_REGISTRY]` in this workspace
7. Write `examples/playground-ecommerce/__tests__/ecommerce-import-graph.test.ts` — Bun test that walks the filesystem under `app/components/ecommerce/ui/`, parses each `.vue` file's `<script setup>` block, and asserts no `from '../agent/'` import and no `useFetch(` call. Run as part of `bun --filter playground-ecommerce test` so a future agent that violates the rule fails the build (EJG-LAYOUT-1)
8. Write `examples/playground-ecommerce/__tests__/registry-size.test.ts` — Bun test that asserts `registry/components.ts` ≤ 50 lines (excluding comments + blank lines). Named after EJG-LAYOUT-2
9. Run both tests; expect green stub-state (registry imports all `./ui/{Name}.vue` files that T4 will create — until then, mark the test as `@todo` once T4 lands or use a `.skip` that T4 removes)
10. **Docs update — workspace-resident component map.** Per the "all should update docs" mandate, author `examples/playground-ecommerce/docs/components.md` documenting the 18-component breakdown: file → category (`ui`/`agent`/`registry`) → emits → consumes-from-12-tool-list. Cross-link to M5.2-T2-1's workspace-resident plugin docs (`docs/content/2.concepts/9.providers.md`) and to the journey spec §4. Keep ≤ 250 lines (matches the convention `docs/content/2.concepts/9.providers.md` follows). The page becomes the canonical reference for "what's in the workspace" alongside the new README that M5.2-T2-1 authors at `examples/playground-ecommerce/README.md`. The page must also reference the workspace-resident provider location explicitly (`server/providers/vaahstore/`, NOT `packages/server/src/chat/providers/vaahstore.ts`) so a future contributor doesn't re-introduce the core-edit.

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
| --- | --- | --- |
| `sequential-thinking` | When deciding where to draw the line between `registry/` and `agent/` for edge cases like `OrderProcessing` (which has both registry metadata and journey-step semantics) | Step 2 |
| `brainstorming` | If the import-graph test's parser becomes more than ~80 lines, step back and pick between AST-based vs. regex-based extraction | Step 7 |
| `filesystem` (MCP) | Create the new workspace + all registry/test files | Steps 1–6 |
| `memory` (MCP) | Persist the `resolve-mounted-component.ts` cross-workspace pattern once both playgrounds co-exist | End of task |

## Acceptance Criteria

- **M5.2-T3-AC1** — `examples/playground-ecommerce/` is a self-contained Bun workspace picked up by root `workspaces: ["examples/*"]`; `bun install` at repo root succeeds
- **M5.2-T3-AC2** — `bun --filter playground-ecommerce build` exits 0 (with T4's stubs OR with `test.skip` annotations that T4 removes — the workspace MUST boot)
- **M5.2-T3-AC3** — All 18 component entries exist in `registry/components.ts` with `name`, `import` (pointing at `./ui/{Name}.vue`), `propsSchema`, `events`, `examples`
- **M5.2-T3-AC4** — `registry/components.ts` stays under 50 lines of executable code (EJG-LAYOUT-2) — verified by `registry-size.test.ts`
- **M5.2-T3-AC5** — The import-graph test refuses any future change that introduces `from '../agent/'` inside `ui/` (EJG-LAYOUT-1) — verified by intentionally adding a violating import and seeing the test fail
- **M5.2-T3-AC6** — The 4 seed prompts from §7 are exported from `registry/prompts.ts`
- **M5.2-T3-AC7** — Zero edits under `examples/playground/`, `packages/`, or root `package.json` (EJG-LAYOUT-3) — verified by `git status` showing only new files under `examples/playground-ecommerce/`
- **M5.2-T3-AC8** — **No-core-edits gate:** `bun --filter playground-ecommerce check-isolation` exits 0 — the workspace isolation script (added by M5.2-T2-1) asserts `git diff packages/`, `git diff examples/playground/`, and `git diff package.json` are all empty modulo the VaahStore source deletion done by T2-1. Verified by re-running after each commit.
- **M5.2-T3-AC9** — **Docs update landed:** `examples/playground-ecommerce/docs/components.md` exists, ≤ 250 lines, references the workspace-resident provider location, and cross-links to `docs/content/2.concepts/9.providers.md` (rewritten by M5.2-T2-1). Verified by `bun --filter genicui-docs build` exiting 0 (docs site builds without broken refs).

## Completion Criteria

- [ ] All 9 acceptance criteria above pass
- [ ] `bun install` at repo root exits 0 with the new workspace registered
- [ ] `bun --filter playground-ecommerce test` exits green (registry-size + import-graph)
- [ ] `bun --filter playground-ecommerce check-isolation` exits 0 (no-core-edits gate, script added by M5.2-T2-1)
- [ ] `bun --filter genicui-docs build` exits green (no broken cross-refs from the new `components.md`)
- [ ] `bun run lint` reports zero errors in the new workspace
- [ ] Workspace isolation: `git diff` against `examples/playground/` shows no changes
- [ ] Docs update: `examples/playground-ecommerce/docs/components.md` is published with all 18 component rows

## Testing Checklist

- [ ] Unit tests: `registry-size.test.ts` (EJG-LAYOUT-2) + `ecommerce-import-graph.test.ts` (EJG-LAYOUT-1)
- [ ] Negative test: import-graph test fails when a violating import is added — manual verification by editing a stub `ui/X.vue` file, running the test, then reverting
- [ ] Workspace wiring test: `bun install` from a clean checkout picks up the new workspace
- [ ] Build smoke: `bun --filter playground-ecommerce build` exits 0 (with T4 stubs in place; if T4 hasn't shipped yet, gate the build behind a `BUN_SKIP_MISSING_UI=1` env that T4 removes)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
| --- | --- | --- | --- | --- |
| M5.2-T3-01 | Scaffold `examples/playground-ecommerce/` workspace (package.json, nuxt.config.ts, tsconfig.json) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T3-02 | Author `registry/components.ts` with 18 entries | ⚪ Not Started | ✅ Yes | High |
| M5.2-T3-03 | Author `registry/prompts.ts` re-exporting the 4 §7 seed prompts | ⚪ Not Started | ❌ No | Medium |
| M5.2-T3-04 | Author `registry/README.md` (how to add a VaahStore component) | ⚪ Not Started | ❌ No | Medium |
| M5.2-T3-05 | Author `ecommerce/index.ts` barrel + `resolve-mounted-component.ts` for the new workspace | ⚪ Not Started | ✅ Yes | High |
| M5.2-T3-06 | Write `ecommerce-import-graph.test.ts` (EJG-LAYOUT-1) | ⚪ Not Started | ✅ Yes | Critical |
| M5.2-T3-07 | Write `registry-size.test.ts` (EJG-LAYOUT-2) | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.2-T1 (verification report — registry entries reference verified schema field names)
- **Blocks:** M5.2-T4 (UI components fill the `./ui/{Name}.vue` stubs the registry imports), M5.2-T5 (journey state machine references the registry's event names)

## Documentation References

- Source: `.vaahagents/requirements/idea/examples-vaahstore-guest-journey.md` §4 (18-component list + three-layer rule) + §7 (4 seed prompts)
- Registry contract: M5-T1 (`packages/server/src/registry/loader.ts`) + `.vaahagents/milestones-and-tasks/milestone-05-registry/task-M5-T1-component-registry.md`
- PrimeVue registry precedent: M5-T3 + `examples/playground/app/providers/registry.ts`
- Component-event interactivity pattern: M5-T7 (`milestone-05-registry/task-M5-T7-component-event-interactivity.md`) — CityPicker + WeatherCard

## Notes

- **Workspace decoupling is the headline.** This task creates the entire workspace skeleton so T4 can drop `.vue` files into the right folders without touching anything else. If T4 ever needs to add a new component, the registry update + import-graph test re-run is the only ceremony.
- **Stub imports are fine in this task** — `import X from './ui/ProductGrid.vue'` resolves to a non-existent file until T4 lands. Either (a) gate the build behind `BUN_SKIP_MISSING_UI=1` until T4 ships, or (b) ship empty stub `.vue` files in T3 that T4 replaces. Pick (b) — fewer moving parts.
- **Honour the velocity directive:** if the import-graph test's parser exceeds ~80 lines, simplify to a regex check that catches `from '../agent/'` and `useFetch(` — the structural contract matters more than the parser's elegance.
- **Workspace-resident provider, not core (locked 2026-09-17).** Per user redirect, the VaahStore provider lives at `examples/playground-ecommerce/server/providers/vaahstore/`, NOT at `packages/server/src/chat/providers/vaahstore.ts`. The registry entries in this task import the 12 TypeBox schemas from the workspace-resident provider location. **No edits to `packages/`** are permitted — the workspace isolation script (`examples/playground-ecommerce/scripts/check-isolation.sh`, added by M5.2-T2-1) gates this rule.
- **Docs update landed in this task.** `examples/playground-ecommerce/docs/components.md` is authored as part of the Implementation Plan (Step 10). It documents the workspace-resident provider location explicitly so future contributors don't re-introduce the core-edit mistake that M5.2-T2 (commit `330e94f`) made.