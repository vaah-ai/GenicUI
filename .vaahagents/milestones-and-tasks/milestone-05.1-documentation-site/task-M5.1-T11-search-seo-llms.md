# Task M5.1-T11 — Search + SEO + llms.txt

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F72 (new — search + SEO + LLM ingestion)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description>

Configure the cross-cutting concerns that turn the doc site from a wall of links into a discoverable, ingestible, indexable artifact: full-text search (Fuse.js default, SQLite FTS5 optional), SEO meta tags + OG image, `llms.txt` + `llms-full.txt` + `/raw/*.md` automatic emission for LLM ingestion, sitemap, robots.txt, canonical URLs. These are all `app.config.ts` / module configuration changes — no new pages, just plumbing.

## Task Goals

- Enable Docus's bundled search (Fuse.js) and verify it indexes every page
- Configure `useSeoMeta` defaults: title template (`%s · GenicUI`), description, OG tags, Twitter card
- Set up `nuxt-llms` (bundled with Docus 5.13.0) to emit `llms.txt`, `llms-full.txt`, and `/raw/*.md`
- Generate `sitemap.xml` and `robots.txt`
- Verify `Accept: text/markdown` header returns raw markdown (Vercel-specific path rewrite)
- Verify all pages render correctly in light + dark mode and pass Lighthouse ≥ 90

## Implementation Plan

### Pre-Implementation Analysis

- Confirm Docus 5.13.0 bundles `nuxt-llms` (per the Docus research: yes — `llms.txt` is automatic)
- Decide on SQLite FTS5 search: Bun 1.3.12 supports `better-sqlite3` 12.x, but bun-workspace quirks may surface. **Default to Fuse.js** for v1; enable FTS5 in a post-launch iteration if search latency exceeds 200ms on cold cache
- Plan the `llms-full.txt` size budget: full corpus is 32,128 lines; the llms-full output will be 500KB–2MB. Verify Vercel serves that without CDN caching issues
- Verify `nuxt-og-image` is configured for the OG image (T4) — this task ensures it surfaces on every page

### Steps

1. Configure search in `docs/app/app.config.ts`:
   - `search: { provider: 'fuse', options: { keys: ['title', 'description', 'content'], threshold: 0.3 } }`
   - Verify the search box appears in the header
2. Configure SEO defaults in `docs/app/app.config.ts`:
   - `site: { name: 'GenicUI', url: 'https://genicui.dev' }`
   - `seo: { titleTemplate: '%s · GenicUI', description: 'MCP-native generative agentic UI framework.' }`
3. Verify `useSeoMeta` works on every page (`title`, `description`, `ogTitle`, `ogDescription`, `ogImage`, `twitterCard`)
4. Configure `nuxt-llms` (if not already bundled with Docus):
   - `llms: { full: { title: 'GenicUI — Full Documentation' } }`
   - Verify `/llms.txt` returns the section index
   - Verify `/llms-full.txt` returns the full corpus
5. Verify `/raw/<route>.md` works for every page (e.g., `/raw/docs/getting-started/introduction.md`)
6. Generate `sitemap.xml` via `@nuxtjs/sitemap`:
   - `sitemap: { source: 'dynamic', autoLastmod: true }`
   - Verify every page is included
7. Generate `robots.txt`:
   - Allow all, point sitemap
8. Add Vercel rewrite (in `vercel.json` at the project root, not just inside `docs/`):
   - `{ "source": "/(.*)", "headers": [{ "key": "Accept", "value": "text/markdown" }], "destination": "/raw/$1.md" }`
   - OR configure via Docus's built-in middleware (preferred; check Docus 5.13.0 docs)
9. Run `bun --filter docs build`; verify the static output contains:
   - `llms.txt`
   - `llms-full.txt`
   - `sitemap.xml`
   - `robots.txt`
   - `og-image.png` (or per-page OG images)
10. Spin up `bun --filter docs preview` (Vercel-like preview); curl each artifact and verify content
11. Lighthouse run on landing + 3 random pages; verify ≥ 90 in all 4 categories

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Docus 5.13.0 `nuxt-llms` configuration | Step 4 |
| `context7` MCP | `@nuxtjs/sitemap` configuration | Step 6 |
| `websearch` | Vercel `Accept: text/markdown` rewrite pattern | Step 8 |

## Acceptance Criteria

- AC1: Search box appears in the header; searching `render_component` returns the relevant Concepts + API Reference pages
- AC2: Search returns hits within 200ms for any term appearing on ≥ 3 pages
- AC3: `useSeoMeta` populates `<title>`, `<meta description>`, OG tags, Twitter card on every page
- AC4: `/llms.txt` returns 200 with non-empty body listing every section
- AC5: `/llms-full.txt` returns 200 with the full corpus concatenated
- AC6: `/raw/<route>.md` works for every page (returns the raw markdown, not HTML)
- AC7: `/sitemap.xml` returns 200 and lists every page
- AC8: `/robots.txt` returns 200 and points to the sitemap
- AC9: `curl -H "Accept: text/markdown" /docs/getting-started/introduction` returns raw markdown (Vercel-specific behavior)
- AC10: Lighthouse score ≥ 90 in Performance / Accessibility / SEO / Best Practices on every page

## Completion Criteria

- [ ] All 10 acceptance criteria above pass
- [ ] `bun --filter docs build` succeeds
- [ ] `bun --filter docs preview` serves all artifacts
- [ ] Lighthouse CI committed with JSON report
- [ ] No regressions in any existing page's Lighthouse score

## Testing Checklist

- [ ] Manual: search for `render_component`, `trust boundary`, `PrimeVue`, `AG-UI` — all return hits within 200ms
- [ ] Manual: open `/llms.txt` and `/llms-full.txt` in browser; verify content
- [ ] Manual: curl `/raw/docs/getting-started/introduction.md`; verify raw markdown
- [ ] Manual: curl `/sitemap.xml`; verify every page is listed
- [ ] Lighthouse CI: per-page score in all 4 categories
- [ ] Accessibility: axe-core scan per page
- [ ] No property tests (N/A — cross-cutting plumbing)
- [ ] No trust-boundary touch (N/A)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T11-01 | Configure Fuse.js search | ⚪ Not Started | ✅ Yes | High |
| M5.1-T11-02 | Configure SEO defaults + `useSeoMeta` | ⚪ Not Started | ✅ Yes | High |
| M5.1-T11-03 | Verify `nuxt-llms` emits `llms.txt` + `llms-full.txt` | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T11-04 | Generate `sitemap.xml` + `robots.txt` | ⚪ Not Started | ✅ Yes | High |
| M5.1-T11-05 | Configure `Accept: text/markdown` rewrite | ⚪ Not Started | ✅ Yes | High |
| M5.1-T11-06 | Lighthouse CI run | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA — search index depends on content structure), M5.1-T4 (landing OG image)
- **Soft dependency:** all content tasks T5–T10 (search index depends on prose existing)
- **Blocks:** M5.1-T12 (production deploy needs the SEO/search artifacts to be verifiable)

## Documentation References

- Docus search: https://docus.dev/en/essentials/search
- `nuxt-llms`: https://github.com/nuxt-content/nuxt-llms (or whatever name Docus bundles)
- `@nuxtjs/sitemap`: https://sitemap.nuxtjs.org/
- Vercel path rewrites: https://vercel.com/docs/edge-network/transformations/header-transformations
- Industry reference: Stripe's `llms.txt` (https://docs.stripe.com/llms.txt) — example of a clean LLM-ingestible docs site

## Notes

- **SQLite FTS5 is optional.** Bun workspace has had quirky native-module issues. Default to Fuse.js for v1; revisit if cold-start search latency exceeds 200ms.
- **`llms-full.txt` can be large.** Stripe's is 4MB+. Vercel's CDN handles this fine, but verify the build doesn't OOM.
- **The `Accept: text/markdown` header is the killer feature.** Validates the Vercel choice independently — it's the path by which LLM agents and `curl` users get raw markdown instead of HTML.
- **Sitemap accuracy matters for SEO.** Every page must be listed; verify with `grep -c "<url>" sitemap.xml` matching the IA tree count from T3.
- **OG image is generated per-page** by `nuxt-og-image`. Verify it shows the page title, not the landing title, on inner pages.
- **Lighthouse is a hard target.** 90+ in all 4 categories is achievable with Docus + Nuxt UI v4 + Vercel defaults; verify it stays that way on every release.
