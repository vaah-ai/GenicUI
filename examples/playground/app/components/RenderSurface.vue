<template>
  <section
    class="render-surface"
    aria-label="Rendered components"
    aria-live="polite"
    aria-atomic="false"
  >
    <!-- Prompt hero: shown when no components rendered yet -->
    <div v-if="components.length === 0" class="render-hero">
      <div class="render-hero-content">
        <div class="render-hero-icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <h2>Pick a prompt to render</h2>
        <p>
          Click a prompt below. Responses stream in chat →
        </p>

        <div
          v-if="dynamicPrompts.length > 0"
          class="render-hero-prompts"
          data-testid="render-hero-prompts"
        >
          <PromptChips
            :prompts="dynamicPrompts"
            :disabled="!registryReady"
            @select="handlePromptSelect"
          />
        </div>
        <div v-else-if="registrySelected" class="render-hero-empty">
          <p>No example prompts in this registry yet.</p>
        </div>
        <div v-else class="render-hero-empty">
          <p>Select a registry on the left to see available prompts.</p>
        </div>
      </div>
    </div>

    <!-- Component cards -->
    <article
      v-for="(comp, index) in components"
      :key="comp.componentId"
      class="component-card"
      :style="{ animationDelay: `${index * 50}ms` }"
      :aria-label="`${comp.name} component`"
    >
      <header class="component-card-header">
        <span class="component-card-name">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="component-card-icon"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          {{ comp.name }}
        </span>
        <span class="component-card-id">{{ comp.componentId }}</span>
      </header>

      <details class="component-card-props">
        <summary class="component-card-props-toggle">
          <span>Props</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="component-card-chevron"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <pre>{{ JSON.stringify(comp.props, null, 2) }}</pre>
      </details>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useComponents } from '~/composables/useComponents.ts';
import { useChatInput } from '~/composables/useChatInput.ts';
import { useRegistries } from '~/composables/useRegistries.ts';
import PromptChips from './PromptChips.vue';

/**
 * RenderSurface — center column. Shows a hero with dynamic prompts when no
 * components are mounted; otherwise lists each rendered component card.
 *
 * Prompts come from the *selected* registry's `examplePrompts` field. When no
 * registry is selected we show a hint rather than a misleading chip list.
 *
 * F43 follow-up: chip clicks now route through `useChatInput().fillAndSubmit()`
 * so the prompt fills the new ChatInput bar AND auto-submits, instead of
 * bypassing the chat input. The actual `chat.sendMessage()` call lives in
 * `ChatPanel.handleSubmit()` so the chat input bar is the single source of
 * truth for prompt submission.
 *
 * @see {F43} — Suggestive prompts come from registry data
 * @see {F16} — Rendered components arrive via render_component
 */
const { components } = useComponents();
const registries = useRegistries();
const chatInput = useChatInput();

const registrySelected = computed(() => !!registries.selected());
const registryReady = computed(
  () => registrySelected.value && !registries.loading.value && !registries.error.value,
);

/**
 * Example prompts pulled live from the selected registry, capped to 8.
 * Falls back to an empty array so we don't render a stale list.
 */
const dynamicPrompts = computed<string[]>(() => {
  const reg = registries.selected();
  if (!reg) return [];
  return reg.components.flatMap((c) => c.examplePrompts ?? []).slice(0, 8);
});

/**
 * Forward a clicked prompt to the chat input bar.
 *
 * `fillAndSubmit` sets the singleton draft + flips `submitRequested`.
 * The `ChatInput` component watches that flag, fires the submit
 * handler (which reads the selected registry + active provider and
 * calls `chat.sendMessage`), then clears the singleton so the next
 * chip click works.
 */
function handlePromptSelect(prompt: string): void {
  chatInput.fillAndSubmit(prompt);
}
</script>

<style scoped>
.render-surface {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-3);
  padding: var(--gp-space-4);
  overflow-y: auto;
  min-height: 0;
}

/* ---------- Hero (empty state) ---------- */
.render-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 360px;
  padding: var(--gp-space-6);
}

.render-hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gp-space-3);
  max-width: 480px;
  text-align: center;
}

.render-hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--gp-radius-md);
  background: var(--gp-accent-subtle);
  color: var(--gp-accent);
}

.render-hero h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gp-text);
  letter-spacing: -0.01em;
}

.render-hero p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--gp-text-secondary);
}

.render-hero-prompts {
  width: 100%;
  margin-top: var(--gp-space-3);
}

.render-hero-empty {
  font-size: 0.8125rem;
  color: var(--gp-text-muted);
  font-style: italic;
}

/* ---------- Component cards ---------- */
.component-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md);
  overflow: hidden;
  animation: card-enter var(--gp-transition) ease-out backwards;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.component-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) var(--gp-space-3);
  background: var(--gp-bg);
  border-bottom: 1px solid var(--gp-border);
}

.component-card-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gp-text);
}

.component-card-icon {
  color: var(--gp-accent);
  flex-shrink: 0;
}

.component-card-id {
  font-family: var(--gp-font-mono);
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  padding: 2px 6px;
  background: var(--gp-surface);
  border-radius: var(--gp-radius-sm);
}

/* Collapsible props (was always-open before — bad DX for 300px tall pre blocks) */
.component-card-props {
  border-top: 1px solid var(--gp-border);
}

.component-card-props-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gp-space-2) var(--gp-space-3);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background var(--gp-transition);
}

.component-card-props-toggle::-webkit-details-marker {
  display: none;
}

.component-card-props-toggle:hover {
  background: var(--gp-surface-hover);
}

.component-card-props-toggle:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: -2px;
}

.component-card-chevron {
  transition: transform var(--gp-transition);
}

.component-card-props[open] .component-card-chevron {
  transform: rotate(180deg);
}

.component-card-props pre {
  margin: 0;
  padding: var(--gp-space-3);
  font-family: var(--gp-font-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--gp-text-secondary);
  background: var(--gp-bg);
  overflow-x: auto;
  white-space: pre;
  max-height: 320px;
  overflow-y: auto;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .component-card {
    animation: none;
  }
  .component-card-chevron {
    transition: none;
  }
}
</style>
