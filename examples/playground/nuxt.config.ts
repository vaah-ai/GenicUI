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

  // Theme bootstrap — write [data-theme="..."] on <html> before the
  // stylesheet parses, so the first paint is already correctly themed
  // and there's no flash of unstyled/wrongly-themed content.
  //
  // Mirrors what `useColorMode` does on the client, but runs in a
  // synchronous inline script that lands in the document <head>.
  // The `useColorMode` composable then takes over once Vue hydrates.
  app: {
    head: {
      script: [
        {
          tagPosition: 'head',
          innerHTML:
            "(function(){try{var t=localStorage.getItem('genicui-theme');" +
            "if(t!=='system'&&t!=='light'&&t!=='dark'){t='system';}" +
            "var r=t;if(r==='system'){r=window.matchMedia&&" +
            "window.matchMedia('(prefers-color-scheme: dark)').matches?" +
            "'dark':'light';}" +
            "document.documentElement.dataset.theme=r;}" +
            "catch(e){document.documentElement.dataset.theme='dark';}})();",
        },
      ],
    },
  },
});
