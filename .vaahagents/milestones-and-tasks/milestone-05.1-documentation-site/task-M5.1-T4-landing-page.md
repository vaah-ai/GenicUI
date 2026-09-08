# Task M5.1-T4 — Landing page + global layout

> **Milestone:** M5.1 (Documentation Site)
> **Manifest feature:** F71a (new — landing page)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 1 day

## Description

Author the public landing page (`content/index.md`) and configure the global layout (header, footer, dark-mode toggle, skip-link, OG image). The landing is the site's first impression and the canonical "what is GenicUI?" page; it must communicate the framework's value proposition in under 5 seconds and route visitors into Getting Started within one click.

## Task Goals

- Hero section: title, subtitle, install snippet (`bun add @genicui/core @genicui/server`), two CTAs (Get Started → `/getting-started/introduction`, View on GitHub → repo URL)
- Feature grid: 4 cards (MCP-native · Web Components · JSON-Patch wire · Registry-agnostic) with icons and one-line descriptions
- Code preview tabs (`code-group`) showing the same component in Vue / vanilla / framework-agnostic styles — flag the `examples-cartviewer.md` source from `.vaahagents/requirements/` as the basis
- Global layout: sticky header with logo + nav + dark-mode toggle, footer with version + community links + repo link
- Accessibility: skip-link to `#main`, semantic landmarks (`<header>`, `<main>`, `<footer>`), `aria-current="page"` on active nav, focus-visible styles
- Open Graph image generation (Docus + Nuxt OG Image — `nuxt-og-image` module if not bundled)

## Implementation Plan

### Pre-Implementation Analysis

- Decide on a brand palette (placeholder hex values that T4 picks; T4 also chooses the logo and wordmark treatment):
  - primary: `#3B82F6` (blue)
  - secondary: `#8B5CF6` (purple)
  - accent: `#10B981` (emerald)
  - final values committed in T4
- Pick a code preview for the `code-group` block — `examples-cartviewer.md` (same component in Vue / vanilla / framework-agnostic) is the standout candidate from the corpus inventory
- Confirm Nuxt UI v4 component primitives (`UPage`, `UPageHero`, `UPageGrid`, `UPageCard`, `UColorModeButton`, `UDocsNavbar`) work with Docus's content collection
- Plan the skip-link behavior: visual-on-focus only, jumps to `#main` content area

### Steps

1. Author `examples/docs/content/index.md` (the landing page):
   - `::u-page-hero` with title, subtitle, install snippet (highlighted with `code-block`), two CTA buttons
   - `::u-page-grid` with 4 `::u-page-card` entries (icons + title + description)
   - `::code-group` with three `:::code-block` entries (Vue / vanilla / framework-agnostic)
   - "What's next?" section linking to `/getting-started/quickstart`
2. Configure `examples/docs/app/app.config.ts`:
   - `site.name = 'GenicUI'`
   - `site.url = 'https://genicui.dev'` (placeholder; T12 sets the real domain)
   - `ui.primary = '#3B82F6'` (placeholder palette; commit values in T4)
   - `ui.icons = ['lucide']`
3. Configure `examples/docs/app/components/AppHeader.vue` (or use Docus's `UHeader`):
   - Logo + site name
   - Top nav: Getting Started · Concepts · Guides · API · Cookbook · Deployment
   - GitHub icon button
   - Dark-mode toggle
4. Configure `examples/docs/app/components/AppFooter.vue`:
   - Three columns: docs sitemap · community (Discord, GitHub) · legal (license, code-of-conduct)
   - "Built with [Docus](https://docus.dev)" credit
5. Add skip-link component (`a.skip-link[href="#main"]`) to `app.vue`
6. Set up `nuxt-og-image` (or Nuxt's built-in `useSeoMeta`) to generate `/og-image.png` from the landing page metadata
7. Set `useSeoMeta` defaults in `app/app.config.ts`: title template (`%s · GenicUI`), description, OG tags, Twitter card
8. Run `bun --filter docs dev`; verify landing renders, dark mode toggles, skip-link works, OG image generates
9. Run `bun --filter docs build`; verify `.output/public/og-image.png` exists
10. Lighthouse pass on the landing page; target ≥ 90 in all 4 categories

### Skills & MCP Servers

| Resource | Purpose | When to Invoke |
|---|---|---|
| `context7` MCP | Nuxt UI v4 + Docus landing-page patterns | Step 1 |
| `nuxt-og-image` docs | OG image generation patterns | Step 6 |
| `websearch` | Lighthouse 90+ patterns for Nuxt landing pages | Step 10 |

## Acceptance Criteria

- AC1: `content/index.md` renders with hero, 4 feature cards, code-group preview, and "What's next?" section
- AC2: Install snippet `bun add @genicui/core @genicui/server` is highlightable copy-to-clipboard
- AC3: Two CTAs route correctly: "Get Started" → `/getting-started/introduction`, "View on GitHub" → repo URL
- AC4: Code preview shows the same component in Vue / vanilla / framework-agnostic tabs (`code-group`)
- AC5: Header is sticky, contains logo + 6-item nav + GitHub icon + dark-mode toggle
- AC6: Footer renders with 3 columns + Docus credit
- AC7: Dark mode toggles persist across navigation (localStorage)
- AC8: Skip-link visible on Tab focus; jumps to `#main` content
- AC9: `useSeoMeta` populates `<title>`, `<meta description>`, OG tags, Twitter card
- AC10: `/og-image.png` renders at 1200×630 with landing-page title
- AC11: Lighthouse scores ≥ 90 in Performance / Accessibility / SEO / Best Practices

## Completion Criteria

- [ ] All 11 acceptance criteria above pass
- [ ] `bun run lint` exits 0
- [ ] `bun --filter docs build` succeeds
- [ ] Lighthouse CI run committed with screenshots
- [ ] `bun --filter docs dev` boots in <10s
- [ ] Landing page is mobile-responsive (375px, 768px, 1440px breakpoints)

## Testing Checklist

- [ ] Smoke: `bun --filter docs dev` boots, landing renders, all sections present
- [ ] Visual: Lighthouse run on `/`; commit JSON report + screenshots at 3 breakpoints
- [ ] Accessibility: axe-core scan via Playwright (`@axe-core/playwright`) reports zero violations
- [ ] Dark mode: toggle persists across page navigation
- [ ] Skip-link: Tab from address bar lands on visible skip-link
- [ ] OG image: `/og-image.png` returns 200 with valid PNG header
- [ ] SEO: `view-source:/` shows `<title>`, `<meta name="description">`, OG tags
- [ ] No property tests (N/A)
- [ ] No trust-boundary touch (N/A)

## Sub Tasks

| SubTask ID | Title | Status | Test Required | Priority |
|---|---|---|---|---|
| M5.1-T4-01 | Author `content/index.md` (hero + cards + code-group) | ⚪ Not Started | ✅ Yes | Critical |
| M5.1-T4-02 | Configure `app.config.ts` site + brand palette | ⚪ Not Started | ❌ No | High |
| M5.1-T4-03 | Build AppHeader + AppFooter components | ⚪ Not Started | ✅ Yes | High |
| M5.1-T4-04 | Add skip-link + dark-mode persistence | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T4-05 | Configure OG image + SEO defaults | ⚪ Not Started | ✅ Yes | Medium |
| M5.1-T4-06 | Lighthouse pass + commit screenshots | ⚪ Not Started | ✅ Yes | High |

## Dependencies

- **Requires:** M5.1-T1 (scaffold), M5.1-T3 (IA — `content/index.md` slot exists)
- **Soft dependency:** M5.1-T2 (for citing authoritative content in the feature-grid descriptions)
- **Blocks:** M5.1-T5–T10 (those tasks fill the rest of the IA; the landing is the entry point), M5.1-T11 (search indexes the landing), M5.1-T12 (initial deploy needs a landing)

## Documentation References

- Docus landing page patterns: https://docus.dev/en/essentials/landing
- Nuxt UI v4 page primitives: https://ui.nuxt.com/components
- Nuxt OG Image: https://nuxtseo.com/docs/og-image/getting-started/installation
- Code preview source: `.vaahagents/requirements/idea/examples-cartviewer.md` (post-T2)
- Brand palette placeholders: `#3B82F6` `#8B5CF6` `#10B981` (final values committed in T4)

## Notes

- **Lighthouse 90+ is a hard target.** Docus + Nuxt UI v4 + Vercel can hit this with default settings; verify image sizes, font loading (`font-display: swap`), and code-splitting are configured.
- **Skip-link is not optional.** WCAG 2.4.1 requires a mechanism to bypass repeated navigation. Docus's default template includes it — verify it's not stripped.
- **Code preview is a key selling point.** Showing the same component in Vue / vanilla / framework-agnostic is what differentiates GenicUI from MCP-only or framework-only competitors. Use real working code from `examples-cartviewer.md`, not contrived examples.
- **Dark mode toggle position.** Top-right of header is industry standard. Don't reinvent.
- **T11 adds search; T4 must not break the search index.** No heavy inline scripts, no client-only sections that bypass prerendering.
