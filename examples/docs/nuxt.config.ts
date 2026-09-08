// https://docus.dev/en
// GenicUI Documentation Site — M5.1-T1 Docus scaffold
//
// Extends the upstream Docus Nuxt 4 layer. Theme + brand config live in
// app/app.config.ts; full theming is filled in by M5.1-T4 (Landing page).

export default defineNuxtConfig({
  extends: ['docus'],

  compatibilityDate: '2025-01-01',

  devtools: { enabled: true },

  // Docus bundles Nuxt Content v3. Content collections are configured in
  // content.config.ts (created in M5.1-T3 alongside the IA tree).

  typescript: {
    strict: true
  }
})