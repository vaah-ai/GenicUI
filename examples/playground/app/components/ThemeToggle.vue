<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="ariaLabel"
    :title="title"
    @click="toggle"
  >
    <!-- Icon reflects the resolved theme so the user sees what they're ON,
         not what they're about to cycle to. The label text confirms. -->
    <svg
      v-if="resolved === 'dark'"
      class="theme-toggle-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
    <svg
      v-else
      class="theme-toggle-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
    <span class="theme-toggle-label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * ThemeToggle — three-state cycle button (system → light → dark → system).
 *
 * Sits in the topbar next to the connection-status badge and flips the
 * playground between light and dark modes via `useColorMode`. The icon
 * shows the *resolved* mode (what the user is seeing) while the label
 * names the *next* mode (what clicking will do). aria-label combines
 * both for screen readers.
 *
 * 44×44 minimum touch target, focus ring uses `--gp-accent`, color
 * stays `currentColor` so the button adapts to the surrounding topbar
 * automatically.
 */
import { computed } from 'vue';
import { useColorMode } from '~/composables/useColorMode.ts';

const { mode, resolved, toggle } = useColorMode();

const label = computed(() => {
  switch (mode.value) {
    case 'system':
      return 'System';
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
  }
});

const ariaLabel = computed(() => {
  const current = mode.value === 'system'
    ? `System (currently ${resolved.value})`
    : label.value;
  const next = mode.value === 'system'
    ? 'Light'
    : mode.value === 'light'
      ? 'Dark'
      : 'System';
  return `Theme: ${current}. Click to switch to ${next}.`;
});

const title = computed(() => ariaLabel.value);
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--gp-space-2);
  height: 36px;
  min-width: 44px;
  padding: 0 var(--gp-space-3);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  color: var(--gp-text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--gp-transition),
    color var(--gp-transition),
    border-color var(--gp-transition);
}

.theme-toggle:hover {
  background: var(--gp-surface-hover);
  color: var(--gp-text);
  border-color: var(--gp-border-light);
}

.theme-toggle:focus-visible {
  outline: none;
  border-color: var(--gp-accent);
  box-shadow: 0 0 0 2px var(--gp-accent-subtle);
}

.theme-toggle-icon {
  flex-shrink: 0;
}

.theme-toggle-label {
  /* In narrow topbars the label can disappear gracefully */
  white-space: nowrap;
}

@media (max-width: 640px) {
  .theme-toggle-label {
    display: none;
  }
}
</style>
