---
step: 7
title: Configure Components / SEO / llms
phase: Authoring
---

# Step 7: Configure Components / SEO / llms

**Only the steps relevant to your task:**

| Task | Do |
|---|---|
| T4 | Author `app/app.config.ts` with GenicUI brand tokens (color, font, radius). Author landing page. Update `.navigation.yml`. |
| T6, T7, T9 | Wire `docs/content.config.ts` collections if new collections added. Update `.navigation.yml` entries. |
| T8 | Author the auto-generated API pages from `packages/*/src/` exports. Configure `content.config.ts` to query `packages/*` via a custom data source. |
| T10 | Wire deployment-provider pages with external links. |
| T11 | Install + configure `nuxt-seo` module. Generate `llms.txt`, `llms-full.txt`, `/raw/*.md`. Verify sitemap. Configure OG image defaults. |
| T12 | Configure Vercel adapter, env vars, build command. (Most of T12 is outside the repo.) |

**Invoke `nuxt-seo` skill** before authoring T11 — module setup has changed substantially between versions.

**Invoke `nuxt-ui` skill** before authoring T4 — confirm the v4 color-token API (no `app.colors.json` — it's `app.config.ts` now).

**Gate:** IF adding new deps, confirm they go in `docs/package.json` only. Never touch `packages/*` or root `package.json` deps (workspaces entry is already in place from T1).

**Return:** a list of files modified + the nav tree state after edits.