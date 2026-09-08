---
title: Authoring Principles
---

# Documentation Authoring Principles

These are the non-negotiable rules. Match the quality bar of Nuxt, Laravel, and AdonisJS docs.

## Voice & Structure

1. **Imperative voice** in procedural steps ("Run `bun install`", not "You can run `bun install`").
2. **Active voice** in prose ("Docus bundles Nuxt Content v3", not "Nuxt Content v3 is bundled").
3. **One idea per paragraph** — split when paragraphs exceed 5 lines.
4. **Code blocks before prose explanations** for command/API examples.
5. **Every page answers three questions in the first screen:** What is it? Why use it? How do I start?

## Frontmatter (required on every page)

```yaml
---
title: Page Title                 # shown in nav + browser tab
description: One-line summary     # shown in <meta> + OG card
navigation:                      # optional — explicit IA placement
  title: Short Nav Label
  icon: i-lucide-book-open
---
```

## MDC Components — Prefer Built-ins

Use Docus/Nuxt Content MDC before reaching for raw HTML:

- `::callout{type="info|warning|success|error"}` for asides
- `::code-group` for multi-language snippets
- `::card-grid` for feature/index grids
- `::tabs` for OS/install-variant variants
- `::steps` for ordered procedures

## API Reference Conventions

- **Order:** signature → params (table) → return → example → errors.
- **Every public export gets a page.** No exceptions.
- **Cross-link** every type, every error code, every related tool.
- **Verbatim from `packages/*/src/`** — quote TypeScript signatures exactly; never paraphrase.

## Accessibility

- All images have `alt` text.
- All headings form a clean outline (no skipped levels).
- All tables have header rows.
- Color is never the only signal — pair with icon or text.

## SEO & LLM

- `description` is present on every page (≤ 160 chars).
- Each page is reachable via `/raw/*.md` and `Accept: text/markdown`.
- `llms.txt` lists every section; `llms-full.txt` includes full content.