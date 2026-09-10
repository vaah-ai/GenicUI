// GenicUI brand palette — M5.1-T4 (Landing page).
//
// Primary moved to **violet** to match the GenicUI etymology:
// Generative (Gen) + Agent(ic) + UI = a bridge between generative AI
// and agentic interfaces. Violet is the color generative AI tooling
// has been converging on (Claude, Cursor, v0) and it threads through
// the GenicElement Web Component's closed Shadow DOM as the registry
// accent on every rendered component.
//
// Three accent colors encode the framework's positioning:
//   - primary (violet)   — the bridge itself, generative ↔ agentic
//   - secondary (blue)   — MCP/protocol layer, the wire that connects agents
//   - tertiary (emerald) — successful renders, positive actions
//
// Nuxt UI v4 token map accepts Tailwind color names OR hex values.
// These are the T4-approved placeholders; T12 may revise before production.
// Never reference @nuxt/ui-pro — Nuxt UI v4 MIT ships Pro features in the
// unified open-source package.

// Header logo lockup — "GenicUI" wordmark, light + dark variants.
// Nuxt UI's <UColorModeImage> (and Docus's AppHeader).logo emit <img src=…>,
// which renders the SVG in its own document context — so
// @media (prefers-color-scheme: light) inside the SVG has no effect and
// the dark fill always wins on a light navbar. Two separate files are
// the only reliable pattern.
//
//   logo.svg       — dark mode: violet-300 "Genic" + violet→blue "UI"
//   logo-light.svg — light mode: violet-800 "Genic" + deep indigo→blue "UI"
//
// All colors verified against WCAG 2.1 on the navbar backdrops.
// The light/dark tokens use Nuxt UI's `default` semantic color
// (bg-default = #fff light, --ui-bg dark in dark mode), not raw
// Tailwind utilities — arbitrary-value classes like `bg-[#0A0A0B]/85`
// are stripped by Tailwind v4's static scan when they appear inside
// TypeScript config strings (only files matched by `@source` in CSS
// are scanned). The semantic tokens are guaranteed to ship.
export default defineAppConfig({
  header: {
    title: 'GenicUI',
    logo: {
      light: '/logo-light.svg',
      dark: '/logo.svg',
      alt: 'GenicUI'
    }
  },
  ui: {
    colors: {
      primary: 'violet',
      secondary: 'blue',
      tertiary: 'emerald',
      info: 'sky',
      success: 'emerald',
      warning: 'amber',
      error: 'rose'
    },
    icons: {
      dynamic: true
    },
    // M5.1-T4 — PageHero title sizing override. The default
    // 'text-5xl sm:text-7xl' clips our 8-word tagline at 1440px.
    // Cap at sm:text-6xl and add lg:text-7xl for wide screens so
    // the hierarchy stays strong without overflowing the
    // --ui-container width.
    pageHero: {
      slots: {
        title: 'text-4xl sm:text-5xl lg:text-6xl text-pretty tracking-tight font-bold text-highlighted text-balance',
        description: 'text-base sm:text-lg text-muted text-balance mt-4'
      }
    },
    // Header — slightly stronger dark glass so the brand-colored wordmark
    // has a clean, predictable backdrop in dark mode (the page is near-black
    // and the wordmark uses violet-300, which needs ≥4.5:1 contrast).
    // The blur is heavier than the page noise so the header reads as a
    // distinct "bar" rather than blending into the hero gradient.
    //
    // Uses Nuxt UI semantic tokens (bg-default, border-default) so the
    // color flips with the page color mode via the --ui-bg / --ui-border
    // CSS custom properties, instead of arbitrary-value Tailwind utilities
    // that the v4 static scanner can't see inside a TS config string.
    // Tailwind v4 arbitrary-opacity syntax: `bg-default/[.80]` (NOT
    // `bg-default/80` — that's silently dropped).
    header: {
      slots: {
        root: 'backdrop-blur-md bg-default/[.80] border-b border-default'
      }
    }
  },

  site: {
    name: 'GenicUI',
    url: 'https://genicui.dev',
    description: 'The protocol that lets AI agents use your UI. MCP-native, library-agnostic, framework-agnostic.',
    defaultLocale: 'en'
  },

  // GitHub — Docus's AppHeader reads appConfig.github.url and renders an
  // icon button in the header right slot. T12 may revise the repo URL.
  github: {
    url: 'https://github.com/vaah-ai/GenicUI',
    branch: 'main'
  },

  // Docus owns the color-mode shortcut. Keep 'd' — it's also Docus's prefix
  // for the in-app command palette.
  docus: {
    shortcuts: {
      toggleColorMode: 'd'
    }
  },

  // SEO defaults — title template + OG card metadata. Per-page `seo:` blocks
  // (in frontmatter) override these. T11 (Search + SEO + llms) wires
  // nuxt-llms + @nuxtjs/robots in nuxt.config.ts.
  //
  // Note: `seo.image` was previously set to '/og-image.png', a static
  // fallback that never existed in `public/`. Docus's bundled
  // `nuxt-og-image` emits a per-page OG image via `defineOgImage()` for
  // every route (see `_og/` build output), so the static fallback is
  // redundant — and a dead reference risks a 404 on the landing.
  seo: {
    siteName: 'GenicUI',
    titleTemplate: '%s · GenicUI',
    description: 'The protocol that lets AI agents use your UI. MCP-native, library-agnostic, framework-agnostic.',
    twitter: '@genicui'
  }
})
