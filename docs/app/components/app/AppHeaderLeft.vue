<script setup lang="ts">
/**
 * AppHeaderLeft override — adds Home / Quick Start / Docs nav links
 * alongside the GenicUI wordmark.
 *
 * Override pattern:
 *   Docus's layer exports `app/components/app/AppHeaderLeft.vue`. Nuxt's
 *   component auto-import resolves local files first, so dropping this
 *   `app/components/app/AppHeaderLeft.vue` shadows the upstream one
 *   with zero config — no `nuxt.config` `components: [{path, ...}]` entry
 *   needed. Confirmed by reading the Docus source: AppHeader.vue's
 *   `<template #left><AppHeaderLeft /></template>` only knows the bare
 *   name, and Nuxt component resolution walks the project tree before
 *   any extended layers.
 *
 * Link targets:
 *   Home         → /                          (landing page)
 *   Quick Start  → /getting-started/quick-start
 *   Docs         → /getting-started/introduction  (canonical docs entry)
 *
 * Active state uses Vue Router's `useRoute()` against each link's path
 * with a leading-slash normalize so the trailing-slash Nuxt generates
 * for `/getting-started/introduction/` doesn't break the comparison.
 */
const appConfig = useAppConfig()
const site = useSiteConfig()
const { localePath } = useDocusI18n()

const ariaLabel = appConfig.header?.title || site.name

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Quick Start', to: '/getting-started/quick-start' },
  { label: 'Docs', to: '/getting-started/introduction' }
] as const

const route = useRoute()

// Nuxt can normalize trailing slashes; match `to` against the live path
// with both forms so a `/foo/` route still highlights the `/foo` link.
const isActive = (to: string) => {
  const path = route.path
  return path === to || path === `${to}/` || (to !== '/' && path.startsWith(`${to}/`))
}
</script>

<template>
  <div class="flex items-center gap-3 sm:gap-4 lg:gap-6">
    <NuxtLink
      :to="localePath('/')"
      :aria-label="ariaLabel"
      class="shrink-0 inline-flex"
    >
      <!--
        Inline dual <img> instead of Docus's <AppHeaderLogo> (which wraps
        <UColorModeImage> → <UImage> → @nuxt/image). @nuxt/image rewrites
        /logo.svg → /_ipx/_/logo.svg on the way out, and on Vercel's
        "static directory" deploy (vercel.json: outputDirectory) the IPX
        runtime isn't mounted — the request hits Nitro's no-op 404 handler,
        and the wordmark shows the browser's broken-image icon.

        Raw <img> with tailwind dark: variants serves the public SVG
        directly. Confirmed live: /logo.svg and /logo-light.svg both
        return 200 from the deployed static edge. The pre-rendered
        /_ipx/_/logo.svg local build output is irrelevant on the
        static-only deploy.
      -->
      <img
        src="/logo-light.svg"
        alt="GenicUI"
        width="132"
        height="28"
        class="h-6 w-auto shrink-0 dark:hidden"
      >
      <img
        src="/logo.svg"
        alt="GenicUI"
        width="132"
        height="28"
        class="h-6 w-auto shrink-0 hidden dark:block"
      >
    </NuxtLink>

    <USeparator
      orientation="vertical"
      class="h-5 hidden sm:block"
    />

    <nav
      aria-label="Primary"
      class="hidden sm:flex items-center gap-1"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="localePath(link.to)"
        :aria-current="isActive(link.to) ? 'page' : undefined"
        class="px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors"
        :class="isActive(link.to)
          ? 'text-highlighted bg-primary/10'
          : 'text-muted hover:text-highlighted hover:bg-default'"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <!-- Mobile: compact icon-only links after the logo so the top bar
         stays usable below sm. The full nav tree falls back to the
         <AppHeaderBody> drawer triggered by the toggle. -->
    <nav
      aria-label="Primary"
      class="flex sm:hidden items-center gap-1"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="localePath(link.to)"
        :aria-label="link.label"
        :aria-current="isActive(link.to) ? 'page' : undefined"
        class="size-8 inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors"
        :class="isActive(link.to)
          ? 'bg-primary/15 text-primary'
          : 'text-muted hover:text-highlighted hover:bg-default'"
      >
        {{ link.label.charAt(0) }}
      </NuxtLink>
    </nav>
  </div>
</template>
