<template>
  <div class="prompt-chips" role="group" aria-label="Example prompts">
    <button
      v-for="(prompt, index) in prompts"
      :key="index"
      type="button"
      class="prompt-chip"
      :aria-label="`Send prompt: ${prompt}`"
      :disabled="disabled"
      @click="onSelect(prompt)"
    >
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
        class="prompt-chip-icon"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <span class="prompt-chip-text">{{ prompt }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * PromptChips — renders clickable chips for example prompts.
 *
 * Uses native <button> elements for:
 * - Built-in keyboard support (Enter/Space)
 * - Focus rings on :focus-visible
 * - Disabled state semantics
 * - Proper click semantics for screen readers
 *
 * @see {F43} — Suggestive prompts and registry selector
 */

withDefaults(
  defineProps<{
    /** Array of example prompt texts. */
    prompts: string[];
    /** Disable all chips (e.g. while disconnected). */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  /** A prompt was selected. */
  select: [prompt: string];
}>();

function onSelect(prompt: string): void {
  emit('select', prompt);
}
</script>

<style scoped>
.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gp-space-2);
  justify-content: center;
}

.prompt-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--gp-space-1);
  /* Min touch target */
  min-height: 36px;
  padding: var(--gp-space-2) var(--gp-space-3);
  font-family: var(--gp-font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--gp-text);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  cursor: pointer;
  transition:
    background var(--gp-transition),
    border-color var(--gp-transition),
    color var(--gp-transition),
    transform var(--gp-transition);
}

.prompt-chip:hover:not(:disabled) {
  background: var(--gp-surface-hover);
  border-color: var(--gp-accent);
  color: var(--gp-accent);
}

.prompt-chip:active:not(:disabled) {
  transform: translateY(1px);
}

.prompt-chip:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
  border-color: var(--gp-accent);
}

.prompt-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prompt-chip-icon {
  flex-shrink: 0;
  color: var(--gp-accent);
  opacity: 0.7;
  transition: transform var(--gp-transition);
}

.prompt-chip:hover:not(:disabled) .prompt-chip-icon {
  transform: translateX(2px);
  opacity: 1;
}

.prompt-chip-text {
  text-align: left;
}

/* Respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .prompt-chip,
  .prompt-chip-icon {
    transition: none;
  }
  .prompt-chip:active:not(:disabled) {
    transform: none;
  }
}
</style>
