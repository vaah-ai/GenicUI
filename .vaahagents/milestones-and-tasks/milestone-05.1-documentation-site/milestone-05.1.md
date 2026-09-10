# Milestone M5.1 — Documentation Site

> **Roadmap phase:** Post-M5, parallel to M6 (Deployment)
> **Roadmap week:** W8–W9 (slip-acceptable; runs parallel to M6 W11–W12)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 14 days (2 weeks × single maintainer)
> **Dependencies:** None blocking. Soft read-only deps on M5 (registry content for the Guides page) and M6-T1/T2/T4 (deployment pages link out, don't duplicate).

## Objective

Ship a public, production-grade documentation site for GenicUI using [Docus 5.13.0](https://docus.dev/en) (a Nuxt 4 layer) on Vercel. The site must meet the same bar set by Nuxt, Laravel, and AdonisJS docs: structured information architecture, complete API reference for all 5 published packages + 1 registry, copy-paste-able cookbook recipes, SEO + `llms.txt` + `/raw/*.md` for LLM ingestion, dark mode, accessible, deployed behind a preview-per-PR workflow.

This is the first deliverable that makes GenicUI *adoptable* — every prior milestone built the framework in private; this one publishes it.

Corresponds to the user directive: *"create industry standards developers document like nuxt, laravel, adonisjs etc"*. Docus (Nuxt UI v4 MIT, no Pro license required) is the chosen toolchain.

## Success Criteria

- [ ] Production URL `https://genicui.dev/` (or chosen domain) renders the landing page with hero, feature grid, install snippet, and dark mode toggle
- [ ] All 12 sections of the IA tree are reachable from the top nav (Landing · Getting Started · Concepts · Guides · API Reference · Cookbook · Resources · Deployment · Community · Migration)
- [ ] API Reference documents every public export of the 5 packages + 1 registry, and the 4 MCP tool JSON-RPC schemas
- [ ] `llms.txt`, `llms-full.txt`, and `/raw/*.md` return valid output for every page (verified by build step)
- [ ] Search returns hits within 200ms for any term appearing on ≥3 pages (Fuse.js default)
- [ ] Vercel preview deploys fire on every PR; production deploys on merge to `main`
- [ ] Lighthouse score ≥ 90 in Performance / Accessibility / SEO / Best Practices on the landing page
- [ ] Custom 404 + 500 pages render with site chrome and a search box
- [ ] `Accept: text/markdown` header returns raw markdown (Vercel-specific path rewrite, validates the Vercel choice)
- [ ] Zero broken internal links on first production deploy (link-check passes)

## Tasks

| Task | Title | Maps to | Effort |
|---|---|---|---|
| M5.1-T1 | Docus scaffold + workspace wiring | F68 | 0.5 day |
| M5.1-T2 | Corpus reconciliation + cross-ref rewrite | F69a | 1 day |
| M5.1-T3 | Information architecture + `.navigation.yml` | F69b | 1 day |
| M5.1-T4 | Landing page + global layout | F71a | 1 day |
| M5.1-T5 | Getting Started (3 pages) | F71b | 1 day |
| M5.1-T6 | Concepts section (7 pages) | F71c | 2 days |
| M5.1-T7 | Guides section (5 pages) | F71d | 2 days |
| M5.1-T8 | API Reference (5 packages + 1 registry + MCP tools) | F70 | 2 days |
| M5.1-T9 | Cookbook (4–6 recipes) | F71e | 1 day |
| M5.1-T10 | Deployment section (4 landing pages) | F71f | 1 day |
| M5.1-T11 | Search + SEO + llms.txt | F72 | 1 day |
| M5.1-T12 | Vercel deploy + smoke test | F73 | 0.5 day |

**Total: 12 tasks, 14 days.**

## Dependencies

- **Blocks:** No downstream milestones. Doc site is terminal — it documents everything prior and consumes nothing.
- **Requires:** None blocking. Soft reads during authoring:
  - M5 (registry content for Guides > Custom Registry page)
  - M6-T1 (CF Workers deep-dive — Deployment section links out, doesn't duplicate)
  - M6-T2 (Bun self-host — same pattern)
  - M6-T4 (Nitro binding — same pattern)

## Smoke Test (Integration Gate)

The milestone is "done" when **all** of the following green:

1. `vercel deploy --prod` exits 0
2. `curl -I https://genicui.dev/docs/getting-started/introduction` returns 200
3. `curl https://genicui.dev/llms.txt` returns 200 with non-empty body listing every section
4. `curl https://genicui.dev/llms-full.txt` returns 200 with non-empty body
5. `curl -H "Accept: text/markdown" https://genicui.dev/docs/getting-started/introduction` returns the raw markdown (not HTML)
6. `curl https://genicui.dev/raw/docs/getting-started/introduction.md` returns 200
7. The site search box returns hits for: `"render_component"`, `"trust boundary"`, `"PrimeVue"`, `"AG-UI"`
8. Vercel preview URL for a test PR shows the same content + an injected `[PR #N]` banner
9. Lighthouse CI score ≥ 90 on all 4 categories for the landing page
10. `bunx link-check` (or equivalent) reports zero broken internal links

## Manifest Cross-References

- **Features:** F68, F69a, F69b, F70, F71a, F71b, F71c, F71d, F71e, F71f, F72, F73 (12 new IDs, F68–F76 conceptually — see Notes for ID allocation)
- **Quality attributes covered:**
  - **Usability** (primary — entire milestone's purpose)
  - **Maintainability** (IA + .navigation.yml keeps docs organized as the framework evolves)
  - **Compatibility** (works with MCP clients / LLM ingestion pipelines)
- **Pipeline handoff invariants honoured:**
  - SSG output, no runtime server dependency (docs are static)
  - Trust boundary N/A — no MCP/WS input, no registry input, pure static build
  - No new `additionalProperties: false` surface (content is human-authored markdown)
- **External integrations added:**
  - **Docus 5.13.0** (Nuxt 4 layer, MIT) — first workspace package outside `packages/*` and `registries/*`
  - **Vercel** — second hosting vendor after Cloudflare (which is M6-T1's runtime target)
  - **Nuxt UI v4** (MIT) — first time the doc site uses the unified Nuxt UI v4 (no Pro license needed)
- **Property tests:** **N/A** — first milestone where fast-check 10K runs genuinely do not apply (static content).

## Conventions Note

This milestone folder is deliberately named `milestone-05.1-documentation-site/` and uses `M5.1`, `M5.1-T1`…`M5.1-T12` rather than the planner's strict `M{n}` / `M{n}-T{n}` no-zero-pad convention. The deviation was authorized by the user to fit docs work into the post-M5 timeline without renumbering the existing M1–M6 milestones. This is recorded in the project-conventions memory entry as a permitted extension.

## Notes

- **Why 12 tasks and not 6:** Industry-standard doc sites (Nuxt, Laravel, AdonisJS) structure their repos around page-sections, not build phases. Each task is one PR-worthy workstream with its own reviewer, link-check, and screenshot gate. This matches the existing M5 task shape (7 tasks = 7 features, one per task).
- **Why parallel to M6, not after:** The doc site documents everything up to and including M5. Publishing a 5-of-6-milestone framework dramatically increases adoption velocity. M6 (deployment) ships later and the doc site's Deployment section links out, doesn't duplicate.
- **Manifest ID allocation:** Manifest tops out at F67 today; F41, F42, F43, F47 are double-booked (M5 row + post-MVP backlog row). Adding F68–F76 for this milestone is consistent with the existing dirty-ID-space convention. M5.1-T1 ↔ F68, M5.1-T2 ↔ F69a, M5.1-T3 ↔ F69b, M5.1-T4 ↔ F71a, M5.1-T5 ↔ F71b, M5.1-T6 ↔ F71c, M5.1-T7 ↔ F71d, M5.1-T8 ↔ F70, M5.1-T9 ↔ F71e, M5.1-T10 ↔ F71f, M5.1-T11 ↔ F72, M5.1-T12 ↔ F73.
- **Workspace topology:** Docus layer lives at top-level `docs/` (sibling to `examples/playground/`). Originally scaffolded under `examples/docs/` to avoid colliding with the live requirements tree at `docs/`; moved after T2 completed the migration to `.vaahagents/requirements/`. Bun filter name stays `genicui-docs` regardless of path.
- **No PoC code:** Per CLAUDE.md, `poc/` is proof-of-concept only and must never be promoted. All doc-site code is written fresh against Docus 5.13.0 + Nuxt UI v4.
