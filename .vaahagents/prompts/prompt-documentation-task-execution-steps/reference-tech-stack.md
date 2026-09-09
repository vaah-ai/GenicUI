---
title: Tech Stack
---

# Tech Stack — Documentation Site

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Docus 5.13.0** | Nuxt 4 layer, MIT, installed via `bunx create-docus` |
| UI | **Nuxt UI v4** | MIT (no `@nuxt/ui-pro` ever) |
| Content | **Nuxt Content v3** | Bundled by Docus — use `queryCollection()`, never legacy `queryContent()` |
| Styling | **Tailwind CSS** | Bundled with Nuxt UI |
| SEO | **nuxt-seo module** | Sitemap, OG, `llms.txt`, `/raw/*.md` |
| Deploy | **Vercel** | Preview per PR; prod on merge to `main` |
| Runtime | **Bun 1.3.12** | Match rest of repo |

**Constraints:**
- Never add `@nuxt/ui-pro` — verify `bun pm ls` shows none.
- Never downgrade Nuxt Content to satisfy Nuxt UI — pick latest NC v3 Docus bundles.
- Never import from `poc/`.
- Never add deps to `packages/*` — docs-only deps go in `docs/package.json`.