/**
 * PrimeVue Nuxt plugin.
 *
 * Registers PrimeVue with the Aura theme for the playground app.
 * Uses @primeuix/themes for CSS variable-based theming.
 *
 * `darkModeSelector: '[data-theme="dark"]'` makes PrimeVue's Aura
 * components flip dark/light in step with the playground's own
 * `--gp-*` token layer (defined in `app/assets/css/primevue.css`),
 * which uses the same `[data-theme="light"]` / `[data-theme="dark"]`
 * attribute on `<html>` as its switch. The `useColorMode` composable
 * owns writing that attribute; this plugin just consumes it.
 *
 * @see {F41} — Playground demo app
 * @see F47 follow-up — full light/dark theming
 */
import { defineNuxtPlugin } from '#app';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        // Match the playground's <html data-theme="..."> attribute so
        // Aura's components flip alongside the `--gp-*` token layer.
        darkModeSelector: '[data-theme="dark"]',
      },
    },
  });
});
