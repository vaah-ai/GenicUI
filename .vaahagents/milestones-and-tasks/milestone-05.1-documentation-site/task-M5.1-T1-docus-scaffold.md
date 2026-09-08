# Task M5.1-T1 — Docus scaffold + workspace wiring

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F68 (new)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 0.5 day

## Description

Scaffold a Docus 5.13.0 layer inside the GenicUI monorepo at `examples/docs/`, wire it into the root `package.json` workspaces, and verify a blank landing page renders on `localhost:3000`. Docus is a Nuxt 4 layer (NOT a CLI-only tool and NOT v3) installed via `bunx create-docus`. Nuxt UI v4 (MIT, no Pro license needed) provides the component primitives.

## Task Goals

- Create `examples/docs/` containing a working Docus layer that extends from the upstream `docus` Nuxt 4 layer
- Add `examples/docs` to root `package.json` workspaces
- Configure Nuxt UI v4 with the GenicUI brand placeholder (full theming in T4)
- Verify `bun --filter docs dev` boots and serves a placeholder landing page
- Verify `bun --filter docs build` produces a static output in `.output/public/`

## Implementation Plan

### Pre-Implementation Analysis

- Re-confirm Docus 5.13.0 is current (`bunx create-docus` pulls latest; pin in `package.json`)
- Verify Nuxt 4 + Nuxt UI v4 compatibility (Nuxt UI v4 unified Pro into the free MIT package as of late 2025 — confirms no license fee)
- Decide workspace layout: `examples/docs/` (sibling to `examples/playground/`) preferred over top-level `docs/` because top-level `docs/` is the live requirements tree being migrated in T2
- Verify root `package.json` has `"workspaces": ["packages/*", "registries/*", "examples/*"]` (or add it — current workspace declaration may only cover `packages/*` and `registries/*`)

### Steps

1. From project root: `bunx create-docus examples/docs` — generates Docus scaffold
2. Inspect generated `nuxt.config.ts` — confirm `extends: ['docus']` is present
3. Update `package.json` workspaces to include `examples/*` (or extend if it already covers `packages/*` and `registries/*`)
4. Add `@nuxt/ui` v4 to `examples/docs/package.json` dependencies
5. Create `app/app.config.ts` with site name `"GenicUI"`, theme placeholder, brand color (placeholder — T4 fills in)
6. Replace the default landing with a placeholder (`title: GenicUI`, `subtitle: Documentation placeholder`, link to `/docs/getting-started/introduction` even though that route doesn't exist yet)
7. Run `bun install` from project root; verify `bun --filter docs dev` boots on `localhost:3000` and the landing renders
8. Run `bun --filter docs build`; verify `.output/public/` is created and contains `index.html`

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Fetch current Docus + Nuxt UI v4 docs | If scaffold commands or `app.config.ts` syntax differ from this plan |
| `websearch` | Verify Docus 5.13.0 is still current | Before pinning version |

## Acceptance Criteria

- AC1: `examples/docs/` exists, contains `nuxt.config.ts`, `app/`, `content/`, `package.json`
- AC2: `nuxt.config.ts` has `extends: ['docus']`
- AC3: Root `package.json` workspaces include `examples/*`
- AC4: `bun install` exits 0 from project root
- AC5: `bun --filter docs dev` boots and serves a landing page at `http://localhost:3000` with title "GenicUI"
- AC6: `bun --filter docs build` produces a static output containing `index.html`
- AC7: No Nuxt UI Pro license required (Nuxt UI v4 is MIT — verify `bun pm ls` shows no `@nuxt/ui-pro`)

## Completion Criteria

- [ ] All 7 acceptance criteria above pass
- [ ] `bun run lint` exits 0 (workspace-level)
- [ ] `bun --filter docs build` succeeds
- [ ] No new dependencies added to `packages/*` (this task is workspace-installation only)
- [ ] No edits to any file under `packages/*/src/`

## Testing Checklist

- [ ] Smoke: `bun --filter docs dev` boots and landing renders
- [ ] Smoke: `bun --filter docs build` exits 0
- [ ] No automated tests required (this task is infrastructure setup; content tests are per-page in T4–T11)
- [ ] No property tests (N/A — static config)
- [ ] No trust-boundary touch (no MCP/WS input)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T1-01 | Run `bunx create-docus examples/docs` and inspect scaffold | ⚪ Not Started | ❌ No | Critical |
| M5.1-T1-02 | Wire workspace + install Nuxt UI v4 | ⚪ Not Started | ❌ No | Critical |
| M5.1-T1-03 | Create `app.config.ts` with brand placeholders | ⚪ Not Started | ❌ No | Critical |
| M5.1-T1-04 | Replace default landing with placeholder | ⚪ Not Started | ❌ No | Critical |
| M5.1-T1-05 | Verify `dev` + `build` work end-to-end | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** None (zero-dependency foundation for the doc site)
- **Blocks:** M5.1-T2 (T2 reconciles the requirements tree, depends on the workspace member existing), M5.1-T3, M5.1-T4–T10 (all page authoring needs the scaffold), M5.1-T11, M5.1-T12 (deploy needs a buildable site)

## Documentation References

- Docus docs: https://docus.dev/en
- Docus GitHub: https://github.com/nuxt-content/docus
- Nuxt UI v4: https://ui.nuxt.com/
- Docus + Nuxt UI v4 reference app: search `nuxt-ui-pro-docus` template in Docus examples
- Project CLAUDE.md: `poc/` is PoC-only — never reference PoC patterns in this task
- Workspace conventions: root `package.json` and existing `examples/playground/` package layout

## Notes

- If `bunx create-docus` flags Bun vs npm/pnpm preferences, prefer Bun to match the rest of the repo (Bun 1.3.12 is the workspace runtime per existing `M2-T1`/`M2-T3` setup).
- Docus layers expect `extends: ['docus']` — do NOT add ad-hoc Nuxt modules that bypass Docus's content collection configuration.
- If Nuxt UI v4 conflicts with Nuxt Content v3, prefer the latest Nuxt Content v3 version that Docus 5.13.0 bundles; do not pin lower.
- This task produces zero prose content. Content authoring begins in T4.
