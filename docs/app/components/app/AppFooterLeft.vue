<script setup lang="ts">
/**
 * M5.1-T12 — Footer left slot override.
 *
 * Extends Docus's default AppFooterLeft (which renders only a copyright
 * year) with a "Deployed on Vercel" link that points at the canonical
 * production URL. Vercel's badge convention uses an SVG icon next to
 * the wordmark — we render it inline as a Nuxt UI `i-simple-icons-vercel`
 * icon to match the rest of the footer icons.
 *
 * The link target reads from `appConfig.site.url` so the same footer
 * renders correctly in preview deploys (where Vercel assigns a
 * `*.vercel.app` URL) and in production (where the custom domain
 * `genicui.vaah.ai` is configured).
 *
 * Hidden when `appConfig.site.url` is unset (defensive — should never
 * happen on the live site, but useful for the very first local build).
 */
const appConfig = useAppConfig()
const siteUrl = computed(() => (appConfig.site?.url as string | undefined) ?? '')
const showDeployBadge = computed(() => Boolean(siteUrl.value))
</script>

<template>
  <div class="flex items-center gap-4 text-sm text-muted">
    <span>Copyright © {{ new Date().getFullYear() }}</span>
    <a
      v-if="showDeployBadge"
      :href="`https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvaah-ai%2FGenicUI&project-name=genicui-docs&root-directory=docs`"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 text-muted hover:text-default transition-colors"
      :aria-label="`Deploy this documentation site to Vercel (current site: ${siteUrl})`"
    >
      <UIcon name="i-simple-icons-vercel" class="size-3.5" aria-hidden="true" />
      <span>Deployed on Vercel</span>
    </a>
  </div>
</template>
