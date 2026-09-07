// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  devtools: { enabled: true },

  // PrimeVue styles
  css: ['~/assets/css/primevue.css'],

  // Dev server
  devServer: {
    port: 3040,
  },

  // Disable SSR for WS client — the playground is a client-side demo
  ssr: false,

  // Vite config for PrimeVue auto-import
  vite: {
    plugins: [],
  },
});
