<template>
  <div class="prompt-chips">
    <div
      v-for="(prompt, index) in prompts"
      :key="index"
      class="prompt-chip"
      role="button"
      tabindex="0"
      :aria-label="`Send prompt: ${prompt}`"
      @click="onSelect(prompt)"
      @keydown.enter="onSelect(prompt)"
      @keydown.space.prevent="onSelect(prompt)"
    >
      {{ prompt }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PromptChips — renders clickable chips for example prompts.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

/**
 * Props for PromptChips.
 */
defineProps<{
  /** Array of example prompt texts. */
  prompts: string[];
}>();

/**
 * Emitted when a prompt chip is clicked.
 */
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
  gap: var(--gp-space-1);
}

.prompt-chip {
  display: inline-block;
  padding: var(--gp-space-1) var(--gp-space-2);
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--gp-accent);
  background: color-mix(in srgb, var(--gp-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--gp-accent) 30%, transparent);
  border-radius: var(--gp-radius);
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
  user-select: none;
}

.prompt-chip:hover {
  background: color-mix(in srgb, var(--gp-accent) 20%, transparent);
  border-color: color-mix(in srgb, var(--gp-accent) 50%, transparent);
}

.prompt-chip:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}
</style>
