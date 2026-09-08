# Task M5.1-T7 — Guides section (5 pages)

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71d (new — Guides section)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2 days

## Description

Author the five Guides pages — task-oriented, "how to accomplish X" walkthroughs. Guides are different from Concepts: Concepts explain mechanisms ("here's how channels work"), Guides accomplish goals ("here's how to add a custom registry"). Each Guide is end-to-end runnable and ends with a verifiable outcome.

## Task Goals

- Author `content/3.guides/1.development.md` — local setup, bun dev, playground app, hot reload
- Author `content/3.guides/2.production.md` — checklist, env vars, secrets, observability
- Author `content/3.guides/3.testing.md` — unit + property + integration + e2e + conformance
- Author `content/3.guides/4.custom-registry.md` — build a `@genicul-yourlib/registry` end-to-end
- Author `content/3.guides/5.migration.md` — coming from MCP Apps / OpenAI Apps SDK / CopilotKit
- Each Guide ends with a "Verification" section stating the observable outcome
- Each Guide cross-links to at least 2 Concepts pages and 1 Cookbook recipe

## Implementation Plan

### Pre-Implementation Analysis

- Audit the existing `examples/playground/` app — Guides > Development should reference it as the canonical local-setup artifact
- Audit `.vaahagents/requirements/specs/testing-strategy.md` for the test pyramid (150 unit / 20 integration / 3–5 e2e; 80% core, 90% tool handlers, 60% registry adapters) — Guides > Testing cites these numbers exactly
- For Guides > Custom Registry, reference the existing `@genicul-primevue/registry` as the canonical implementation pattern
- For Guides > Migration, document the three inbound paths: OpenAI Apps SDK (most common), MCP Apps (MCP-native but limited UI), CopilotKit (AG-UI-native but uses React)
- Verify package names + versions against root `package.json`

### Steps

1. Author `content/3.guides/1.development.md`:
   - Frontmatter: title "Development Setup", description "Set up a local GenicUI development environment.", `navigation.icon: lucide-terminal`
   - Prerequisites: Bun 1.3.12+, Git, an MCP-capable client (Claude Code, Cursor, or mcp-inspector)
   - Clone + install: `git clone ... && bun install`
   - Start the playground: `bun --filter playground dev` (the existing `examples/playground/` app — already shipped in M5-T4)
   - Connect an MCP client to `http://localhost:3040/mcp` with `Authorization: Bearer gnc_live_<32>`
   - Hot reload: edit `packages/server/src/...` → Bun's `--hot` flag restarts → WS clients reconnect
   - **Verification**: `curl http://localhost:3040/health` returns `{"status":"ok"}`, MCP client shows 4 tools
   - "Next" link → `2.production.md`
2. Author `content/3.guides/2.production.md`:
   - Frontmatter: title "Production Checklist", description "Ship GenicUI to production.", `navigation.icon: lucide-rocket`
   - Pre-deploy checklist (from `.vaahagents/requirements/specs/deployment.md` 10-item list):
     - [ ] API keys rotated from dev (`gnc_test_*`) to prod (`gnc_live_*`)
     - [ ] CORS allowlist configured
     - [ ] WS origin validation enabled
     - [ ] Trust-boundary `stripProtoKeys` verified
     - [ ] Observability: structured logs, metrics, traces
     - [ ] Secrets in env vars (not `.env`)
     - [ ] Health-check endpoint exposed
     - [ ] DO SQLite backup or Postgres configured
     - [ ] TLS termination at edge
     - [ ] Rate limiting per API key (post-MVP)
   - Env var reference (cite `packages/server/src/config.ts` if exists)
   - Observability: structured logs to stdout (12-factor), `/metrics` for Prometheus (optional)
   - **Verification**: deploy checklist all-green; production smoke test (render + click + event) succeeds
   - "Next" link → `3.testing.md`
3. Author `content/3.guides/3.testing.md`:
   - Frontmatter: title "Testing", description "Test pyramid for GenicUI.", `navigation.icon: lucide-flask-conical`
   - Test pyramid (cite `.vaahagents/requirements/specs/testing-strategy.md`):
     - 150 unit tests → `bun test packages/*/src`
     - 20 integration tests → in-process WS round-trip
     - 3–5 e2e tests → Playwright in `examples/playground/`
     - Property tests → fast-check 10K runs for F3, F4, F2, F14, F21
     - Conformance suite → `@genicui/conformance` (post-MVP, F39)
   - Coverage targets: 80% core, 90% tool handlers, 60% registry adapters
   - Per-tool test patterns with code excerpts from `packages/server/src/mcp/__tests__/`
   - **Verification**: `bun test` exits 0 with coverage report showing target percentages met
   - "Next" link → `4.custom-registry.md`
4. Author `content/3.guides/4.custom-registry.md`:
   - Frontmatter: title "Building a Custom Registry", description "Create a `@genicul-<yourlib>/registry` package.", `navigation.icon: lucide-package-plus`
   - Why build a registry (typing safety, PassThrough integration, trust metadata)
   - The 5-step process:
     1. Scaffold: `bun init @genicul-mylib/registry`
     2. Implement `defineRegistry()` with `defineComponent()` for each component
     3. Declare trust tier (project / user / remote) in `registry.json`
     4. Add schema validation (`additionalProperties: false` on every props object)
     5. Test with `@genicui/conformance` (post-MVP)
   - Code walkthrough using `@genicul-primevue/registry` as the reference implementation (cite `registries/primevue/`)
   - Publishing: `bun publish` to npm with the `@genicul-` scope
   - **Verification**: install the registry into `examples/playground/`, mount a component via `render_component`, click an event, receive the agent-side event
   - "Next" link → `5.migration.md`
5. Author `content/3.guides/5.migration.md`:
   - Frontmatter: title "Migrating to GenicUI", description "Coming from MCP Apps, OpenAI Apps SDK, or CopilotKit.", `navigation.icon: lucide-arrow-right`
   - Three inbound paths, each with a diff-style comparison:
     - **From MCP Apps**: replace `resources/list` + `resources/read` with `find_ui_component` + `render_component`; same transport (Streamable HTTP), same auth (Bearer)
     - **From OpenAI Apps SDK**: wrap `_meta['openai/outputTemplate']` (post-MVP F22) into a GenicUI registry; same `_meta` envelope still works for OpenAI consumers
     - **From CopilotKit**: replace AG-UI event emitters (already compatible) and React custom renderers with GenicElement + closed Shadow DOM; the wire protocol is AG-UI native, so the agent-side stays unchanged
   - Decision matrix: when to migrate (need Web Components / JSON-Patch / trust tiers), when not to (one-off UI, no MCP server yet)
   - **Verification**: each migration path ends with a working `examples/migration-from-<source>/` reference app
   - "Next" link → `5.cookbook/1.auth-cookbook.md` (the first recipe that builds on this guide)
6. Run `bun --filter docs build`; verify all 5 pages build with no broken links
7. Link-checker pass; verify every cross-link to Concepts / Cookbook resolves

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus MDC `::steps`, `::check`, `code-block` syntax | All 5 pages |
| `filesystem` MCP | Read `examples/playground/`, `registries/primevue/`, `.vaahagents/requirements/specs/` | Steps 1, 4, 5 |
| `websearch` | OpenAI Apps SDK + CopilotKit docs for the migration comparison | Step 5 |

## Acceptance Criteria

- AC1: All 5 pages render with correct titles, descriptions, icons, and "Verification" sections
- AC2: Each "Verification" section states an observable outcome (curl command, test result, screenshot diff)
- AC3: Guides > Development works end-to-end in a fresh clone (verified by running the steps)
- AC4: Guides > Production Checklist matches the 10-item list in `.vaahagents/requirements/specs/deployment.md`
- AC5: Guides > Testing cites the test pyramid numbers (150/20/3-5) and coverage targets (80/90/60)
- AC6: Guides > Custom Registry ends with a working `@genicul-mylib/registry` example
- AC7: Guides > Migration covers all three inbound paths (MCP Apps, OpenAI Apps SDK, CopilotKit)
- AC8: Each page is under 1000 lines (Guides can be longer than Concepts)
- AC9: Each page links to at least 2 Concepts pages and 1 Cookbook recipe
- AC10: `bun --filter docs build` exits 0 with no broken links
- AC11: Lighthouse score ≥ 90 per page
- AC12: Pages render correctly in light + dark mode

## Completion Criteria

- [ ] All 12 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs lint` exits 0
- [ ] `examples/migration-from-{openai,copilotkit,mcp-apps}/` reference apps exist
- [ ] Each page has a manual-review screenshot

## Testing Checklist

- [ ] Manual: read each page in `bun --filter docs dev`; verify steps are runnable
- [ ] Smoke: Guides > Development runs end-to-end in a fresh clone
- [ ] Smoke: Guides > Custom Registry ends with a working example
- [ ] Link-check: every internal `[[link]]` and `[text](path)` resolves
- [ ] Visual: Lighthouse score per page
- [ ] Accessibility: axe-core scan per page
- [ ] No property tests (N/A — content)
- [ ] No trust-boundary touch (N/A — these docs describe ops, not security implementation)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T7-01 | Author `1.development.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T7-02 | Author `2.production.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T7-03 | Author `3.testing.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T7-04 | Author `4.custom-registry.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T7-05 | Author `5.migration.md` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T7-06 | Build + link-check + Lighthouse pass | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA), M5.1-T6 (Concepts pages exist for cross-linking)
- **Soft dependency:** M5.1-T2 (cites `.vaahagents/requirements/specs/`), M5.1-T4 (landing → Getting Started → Guides path), M5.1-T5 (Getting Started links into Guides)
- **Soft dependency:** `examples/playground/` exists (M5-T4 already shipped it), `@genicul-primevue/registry` exists (M5-T3 shipped it)
- **Blocks:** M5.1-T9 (Cookbook recipes cross-link to Guides), M5.1-T10 (Deployment section cross-links to Guides > Production)

## Documentation References

- Playground reference: `examples/playground/` (M5-T4)
- PrimeVue registry reference: `registries/primevue/` (M5-T3)
- Production checklist: `.vaahagents/requirements/specs/deployment.md` (post-T2)
- Test pyramid: `.vaahagents/requirements/specs/testing-strategy.md` (post-T2)
- Industry reference: Laravel "Installation" https://laravel.com/docs/installation (anatomy of a good production checklist)

## Notes

- **Guides are runnable.** Every step must work when copy-pasted into a terminal. If a step is aspirational, link out to where it is implemented.
- **"Verification" sections are non-negotiable.** Without them, Guides become tutorials that can silently break.
- **Don't write Guides that overlap with the API Reference.** If you're documenting a method signature, that's T8's job — link out.
- **Migration is the highest-value Guide.** It's the page that converts evaluators into adopters. Spend extra care here.
- **Custom Registry Guide is the second-highest value.** It directly enables the registry ecosystem — the framework's moat.
