// https://docus.dev/en
// GenicUI Documentation Site — M5.1-T1 Docus scaffold + M5.1-T4 landing wiring.
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
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' }
      ]
    }
  }
})
