# Task M5.1-T3 — Information architecture + `.navigation.yml`

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F69b (new — information architecture)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Design and lay down the 10-section information architecture (IA) for the GenicUI documentation site, create the numeric-prefix folder scheme, and emit per-directory `.navigation.yml` files that drive Docus's left-rail navigation. Every page gets an empty MDC skeleton (frontmatter + title + a `::note` placeholder) so subsequent authoring tasks (T4–T10) can fill prose without touching navigation.

This is the structural backbone of the site — done well, T4–T10 become incremental prose fills; done poorly, the site collapses into an unscannable wall of links.

## Task Goals

- Define a 10-section IA mirroring industry-standard doc sites (Nuxt, Laravel, AdonisJS)
- Create `content/` tree with numeric-prefix folder + file naming (`1.getting-started/1.introduction.md` → `/getting-started/introduction`)
- Author one `.navigation.yml` per directory declaring order, title, and `icon` for each entry
- Author ~30–50 MDC skeletons (frontmatter + title + one `::note` placeholder) so the IA is browsable end-to-end before prose lands
- Verify `bun --filter docs dev` renders the full left rail with all sections reachable

## Implementation Plan

### Pre-Implementation Analysis

- Confirm Docus's `.navigation.yml` schema (path, title, icon — NOT `_dir.yml` which is the deprecated v3 pattern)
- Cross-reference the 10 sections against `.vaahagents/requirements/specs/` to ensure every concept has a home:
  - **Landing** → `content/index.md` (filled in T4)
  - **Getting Started** (3 pages) — introduction / installation / quickstart
  - **Concepts** (7 pages) — protocol / frames / mcp-tools / components / events / trust-boundary / registries
  - **Guides** (5 pages) — development / production / testing / custom-registry / migration
  - **API Reference** (6 pages) — core / server / client / vite-plugin / agent-bridge / primevue-registry (filled in T8)
  - **Cookbook** (4–6 pages) — auth / retry / custom-event / multi-channel / registry-versioning / testing
  - **Deployment** (4 pages) — overview / cloudflare / bun-self-host / nitro (filled in T10)
  - **Resources** (3 pages) — faq / troubleshooting / community
  - **Community** (3 pages) — contributing / code-of-conduct / roadmap
  - **Migration** (1 page — pre-1.0 stub)
- Choose numeric prefixes carefully so future reordering doesn't reshuffle URLs (Nuxt convention: leave gaps, e.g. `10.legacy.md` for future expansion)

### Steps

1. Create `examples/docs/content/` directory tree:
   ```
   1.getting-started/
   2.concepts/
   3.guides/
   4.api/
   5.cookbook/
   6.deployment/
   7.resources/
   8.community/
   9.migration/
   ```
2. Create `examples/docs/content/index.md` (placeholder landing — T4 fills it)
3. For each section directory, create `1.first-page.md`, `2.second-page.md`, … with frontmatter:
   ```yaml
   ---
   title: <Title>
   description: <One-line summary for SEO>
   navigation:
     icon: <lucide-icon-name>
   ---
   ```
   and a body containing only `::note\nPlaceholder — content authored in M5.1-T<n>.\n::`
4. For each directory, create `.navigation.yml` declaring the order:
   ```yaml
   title: <Section Title>
   icon: <lucide-icon-name>
   children:
     - 1.first-page
     - 2.second-page
   ```
5. Author `examples/docs/content/.navigation.yml` for top-level order
6. Run `bun --filter docs dev` and walk every left-rail entry; verify all ~30–50 pages render with placeholder content
7. Run `bun --filter docs build`; verify the static output contains a route for every page
8. Document the IA in `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/ia-tree.md` (project memory, not a published page)

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Verify Docus `.navigation.yml` schema (v5.13.0) | Step 1 |
| `lucide` icons | Search for `lucide-<name>` icons per section | Step 3 |
| `sequential-thinking` skill | Multi-step IA proof (every `.vaahagents/requirements` concept must have a home) | Pre-Implementation Analysis |

## Acceptance Criteria

- AC1: `examples/docs/content/` contains all 9 section directories + `index.md`
- AC2: Every section directory has a `.navigation.yml` with at least one child entry
- AC3: Every page file has valid frontmatter (`title`, `description`, `navigation.icon`)
- AC4: Every page body contains a `::note` placeholder (no empty pages)
- AC5: `bun --filter docs dev` boots; left rail shows all 9 sections in order; every section expands to show its children
- AC6: Every page route returns 200 in `bun --filter docs build` output (verify with a curl on the local server)
- AC7: No page has prose beyond the placeholder (prose is T4–T10's job — verifying this task did not creep)
- AC8: `examples/docs/content/.navigation.yml` is the only top-level `.navigation.yml`; per-section files are scoped to their directories
- AC9: Numeric prefixes are consistent within each section (no `1.foo.md` and `2.foo.md` swapped)
- AC10: IA tree document at `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/ia-tree.md` exists and lists every page

## Completion Criteria

- [ ] All 10 acceptance criteria above pass
- [ ] `bun run lint` exits 0
- [ ] `bun --filter docs build` succeeds
- [ ] Placeholder-only page bodies verified (no accidental prose)
- [ ] IA tree document committed alongside the task

## Testing Checklist

- [ ] Smoke: `bun --filter docs dev` boots, full IA browsable
- [ ] Smoke: `bun --filter docs build` exits 0
- [ ] Link-check: every internal link in the IA tree resolves (manual curl pass)
- [ ] No property tests (N/A — content structure)
- [ ] No trust-boundary touch (N/A — static structure)
- [ ] Visual: take a screenshot of the rendered left rail; store in `ia-tree.md` as a reference

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T3-01 | Design 10-section IA + numeric prefix scheme | ⚪ Not Started | ❌ No | Critical |
| M5.1-T3-02 | Create `content/` directory tree | ⚪ Not Started | ❌ No | Critical |
| M5.1-T3-03 | Author MDC skeletons for all 30–50 pages | ⚪ Not Started | ❌ No | Critical |
| M5.1-T3-04 | Author per-directory `.navigation.yml` files | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T3-05 | Verify full IA renders + builds | ⚪ Not Started | ✅ Yes | Critical |

## Dependencies

- **Requires:** M5.1-T1 (Docus scaffold must exist to write content into)
- **Soft dependency:** M5.1-T2 (the canonical requirements tree should be in place so IA references resolve — but T3 can author empty skeletons without this)
- **Blocks:** M5.1-T4 (Landing page authors into `content/index.md`), M5.1-T5–T10 (every page-section task authors into a T3-created skeleton), M5.1-T11 (search indexes content; needs IA in place)

## Documentation References

- Docus navigation docs: https://docus.dev/en/essentials/navigation
- Nuxt Content folder structure: https://content.nuxt.com/
- Lucide icon library: https://lucide.dev/icons (use names exactly, e.g. `lucide-rocket`)
- Industry reference IA: Nuxt docs https://nuxt.com/docs, Laravel docs https://laravel.com/docs, AdonisJS docs https://docs.adonisjs.com
- Authoritative concept list: `.vaahagents/requirements/specs/` (post-T2)

## Notes

- **Don't merge content with navigation.** Docus separates page content from `.navigation.yml` for a reason — keeping them apart means page renames don't require navigation changes.
- **Numeric prefixes with gaps.** If you might add a page later (say, between `1.introduction.md` and `2.installation.md`), use `5.advanced-installation.md` as the gap so URLs don't shift on insert.
- **Icons matter.** Every Nuxt, Laravel, AdonisJS doc site uses icons in the left rail. Pick them now (in this task) so the visual rhythm is consistent.
- **T4–T10 will fill prose.** This task's deliverable is structure, not content. Resist the urge to write guides here.
- **MDC skeletons must use the `:icon:` syntax correctly** if used (`::note{icon="lucide-info"}`); pick icon names that match the placeholders.
