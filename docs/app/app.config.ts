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
// All colors verified against WCAG 2.1 on the navbar backdrops
// (bg-white/70 light, #0A0A0B/85 dark).
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
    header: {
      slots: {
        root: 'backdrop-blur-md bg-white/70 dark:bg-[#0A0A0B]/85 border-b border-neutral-200/60 dark:border-white/[0.06]'
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
    url: 'https://github.com/genicui/genicui',
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
  // (in frontmatter) override these. T11 (Search + SEO + llms) may layer
  // additional modules on top.
  seo: {
    siteName: 'GenicUI',
    titleTemplate: '%s · GenicUI',
    description: 'The protocol that lets AI agents use your UI. MCP-native, library-agnostic, framework-agnostic.',
    twitter: '@genicui',
    image: '/og-image.png'
  }
})
