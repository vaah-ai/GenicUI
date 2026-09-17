// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  devtools: { enabled: true },

  // PrimeVue styles (sibling workspace parity)
  css: ['~/assets/css/primevue.css'],

  // Dev server — uses the same port as the existing playground so
  // both can be inspected in parallel during development.
  devServer: {
    port: 3042,
  },

  // Disable SSR for WS client — the playground is a client-side demo.
  ssr: false,

  // Vite config — no extra plugins at this layer; the workspace
  // plugin API is server-only.
  vite: {
    plugins: [],
  },

  // Theme bootstrap — write [data-theme="..."] on <html> before the
  // stylesheet parses so the first paint is already correctly themed.
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
