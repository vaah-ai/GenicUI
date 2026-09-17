<template>
  <div class="filter-chips" :data-component="FilterChips" data-test="filter-chips">
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="filter-chip"
      :class="{ 'filter-chip--active': chip.active }"
      :data-test="`filter-chip-${chip.id}`"
      :aria-pressed="chip.active ? 'true' : 'false'"
      @click="onToggle(chip.id)"
    >
      {{ chip.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * FilterChips — pill row for filter state. Re-emits `filter-changed`
 * with the new active-set when any chip is toggled.
 *
 * Pure props-in component. The agent applies the filter and re-mounts
 * via `update_component` (EJG-COMP-1).
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-1} — same componentId round-trip (no remount)
 * @see {EJG-LAYOUT-1} — three-layer rule
 */

interface FilterChip {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
}

interface Props {
  /** Chip definitions — `{id, label, active}`. Order is preserved. */
  filters: readonly FilterChip[];
}

const props = defineProps<Props>();

const FilterChips = 'FilterChips';

const emit = defineEmits<{
  (e: 'filter-changed', payload: { id: string; active: boolean; activeIds: readonly string[] }): void;
}>();

const chips = computed<readonly FilterChip[]>(() => props.filters);

function onToggle(id: string): void {
  const target = chips.value.find((c) => c.id === id);
  if (!target) return;
  const nextActive = !target.active;
  const activeIds = chips.value
    .filter((c) => (c.id === id ? nextActive : c.active))
    .map((c) => c.id);
  emit('filter-changed', { id, active: nextActive, activeIds });
}
</script>

<script lang="ts">
import { computed } from 'vue';
</script>

<style scoped>
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  appearance: none;
  font: inherit;
  font-size: 0.8125rem;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--gp-border);
  background: var(--gp-surface);
  color: var(--gp-text-secondary);
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;
}

.filter-chip:hover {
  background: var(--gp-surface-hover);
}

.filter-chip--active {
  background: var(--gp-accent);
  color: var(--gp-accent-on, #fff);
  border-color: var(--gp-accent);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}
</style>