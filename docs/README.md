# GenicUI Documentation Site

Public documentation for [GenicUI](https://github.com/your-org/genicui) — the generative agentic UI framework.

This is a [Docus 5.13.0](https://docus.dev/en) layer installed inside the GenicUI monorepo at `docs/`.

## Status

**M5.1-T12 — Vercel deploy wiring.** Repo-resident artifacts shipped; Vercel-side actions (link/deploy/DNS) require user.

| AC | Description | Status |
| -- | ----------- | ------ |
| 1 | `docs/vercel.json` committed with build + output config | ✅ |
| 2 | Vercel "Deployed on Vercel" badge in landing footer | ✅ |
| 3 | Root README `Deploy with Vercel` button | ✅ |
| 4 | `vercel-deploy.md` runbook (link, deploy, domain, rollback, smoke test) | ✅ |
| 5 | `vercel link` + GitHub integration | 🔵 manual — requires Vercel account |
| 6 | `vercel deploy --prod` exits 0 | 🔵 manual — requires Vercel auth |
| 7 | Custom domain `genicui.dev` DNS | 🔵 manual — requires DNS access |
| 8 | 10-point integration smoke test | 🟠 6/10 verified locally, 4/10 manual-verified |

The full T1 status table (Docus scaffold) is superseded by the milestone log below.

## Quick start

```bash
# from monorepo root
bun install
bun --filter docs dev          # http://localhost:3000
bun --filter docs build        # static .output/public/
```

## Structure

```
docs/
├── app/
│   └── app.config.ts          # brand placeholder (M5.1-T1) → full theme (M5.1-T4)
├── content/                   # markdown pages authored in M5.1-T4 onward
│   ├── .navigation.yml        # top-level (M5.1-T3)
│   ├── index.md               # placeholder landing (T4 fills)
│   ├── 1.getting-started/     # 3 pages + .navigation.yml
│   ├── 2.concepts/            # 7 pages + .navigation.yml
│   ├── 3.guides/              # 5 pages + .navigation.yml
│   ├── 4.api/                 # 6 pages + .navigation.yml
│   ├── 5.cookbook/            # 6 pages + .navigation.yml
│   ├── 6.deployment/          # 4 pages + .navigation.yml
│   ├── 7.resources/           # 3 pages + .navigation.yml
│   ├── 8.community/           # 3 pages + .navigation.yml
│   └── 9.migration/           # 1 page + .navigation.yml
├── nuxt.config.ts             # extends: ['docus']
└── package.json               # workspace member
```

## Tasks completed in this scaffold

- M5.1-T1 ✅ Scaffold + workspace wiring — landing renders, build works, MIT deps only.
- M5.1-T3 ✅ Information architecture — 9 section directories, 38 page skeletons (frontmatter + `::note` placeholder), 10 `.navigation.yml` files. Build passes, all 38 routes return 200. See `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/ia-tree.md`.
- M5.1-T11 ✅ Search + SEO + llms.txt — Docus auto-registers `nuxt-llms`, `@nuxtjs/robots`, `nuxt-og-image`. The single config block in `nuxt.config.ts` (`llms: { domain: 'https://genicui.dev', ... }` + `robots: { blockAiBots: true }` + `nitro.prerender.routes: ['/robots.txt', '/llms.txt', '/llms-full.txt']`) emits `/llms.txt` (7.6 KB), `/llms-full.txt` (283 KB), `/robots.txt` (1.2 KB, blocks 39 AI crawlers), `/sitemap.xml` (39 entries), and `/raw/<route>.md` (37 files). AC1–AC8 verified by curl against the local preview; AC9 (`Accept: text/markdown`) and AC10 (Lighthouse ≥ 90) deferred to T12 (Vercel deploy). **Key gotcha:** `nuxt-llms` silently no-ops without `llms.domain` set — without it, none of the four artifacts are emitted.
- M5.1-T12 🟠 Vercel deploy wiring — `docs/vercel.json` (build/output/headers, no rewrites), `docs/app/components/app/AppFooterLeft.vue` (Docus override with "Deployed on Vercel" badge), root `README.md` (Deploy button + Live Site shield), `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/vercel-deploy.md` (300+ line runbook covering link/deploy/domain/rollback/smoke test/troubleshooting). **Critical:** Docus's `vercel-markdown-rewrite` module (186 lines, hooks `nitro:init` on the Vercel preset only) auto-injects edge rewrites for `Accept: text/markdown` for every page — **do NOT add rewrites to `vercel.json`** (they would conflict). Build regression green (36 MB / 13 MB gzip). 6/10 smoke-test points verified locally; 4/10 manual-verified (live URL, Vercel GitHub integration, Lighthouse, custom-domain DNS).

## UAT findings (Playwright, 2026-09-08)

| Viewport | Mode | Result |
| -------- | ---- | ------ |
| 1440×900 desktop | light | ✅ Renders, H1 + callout + table visible, 78ms load |
| 1440×900 desktop | dark | ✅ Renders, dark theme via `<html class="dark">`, 0 console errors |
| 768×1024 tablet | dark | ✅ Header collapses, table scrolls horizontally inside Docus's default Prose wrapper (`overflow-x-auto`) |
| 375×812 mobile | light + dark | ✅ Page does not horizontally scroll (`scrollWidth == clientWidth`), table reflows into scrollable wrapper |
| Search modal (cmd-k) | both | ✅ Opens as `dialog`, has `textbox`, `listbox`, `option` roles; theme picker (System/Light/Dark) accessible |

**Discovered:** Search modal heading and description render the literal i18n keys `contentSearch.title` / `contentSearch.description` instead of translated strings. Likely a Docus 5.13.0 default i18n fallback bug. Not blocking T1 (placeholder landing) but worth filing before T11 (llms.txt) where search quality matters.

## Patterns documented

- **Docus Prose default** wraps every markdown table in `<div class="relative my-5 overflow-x-auto rounded-md outline-primary/25 focus-visible:outline-3">` — no custom CSS needed for responsive tables.
- **bun --filter docs** does NOT work; must use full name: `bun --filter genicui-docs`.
- **Docus 5.13.0** bundles `nuxt-og-image` and `nuxt-seo` automatically — frontmatter `title` + `description` populate `<meta>` and OG image without explicit config.

## Next tasks

- M5.1-T2 — Corpus reconciliation (git mv legacy docs/ → .vaahagents/requirements/)
- M5.1-T3 — Information architecture + `.navigation.yml`
- M5.1-T4 — Real landing page (hero, feature grid, install snippet)
- M5.1-T5–T12 — Content sections + Vercel deploy

See `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/` for the full plan.