# Task M5.1-T13 — Mantine walkthrough (library-agnosticism proof)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F74 (new — multi-library examples)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Author one docs page that demonstrates how to wrap a non-PrimeVue UI library (Mantine) as a GenicUI registry. The page is **not** a shipping target — it's a self-contained walkthrough that proves the library-agnosticism promise documented in `README.md` and `concepts/components`. Mantine is chosen because it's the most popular non-PrimeVue component library, has a clear React-component API that maps cleanly to the `GenicElement` Web Component adapter pattern, and is used by Linear / Raycast / Vercel — high signal in the dev community.

This task extends the existing M5.1 milestone (which already shipped T1–T12). It does **not** require any code changes in `packages/`, `examples/playground/`, or `registries/`.

## Task Goals

- Create new docs section `docs/content/10.examples/` with `.navigation.yml`
- Author `docs/content/10.examples/1.mantine.md` (~250 lines)
- Update root `docs/content/.navigation.yml` to surface the new section in top-level nav
- Update `milestone-05.1-documentation-site/ia-tree.md` to append the new section
- Verify `bun --filter genicui-docs build` exits 0

## Implementation Plan

### Pre-Implementation Analysis

- Read `docs/content/2.concepts/4.components.md` and `docs/content/3.guides/4.custom-registry.md` to identify the exact vocabulary the new page must cross-reference (do not duplicate — link out).
- Read `docs/content/4.api/6.primevue-registry.md` to confirm the PrimeVue wrapper pattern is documented and the Mantine page can refer back to it as the canonical example.
- Read `examples/playground/app/components/RenderedComponent.vue` (memory) to confirm what wrapping looks like in code; use the same `class X extends GenicElement { render(props) { ... } }` shape.
- Read the prompt-ai-milestones-tasks-planner.md §Sub-tasks table — this task is effort = M (1 day), no sub-tasks needed.

### Steps

1. Create `docs/content/10.examples/.navigation.yml` with:
   ```yaml
   title: Examples
   ```
2. Author `docs/content/10.examples/1.mantine.md` with these sections:
   - **Why a second library?** — recap library-agnosticism, name the 4 steps in the adapter pattern, point at PrimeVue as the canonical example
   - **The 4-step adapter recipe** — (a) extend `GenicElement`, (b) render into closed Shadow DOM via `attachShadow({ mode: 'closed' })`, (c) declare `static propsSchema` with `additionalProperties: false`, (d) `customElements.define('genui-mantine-button', MantineButton)`
   - **Wrap `<Button>`** — full code: `class MantineButton extends GenicElement { render(props) { /* render Mantine Button into shadow DOM */ } }`, with the `propsSchema` derived from Mantine's actual Button props (`variant`, `size`, `disabled`, `loading`)
   - **Wrap `<TextInput>`** — full code with `propsSchema` covering `label`, `placeholder`, `value`, `onChange`
   - **Wrap `<Modal>`** — full code, including `composed: true` `CustomEvent('modal_close', ...)` emission
   - **Registry.json entry** — show the YAML shape (name, version, description, propsSchema, events, examples, tags) mirroring PrimeVue
   - **What's out of MVP scope** — explicit note that this is a docs walkthrough; no `@genicul-mantine/registry` package ships with GenicUI; users building their own registry follow the same pattern
   - **Cross-refs** — link to `/concepts/components`, `/guides/custom-registry`, `/api/primevue-registry`. Add a final "See also" line pointing at `/concepts/chat-events` and `/concepts/providers` so library-wrappers discover the chat-plumbing pages.
3. Update `docs/content/.navigation.yml` root to include `10.examples` in the top-level nav list
4. Update `milestone-05.1-documentation-site/ia-tree.md` to append the new section under the existing IA tree (preserve the existing 9 sections)
5. Run `bun --filter genicui-docs build` to verify the new page compiles into the static output without errors
6. Spot-check the rendered output at `http://localhost:3000/examples/mantine` (dev server)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `filesystem` (MCP) | File creation / modification | Writing the markdown page + navigation files |
| `sequential-thinking` | Scope check if reviewer flags > 250 lines | Only if content is sliding into a full registry tutorial |

## Acceptance Criteria

- AC1: New file `docs/content/10.examples/1.mantine.md` exists and is ≤ 250 lines
- AC2: Page contains all 8 sections listed in Step 2 above
- AC3: All 3 wrapper code examples (Button, TextInput, Modal) are syntactically valid TypeScript-React and follow the `class X extends GenicElement` pattern
- AC4: Page references the existing cross-refs to `/concepts/components`, `/guides/custom-registry`, `/api/primevue-registry` — no broken internal links
- AC5: `docs/content/10.examples/.navigation.yml` exists and registers the section
- AC6: `docs/content/.navigation.yml` root nav surfaces "Examples" alongside the existing 9 sections
- AC7: `bun --filter genicui-docs build` exits 0 with the new content included
- AC8: Page explicitly notes "This walkthrough is documentation-only — no `@genicul-mantine/registry` package ships with GenicUI"

## Completion Criteria

- [ ] All 8 acceptance criteria above pass
- [ ] `bun --filter genicui-docs build` exits green
- [ ] No new package boundaries, no new dependencies, no code changes outside `docs/content/`
- [ ] Page is referenced from at least one other docs page (cross-link back from `/guides/custom-registry` "Related Recipes" section, if present, otherwise from `/concepts/components` "Examples in the wild")

## Testing Checklist

- [ ] Manual review — page renders correctly in dev server at `/examples/mantine`
- [ ] Link check — no broken internal cross-refs (the existing `bunx linkinator` pipeline from M5.1-T2 should catch this)
- [ ] Build check — `bun --filter genicui-docs build` exits 0

## Sub Tasks

None. Single-author, single-day task.

## Dependencies

- **Requires:** None
- **Blocks:** None. Optional cross-link back from `/guides/custom-registry` is recommended but not a hard blocker.

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F74]` (new, to be added)
- Per-feature: `.vaahagents/requirements/specs/features/feature-074-mantine-walkthrough.md` (to be authored in parallel, or skip per velocity-over-scope — T13 task file is sufficient)
- Architecture: `.vaahagents/requirements/specs/architecture.md` (no section ref needed — this is docs content)
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` (no new decisions introduced)

## Notes

- **Why Mantine not shadcn:** Mantine has a mature component API that maps 1-to-1 to the `GenicElement` wrapper pattern; shadcn's copy-paste primitives would require a different (deeper) discussion of Tailwind + Radix fundamentals that doesn't fit a 250-line walkthrough. Mantine is the canonical "library with a runtime package" case.
- **Why docs page only, no real registry:** Per user direction, this is a markdown-only deliverable. A real `registries/mantine/` package would be a separate milestone (likely M7 or post-MVP F34 — Mantine is already in the deferred backlog as F34).
- **No Vue subpath note:** PrimeVue works because the playground is Vue. Mantine is React — the walkthrough explicitly notes that `@genicui/client` is framework-agnostic (no `@genicui/client/react` subpath needed; same `GenicElement` base class works).
- **Velocity check:** This task is small (1 day) and has no dependency on M6 (deployment) or any other active milestone. Safe to execute immediately after M5.1-T12 lands.
- **ID allocation:** F74 (next after F73 used by M5.1-T12). Consistent with the dirty-ID-space convention documented in `milestone-05.1.md` and `genicui-planner-conventions-extended.md` memory.