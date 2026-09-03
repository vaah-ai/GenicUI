/**
 * PrimeVue Nuxt plugin.
 *
 * Registers PrimeVue with the Aura theme for the playground app.
 *
 * @see {F41} — Playground demo app
 */
import { defineNuxtPlugin } from '#app';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    theme: {
      preset: Aura,
    },
  });
});
