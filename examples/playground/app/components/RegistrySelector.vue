<template>
  <div class="registry-selector">
    <label :for="`registry-select-${id}`">
      Registry
    </label>
    <div class="registry-select-wrapper">
      <select
        :id="`registry-select-${id}`"
        :value="modelValue"
        class="registry-select"
        @change="onChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">
          Select a registry...
        </option>
        <option
          v-for="registry in registries"
          :key="registry.id"
          :value="registry.id"
        >
          {{ registry.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Props for RegistrySelector.
 */
const props = defineProps<{
  /** Currently selected registry ID. */
  modelValue: string;
  /** Server base URL (for fetching registries). */
  serverUrl: string;
}>();

/**
 * Emitted when a registry is selected.
 */
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const id = Math.random().toString(36).slice(2, 8);
const registries = ref<
  Array<{ id: string; label: string }>
>([]);

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Fetch available registries from the server.
 */
async function fetchRegistries(): Promise<void> {
  try {
    const url = props.serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/api/registries';
    const response = await fetch(url);
    if (!response.ok) return;

    const data = await response.json() as {
      registries: Array<{ id: string; framework: string; version: string }>;
    };

    registries.value = data.registries.map((reg) => ({
      id: reg.id,
      label: `${reg.framework} (v${reg.version})`,
    }));
  } catch {
    // Silently fail — endpoint may not be available yet
  }
}

onMounted(() => {
  fetchRegistries();
  // Refresh every 10s to pick up new registries
  refreshTimer = setInterval(fetchRegistries, 10000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

function onChange(value: string): void {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.registry-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.registry-selector label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--gp-text);
}

.registry-select {
  width: 100%;
  padding: 6px 8px;
  font-size: 0.8125rem;
  font-family: var(--gp-font-family);
  color: var(--gp-text);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  cursor: pointer;
  transition: border-color 150ms ease;
}

.registry-select:hover {
  border-color: color-mix(in srgb, var(--gp-accent) 50%, var(--gp-border));
}

.registry-select:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}
</style>
