# Task M5.1-T5 — Getting Started (3 pages)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71b (new — Getting Started section)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Author the three Getting Started pages — Introduction, Installation, Quickstart. These are the highest-traffic pages on any doc site and set the tone for new adopters. Each must be self-contained, copy-paste-runnable, and end with a "Next steps" link.

## Task Goals

- Author `content/1.getting-started/1.introduction.md` — what GenicUI is, who it's for, how it fits with AG-UI / MCP / CopilotKit
- Author `content/1.getting-started/2.installation.md` — `bun add @genicui/core @genicui/server` + Nuxt module install
- Author `content/1.getting-started/3.quickstart.md` — 5-minute end-to-end: register MCP server, call `render_component`, see table
- Each page ends with a "Next steps" link to the next page in the section
- Each page includes a working code block (verified against the actual `@genicui/core` / `@genicui/server` API surface)

## Implementation Plan

### Pre-Implementation Analysis

- Verify the package names + install commands against `packages/*/package.json`:
  - `@genicui/core` (versions match the root workspace)
  - `@genicui/server` (same)
  - `@genicui/client` (browser side)
  - `@genicui/vite-plugin` (build side)
  - `@genicui/agent-bridge` (LLM side)
  - `@genicul-primevue/registry` (the registry)
  - `nuxt-genicui` (Nuxt module — if shipped in M5.1, else link out)
- Verify the API surface for `createServer()` and the 4 MCP tools before writing the Quickstart code block (cite `packages/server/src/index.ts` and `packages/server/src/mcp/`)
- Confirm Bun 1.3.12 is the documented runtime; mention Node 20+ as fallback
- Choose the Quickstart's end-state: render a DataTable via `render_component` → click row → agent receives `row_selected` event (5-minute flow matches the existing W8 PoC smoke test)

### Steps

1. Author `content/1.getting-started/1.introduction.md`:
   - Frontmatter: title "Introduction", description "What is GenicUI and who is it for?", `navigation.icon: lucide-sparkles`
   - Hero: "GenicUI is an MCP-native, generative agentic UI framework rendered as Web Components."
   - Three "Why GenicUI?" subsections: MCP-native (vs. framework-only), Web Components (vs. iframe-only), JSON-Patch wire (vs. full re-render)
   - "How it fits" diagram (ASCII): Agent ↔ MCP tools ↔ GenicUI server ↔ WebSocket ↔ Browser
   - "Who it's for" list: Agent developers, Framework shim consumers, Registry authors, Operators
   - "Next steps" footer linking to `2.installation.md`
2. Author `content/1.getting-started/2.installation.md`:
   - Frontmatter: title "Installation", description "Install GenicUI in a new or existing project.", `navigation.icon: lucide-download`
   - Prerequisites section: Bun 1.3.12+ (preferred) or Node 20+
   - Project setup with `bun create nuxt@latest my-app`
   - Install command: `bun add @genicui/core @genicui/server @genicui/client`
   - Optional installs: `@genicui/vite-plugin`, `@genicui/agent-bridge`, `@genicul-primevue/registry`
   - `nuxt.config.ts` configuration snippet (registers the layer / module)
   - Verify install: `bun --filter my-app dev` → `http://localhost:3000` shows the GenicUI scaffold
   - "Next steps" footer linking to `3.quickstart.md`
3. Author `content/1.getting-started/3.quickstart.md`:
   - Frontmatter: title "Quickstart", description "Build your first GenicUI app in 5 minutes.", `navigation.icon: lucide-zap`
   - Step 1: Register an MCP server in Claude Code / Cursor / mcp-inspector (Streamable HTTP, `Authorization: Bearer gnc_live_<32>`)
   - Step 2: Connect a UI client (Nuxt app with `@genicui/client`)
   - Step 3: Agent calls `render_component({ name: "DataTable", props: { rows: [...] } })`
   - Step 4: DataTable renders in the browser
   - Step 5: User clicks a row → agent receives `{ action: "row_selected", detail: { rowId: "..." } }`
   - All 5 steps include copy-paste code blocks verified against the actual API surface
   - "Next steps" footer linking to `2.concepts/1.protocol.md`
4. Run `bun --filter docs build`; verify all three pages build with no broken links
5. Run the Quickstart end-to-end against a fresh `examples/quickstart/` sandbox; commit the sandbox as a reference for the next maintainer

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus MDC syntax for `:kbd`, `code-block`, `::steps`, `::tip` | All 3 pages |
| `filesystem` MCP | Read `packages/server/src/index.ts` to verify `createServer()` signature | Step 2 |
| `git` MCP | Run Quickstart end-to-end in `examples/quickstart/` | Step 5 |

## Acceptance Criteria

- AC1: All three pages render with correct titles, descriptions, icons, and Next-step links
- AC2: All install commands are copy-paste-runnable (verified in a fresh `examples/quickstart/` sandbox)
- AC3: Quickstart end-to-end flow completes in <5 minutes from `bun create nuxt@latest` to `render_component` returning a rendered table
- AC4: No code block contains `:TODO` or `// FIXME` markers — every snippet is production-ready
- AC5: Each page is under 600 lines (long pages scare away newcomers)
- AC6: Each page links to at least one Concepts page (set up the cross-section linking pattern)
- AC7: `bun --filter docs build` exits 0 with no broken links
- AC8: Lighthouse score ≥ 90 on each Getting Started page (matches the landing target)
- AC9: Pages render correctly in light + dark mode

## Completion Criteria

- [ ] All 9 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0 (no broken MDC, no broken links)
- [ ] `examples/quickstart/` sandbox is committed and reproducible
- [ ] Each page has a manual-review screenshot in `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/screenshots/` (light + dark)

## Testing Checklist

- [ ] Manual: read each page in `bun --filter docs dev`; verify flow reads naturally
- [ ] Smoke: run the Quickstart in a fresh sandbox; time it (<5min)
- [ ] Link-check: every internal `[[link]]` and `[text](path)` resolves
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page reports zero violations
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T5-01 | Author `1.introduction.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T5-02 | Author `2.installation.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T5-03 | Author `3.quickstart.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T5-04 | Run Quickstart end-to-end in fresh sandbox | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T5-05 | Lighthouse + screenshots per page | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA — section directory exists)
- **Soft dependency:** M5.1-T2 (for citing authoritative content from `.vaahagents/requirements/`), M5.1-T4 (landing links into Getting Started)
- **Soft dependency:** the 4 MCP tool handlers (F15–F18) and the PrimeVue registry (F40) must be stable — they're quoted in the Quickstart code
- **Blocks:** None directly. Getting Started is independent of Concepts / Guides / API Reference.

## Documentation References

- Docus MDC components: https://content.nuxt.com/usage/markdown
- Locked decisions: `.vaahagents/requirements/idea/consolidated-requirements.md` (post-T2)
- API surface: `packages/server/src/index.ts`, `packages/core/src/index.ts` (post-T2)
- 4 MCP tools: `.vaahagents/requirements/specs/features/feature-015-find-ui-component.md`, `feature-016-render-component.md`, `feature-017-update-component.md`, `feature-018-subscribe-to-events.md` (post-T2)
- Industry reference: Nuxt "Getting Started" pages https://nuxt.com/docs/getting-started

## Notes

- **Don't write more than 3 pages in this section.** Industry-standard doc sites cap Getting Started at 3 pages — anything else belongs in Concepts or Guides.
- **Use `code-block` not raw fenced blocks** so Docus applies syntax highlighting, copy buttons, and line numbers.
- **Every snippet must work.** Don't write pseudo-code in the Quickstart; copy from `examples/playground/` if it exists, or write the smallest working example.
- **The Quickstart's 5-minute promise is a hard SLA.** If the flow takes longer, surface to the user with the measured time before shipping.
- **Tone: friendly, direct, jargon-light.** This is the first contact with the framework — technical depth comes in Concepts.
