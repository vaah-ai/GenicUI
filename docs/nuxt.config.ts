// https://docus.dev/en
// GenicUI Documentation Site — M5.1-T1 Docus scaffold + M5.1-T4 landing wiring
// + M5.1-T11 Search + SEO + llms.txt wiring + M5.1-T12 Vercel deploy wiring.
//
// Extends the upstream Docus Nuxt 4 layer. Theme + brand config live in
// app/app.config.ts. Site SEO defaults live in app.vue. Vercel-specific
// config (build command, output dir, headers, rewrites) lives in vercel.json.
//
// Extends the upstream Docus Nuxt 4 layer. Theme + brand config live in
// app/app.config.ts. Site SEO defaults live in app.vue.

export default defineNuxtConfig({
  extends: ['docus'],

  compatibilityDate: '2025-01-01',

  devtools: { enabled: true },

  // M5.1-T4 — landing page design tokens, premium fonts, motion.
  css: ['~/assets/css/main.css'],

  // Docus bundles Nuxt Content v3. Content collections are configured in
  // content.config.ts (added in M5.1-T3 alongside the IA tree).

  typescript: {
    strict: true
  },

  // M5.1-T4 — global app metadata used by `useAppConfig()` and the SEO
  // defaults in app.vue. The `site.url` placeholder points at the eventual
  // production domain; M5.1-T12 (Vercel deploy) wires the real one.
  //
  // M5.1-T12 — In the Vercel dashboard (Settings → Environment Variables),
  // set `NUXT_SITE_URL=https://genicui.vaah.ai` for Production. Nuxt Site
  // Config reads `NUXT_SITE_URL` at build time and overrides this
  // placeholder, so the placeholder is only used for local dev. This is
  // the canonical Docus way to set the production URL — it covers
  // `@nuxtjs/sitemap`, `nuxt-llms`, `nuxt-og-image`, and `<link rel="canonical">`
  // atomically without per-module config duplication.
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' }
      ]
    }
  },

  // M5.1-T11 — site.url for nuxt-site-config (used by @nuxtjs/robots +
  // @nuxtjs/sitemap + nuxt-llms + nuxt-og-image). Duplicates app.config.ts
  // site.url because @nuxtjs/robots reads from nuxt.config.ts site.url,
  // not app.config.ts. M5.1-T12 (Vercel deploy) wires the real one.
  site: {
    url: 'https://genicui.vaah.ai',
    name: 'GenicUI'
  },

  // M5.1-T12 (follow-up) — @nuxt/fonts is auto-registered by @nuxt/ui
  // (with `defaults.defaults.weights: [400, 500, 600, 700]`), but the
  // landing page's design system uses Geist + Geist Mono as **variable
  // fonts** (weights 100-900). The UI defaults would force static cuts
  // and skip the variable axis. We override `families` here so the
  // fontsource provider serves `@fontsource-variable/geist`,
  // `geist-mono`, and `instrument-serif` (all three are in fontsource's
  // catalog — api.fontsource.org/v1/fonts).
  //
  // The space-separated range `'100 900'` is what triggers unifont's
  // `prepareWeights` to set `variable: true` (unifont/dist/index.mjs:135
  // — `if (weight.includes(" "))` routes into the variable path). Without
  // the range, fontsource serves 4 static cuts and the landing loses
  // smooth weight rendering.
  //
  // Why this is needed beyond UX: nuxt-og-image scans our CSS for
  // @font-face rules and tries to fetch those URLs at prerender time.
  // When the URLs point at cdn.jsdelivr.net or fonts.googleapis.com, it
  // emits `[Nuxt OG Image] External font URLs are not supported` for
  // every OG image render (logged ~16× per build). After this change,
  // @nuxt/fonts rewrites the @font-face `src` to point at its own
  // `/_fonts/<hash>.woff2` public asset (same-origin), so the OG-image
  // fetcher falls through to its `fetchWithEvent` path and renders
  // silently. Verified that Geist is in fontsource's catalog
  // (`unifont` fontsource provider queries api.fontsource.org/v1/fonts).
  fonts: {
    families: [
      { name: 'Geist', provider: 'fontsource', weights: ['100 900'] },
      { name: 'Geist Mono', provider: 'fontsource', weights: ['100 900'] },
      { name: 'Instrument Serif', provider: 'fontsource', weights: ['400'], styles: ['normal', 'italic'] }
    ]
  },

  // M5.1-T11 — nuxt-llms is already auto-registered by Docus, but it short-
  // circuits silently if `llms.domain` is unset (module.mjs line 25). The
  // domain below is the production URL placeholder; T12 may revise before
  // deploy. Sections are auto-derived from the docs content collection —
  // every `.navigation.yml` + section heading becomes a section in the
  // emitted `llms.txt`, and the full corpus concatenates into
  // `llms-full.txt`. `/raw/<path>.md` and the `Accept: text/markdown`
  // Vercel rewrite are both gated on nuxt-llms being live (see
  // docus/modules/vercel-markdown-rewrite.ts), so this single block
  // satisfies AC4, AC5, AC6, and AC9 of M5.1-T11.
  llms: {
    domain: 'https://genicui.vaah.ai',
    title: 'GenicUI — Generative Agentic UI Framework',
    description: 'The protocol that lets AI agents use your UI. MCP-native, library-agnostic, framework-agnostic.',
    full: {
      title: 'GenicUI — Full Documentation',
      description: 'Complete GenicUI corpus: Getting Started, Concepts, Guides, API Reference, Cookbook, Deployment, Resources, Community, and Migration guides.'
    }
  },

  // M5.1-T11 — Docus auto-registers @nuxtjs/robots; we extend the
  // permissive default (allow everything) with an explicit block on AI
  // crawlers (blockAiBots emits the GPTBot / ClaudeBot / CCBot group).
  // The doc site is public; we don't want it silently ingested for AI
  // training, but we DO want it ingested for `llms.txt` consumers — the
  // distinction is exactly what the llms.txt spec is for. AC8 of M5.1-T11
  // (robots.txt 200 + sitemap pointer) is satisfied by `sitemap: '/sitemap.xml'`.
  robots: {
    blockAiBots: true,
    sitemap: '/sitemap.xml'
  },

  // M5.1-T11 — explicit prerender list for the static SEO artifacts.
  // Docus's nuxt.config.ts already pushes '/sitemap.xml' but not the
  // robots.txt, llms.txt, or llms-full.txt endpoints. nuxt-llms calls
  // `addPrerenderRoutes` for llms.txt + llms-full.txt on registration,
  // so those two are handled automatically when `llms.domain` is set.
  // robots.txt is the only one that needs an explicit prerender entry
  // here — @nuxtjs/robots 6.x registers a Nitro route handler that the
  // prerender crawler doesn't follow automatically.
  nitro: {
    prerender: {
      routes: [
        '/robots.txt',
        '/llms.txt',
        '/llms-full.txt'
      ]
    }
  }
})
