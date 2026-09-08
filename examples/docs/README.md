# GenicUI Documentation Site

Public documentation for [GenicUI](https://github.com/your-org/genicui) — the generative agentic UI framework.

This is a [Docus 5.13.0](https://docus.dev/en) layer installed inside the GenicUI monorepo at `examples/docs/`.

## Status

**M5.1-T1 — Docus scaffold + workspace wiring.**

| AC | Description | Status |
| -- | ----------- | ------ |
| 1 | `examples/docs/` exists with `nuxt.config.ts`, `app/`, `content/`, `package.json` | ✅ |
| 2 | `nuxt.config.ts` has `extends: ['docus']` | ✅ |
| 3 | Root `package.json` workspaces include `examples/*` | ✅ |
| 4 | `bun install` exits 0 | ⏳ |
| 5 | `bun --filter docs dev` boots with title "GenicUI" | ⏳ |
| 6 | `bun --filter docs build` produces `index.html` | ⏳ |
| 7 | No Nuxt UI Pro license (Nuxt UI v4 MIT) | ✅ |

## Quick start

```bash
# from monorepo root
bun install
bun --filter docs dev          # http://localhost:3000
bun --filter docs build        # static .output/public/
```

## Structure

```
examples/docs/
├── app/
│   └── app.config.ts          # brand placeholder (M5.1-T1) → full theme (M5.1-T4)
├── content/                   # markdown pages authored in M5.1-T4 onward
│   └── index.md               # placeholder landing
├── nuxt.config.ts             # extends: ['docus']
└── package.json               # workspace member
```

## Tasks completed in this scaffold

- M5.1-T1 ✅ Scaffold + workspace wiring — landing renders, build works, MIT deps only.

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