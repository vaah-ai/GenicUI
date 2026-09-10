# Task M5.1-T6 — Concepts section (7 pages)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71c (new — Concepts section)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days

## Description

Author the seven Concepts pages that explain the technical model behind GenicUI. Concepts pages are reference material — readers arrive here after the Quickstart, looking up *how* a specific mechanism works, not *whether* to use it. Each page is a deep dive with diagrams (ASCII fenced blocks), sequence flows, and code excerpts.

## Task Goals

- Author `content/2.concepts/1.protocol.md` — AG-UI 14-event taxonomy + JSON-RPC framing
- Author `content/2.concepts/2.frames.md` — channel multiplexing, sequence ordering, idempotency keys
- Author `content/2.concepts/3.mcp-tools.md` — 4 public tools deep-dive with examples
- Author `content/2.concepts/4.components.md` — Web Component lifecycle, Shadow DOM, attribute observation
- Author `content/2.concepts/5.events.md` — user-action → COMPONENT_EVENT → agent receipt, including `composed: true`
- Author `content/2.concepts/6.trust-boundary.md` — stripProtoKeys, `additionalProperties: false`, three trust zones
- Author `content/2.concepts/7.registries.md` — defineRegistry contract, trust tiers, install flow
- Each page cross-links to at least one other Concepts page and at least one Guides page
- Each page has at least one ASCII sequence diagram or flow chart

## Implementation Plan

### Pre-Implementation Analysis

- Audit `.vaahagents/requirements/specs/architecture.md` for the 4-phase lifecycle: Discovery → Render → Update → Interact — every Concepts page should fit into one of these phases
- Audit `.vaahagents/requirements/specs/features.md` for the canonical 14 AG-UI events; do not invent new ones
- Audit `.vaahagents/requirements/specs/security.md` for the three trust zones (Agent → Server, Server → Client, Registry → Server); Concepts > Trust Boundary must quote these exactly
- Cross-reference the existing per-feature spec files (`.vaahagents/requirements/specs/features/feature-NNN-*.md`) for each Concept page's source material
- Decide the ASCII diagram convention: every diagram uses fenced ` ```text ` blocks (not mermaid — confirmed in the corpus inventory that 0 mermaid blocks exist)

### Steps

1. Author `content/2.concepts/1.protocol.md`:
   - Frontmatter: title "Protocol", description "How GenicUI frames events on the wire.", `navigation.icon: lucide-git-branch`
   - AG-UI 14-event taxonomy table: name, payload shape, when emitted (cite per-event spec from `.vaahagents/requirements/specs/features/`)
   - JSON-RPC framing envelope: `{ jsonrpc: "2.0", method, params, id }` for outbound; `{ result }` / `{ error: { code, message, data } }` for inbound
   - Wire sequence diagram (ASCII): Agent → render_component → server → COMPONENT_MOUNTED → client
   - "Next" link → `2.frames.md`
2. Author `content/2.concepts/2.frames.md`:
   - Frontmatter: title "Frames", description "Channel multiplexing and sequence ordering.", `navigation.icon: lucide-layers`
   - Channel model: 256 channels per socket, each with its own monotonic seq counter (uint64)
   - Reserved channels (`AG_UI_EVENT_TYPES` from `packages/core/src/index.ts`)
   - Frame envelope schema (`FrameEnvelopeSchema` from `packages/core/src/index.ts`)
   - Idempotency keys: how `update_component` deduplicates retries
   - "Next" link → `3.mcp-tools.md`
3. Author `content/2.concepts/3.mcp-tools.md`:
   - Frontmatter: title "MCP Tools", description "The 4 public tools exposed by GenicUI.", `navigation.icon: lucide-wrench`
   - One subsection per tool: `find_ui_component` (F15), `render_component` (F16), `update_component` (F17), `subscribe_to_events` (F18)
   - Each subsection: input schema (TypeBox), output schema, example request, example response, common errors (cite JSON-RPC error codes -32001..-32010 from `.vaahagents/requirements/specs/`)
   - "Next" link → `4.components.md`
4. Author `content/2.concepts/4.components.md`:
   - Frontmatter: title "Components", description "Web Component lifecycle and Shadow DOM.", `navigation.icon: lucide-box`
   - Web Component lifecycle: `constructor` → `connectedCallback` → `attributeChangedCallback` → `disconnectedCallback`
   - Closed Shadow DOM (the `attachShadow({ mode: 'closed' })` decision from `consolidated-requirements.md` §B)
   - Observed attributes: how `prop → attribute` mapping works for GenicElements
   - Runtime engine: `createRuntime` from `packages/client/src/index.ts`
   - "Next" link → `5.events.md`
5. Author `content/2.concepts/5.events.md`:
   - Frontmatter: title "Events", description "How user actions become agent events.", `navigation.icon: lucide-radio`
   - The `composed: true` decision — why events must cross the Shadow DOM boundary
   - Event flow: `click` → CustomEvent(`row_selected`) → server WS frame → MCP client
   - COMPONENT_EVENT payload schema (cite `.vaahagents/requirements/specs/features/feature-019-event-capture.md`)
   - Error handling: malformed event → -32004 + log scrub
   - "Next" link → `6.trust-boundary.md`
6. Author `content/2.concepts/6.trust-boundary.md`:
   - Frontmatter: title "Trust Boundary", description "Three zones, one rule: prototype keys never reach `Value.Check()`.", `navigation.icon: lucide-shield`
   - Three trust zones (Agent → Server, Server → Client, Registry → Server) with diagrams
   - `stripProtoKeys` algorithm (cite `.vaahagents/requirements/specs/security.md`)
   - `additionalProperties: false` enforcement (cite `.vaahagents/requirements/specs/manifest.json` invariants)
   - Penetration test results: `__proto__` injection blocked, schema bypass blocked, key brute force rate-limited
   - "Next" link → `7.registries.md`
7. Author `content/2.concepts/7.registries.md`:
   - Frontmatter: title "Registries", description "How component libraries plug into GenicUI.", `navigation.icon: lucide-package`
   - `defineRegistry()` + `defineComponent()` type contracts (cite F37, F38)
   - Trust tiers: project → user → remote resolution order
   - Install flow: `bun add @genicul-<library>/registry` → `loadRegistry()` → registry.json schema-validated
   - PassThrough API (PrimeVue 4) integration pattern
   - "Next" link → `3.guides/4.custom-registry.md`
8. Run `bun --filter docs build`; verify all 7 pages build with no broken links
9. Visual review pass; verify each page is under 800 lines and has at least one ASCII diagram
10. Link-checker pass; verify every `[[link]]` from Concepts resolves

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus MDC `code-group`, `::accordion`, `::callout` syntax | Steps 1–7 |
| `filesystem` MCP | Read per-feature spec files to cite exactly | All steps |
| `websearch` | Reference AG-UI 14-event list from `.vaahagents/requirements/specs/` | Step 1 |

## Acceptance Criteria

- AC1: All 7 pages render with correct titles, descriptions, icons, and Next links
- AC2: Each page contains at least one ASCII sequence diagram or flow chart in a `text` fenced block
- AC3: Each page is under 800 lines (long Concepts pages are anti-pattern)
- AC4: All 14 AG-UI events are listed in `1.protocol.md` with their payload shapes
- AC5: All 4 MCP tools are documented in `3.mcp-tools.md` with input/output schema and example request/response
- AC6: `6.trust-boundary.md` cites `stripProtoKeys`, `additionalProperties: false`, and lists the three trust zones
- AC7: `7.registries.md` documents the project → user → remote resolution order
- AC8: Every page links to at least one other Concepts page AND at least one Guides page (cross-section)
- AC9: `bun --filter docs build` exits 0 with no broken links
- AC10: Lighthouse score ≥ 90 per page
- AC11: Pages render correctly in light + dark mode

## Completion Criteria

- [ ] All 11 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0
- [ ] Each page has a manual-review screenshot in `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/screenshots/` (light + dark)
- [ ] Each page has a code-example excerpt verified against the actual package source

## Testing Checklist

- [ ] Manual: read each page in `bun --filter docs dev`; verify depth + clarity
- [ ] Link-check: every internal `[[link]]` and `[text](path)` resolves
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page
- [ ] Visual: ASCII diagrams render correctly (no broken Unicode)
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A — these docs DESCRIBE the trust boundary, they don't implement or modify it)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T6-01 | Author `1.protocol.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-02 | Author `2.frames.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-03 | Author `3.mcp-tools.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-04 | Author `4.components.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-05 | Author `5.events.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-06 | Author `6.trust-boundary.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-07 | Author `7.registries.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T6-08 | Build + link-check + Lighthouse pass | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA), M5.1-T5 (Getting Started links into Concepts)
- **Soft dependency:** M5.1-T2 (cites `.vaahagents/requirements/specs/`), M5.1-T4 (landing pages link into Concepts)
- **Soft dependency:** all package code (F1–F47) must be stable — Concepts cites the actual API surface, not aspirational designs
- **Blocks:** M5.1-T7 (Guides page cross-links to Concepts), M5.1-T9 (Cookbook recipes assume Concepts knowledge), M5.1-T11 (search indexes Concepts)

## Documentation References

- AG-UI protocol: https://ag-ui.com (canonical event list)
- Per-feature specs: `.vaahagents/requirements/specs/features/feature-NNN-*.md` (post-T2)
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` (post-T2)
- Architecture: `.vaahagents/requirements/specs/architecture.md` (post-T2)
- Security: `.vaahagents/requirements/specs/security.md` (post-T2)
- Industry reference: Vue.js "Reactivity in Depth" https://vuejs.org/guide/extras/reactivity-in-depth.html (anatomy of a good deep-dive)

## Notes

- **Concepts pages are reference material, not tutorials.** Don't pad with "let's try it" exercises; link to Guides for that.
- **Cite the source file path** when quoting a TypeScript signature or JSON schema. Example: "Source: `packages/core/src/sequence.ts:42`". This makes Concepts verifiably accurate.
- **Diagrams must be ASCII.** The corpus inventory confirmed 0 mermaid blocks; use `text` fenced blocks with box-drawing characters.
- **Don't duplicate the API Reference.** Concepts explains the *why* and the *mechanism*; API Reference (T8) lists the *signatures*. Cross-link, don't copy.
- **Tone: precise, evidence-based, neutral.** Concepts pages are read by skeptical senior engineers; design-fluff undermines credibility.
