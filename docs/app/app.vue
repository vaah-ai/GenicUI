<script setup lang="ts">
/**
 * Root app.vue — extends Docus's default chrome.
 *
 * Docus's layer app.vue wraps content with `<UApp><AppHeader /><NuxtLayout>
 * <NuxtPage /></NuxtLayout><AppFooter /></UApp>` and provides the
 * navigation context consumed by `useSubNavigation`.
 *
 * Our wrapper mirrors that setup so the header + footer render, while
 * adding our SkipLink for WCAG 2.4.1 bypass.
 */
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'
import * as nuxtUiLocales from '@nuxt/ui/locale'

const appConfig = useAppConfig()
const { seo } = appConfig
useDocusShortcuts()
const site = useSiteConfig()
const { locale, locales, isEnabled, switchLocalePath } = useDocusI18n()
const { isEnabled: isAssistantEnabled } = useAssistant()

const nuxtUiLocale = computed(() => nuxtUiLocales[locale.value as keyof typeof nuxtUiLocales] || nuxtUiLocales.en)
const lang = computed(() => nuxtUiLocale.value.code)
const dir = computed(() => nuxtUiLocale.value.dir)
const collectionName = computed(() => isEnabled.value ? `docs_${locale.value}` : 'docs')

// --- Global SEO defaults ---
const s = useAppConfig().site
useSeoMeta({
  titleTemplate: (title?: string) => (title ? `${title} · ${s.name}` : s.name),
  ogSiteName: s.name as string,
  ogType: 'website',
  ogUrl: s.url as string,
  ogDescription: s.description as string,
  twitterCard: 'summary_large_image',
  twitterSite: '@genicui',
  twitterCreator: '@genicui'
})

// --- Head ---
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#3B82F6' },
    { name: 'color-scheme', content: 'light dark' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    // Preload the two variable fonts used by the landing. These are the
    // only two we can preload reliably — Geist + Geist Mono come from a
    // fixed CDN URL. Instrument Serif is imported as a Google Fonts CSS
    // and can't be preloaded directly (no stable hash from the @import),
    // so it stays on `font-display: swap`.
    { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href: 'https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5.2.5/files/geist-latin-wght-normal.woff2' },
    { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href: 'https://cdn.jsdelivr.net/npm/@fontsource-variable/geist-mono@5.2.5/files/geist-mono-latin-wght-normal.woff2' }
  ],
  htmlAttrs: {
    lang,
    dir
  }
})

// --- I18n redirect ---
if (isEnabled.value) {
  const route = useRoute()
  const defaultLocale = useRuntimeConfig().public.i18n.defaultLocale!
  onMounted(() => {
    const currentLocale = route.path.split('/')[1]
    if (!locales.some(l => l.code === currentLocale)) {
      return navigateTo(switchLocalePath(defaultLocale) as string)
    }
  })
}

// --- Navigation (required by useSubNavigation / AppHeader / docs layout) ---
const { data: navigation } = await useAsyncData(
  () => `navigation_${collectionName.value}`,
  () => queryCollectionNavigation(collectionName.value as keyof PageCollections),
  {
    transform: (data: ContentNavigationItem[]) => transformNavigation(data, isEnabled.value, locale.value),
    watch: [locale]
  }
)

provide('navigation', navigation)

const { subNavigationMode } = useSubNavigation(navigation)
</script>

<template>
  <UApp :locale="nuxtUiLocale">
    <SkipLink />
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <div class="flex">
      <div class="flex-1 min-w-0" :class="{ 'docus-sub-header': subNavigationMode === 'header' }">
        <AppHeader v-if="$route.meta.header !== false" />
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
        <AppFooter v-if="$route.meta.footer !== false" />

        <ClientOnly>
          <AppSearch :navigation="navigation" />
          <LazyAssistantFloatingInput v-if="isAssistantEnabled" />
        </ClientOnly>
      </div>

      <ClientOnly v-if="isAssistantEnabled">
        <LazyAssistantPanel />
      </ClientOnly>
    </div>
  </UApp>
</template>

<style>
@media (min-width: 1024px) {
  .docus-sub-header {
    /* 64px base header + 48px sub-navigation bar */
    --ui-header-height: 112px;
  }
}
</style>
