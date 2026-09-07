<template>
  <div class="registry-selector">
    <label :for="selectId">Registry</label>
    <div class="registry-select-wrapper">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="loading"
        class="registry-select"
        :aria-busy="loading"
        @change="onChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>
          {{ loading ? 'Loading…' : error ? 'Unable to load' : placeholder }}
        </option>
        <option
          v-for="registry in registries"
          :key="registry.id"
          :value="registry.id"
        >
          {{ registry.label }}
        </option>
      </select>
      <svg
        class="registry-select-chevron"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
    <span v-if="error" class="registry-error" role="alert">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Currently selected registry ID. */
    modelValue: string;
    /** Server base URL (for fetching registries). */
    serverUrl: string;
    /** Placeholder shown when no registry is selected. */
    placeholder?: string;
  }>(),
  {
    placeholder: 'Select a registry…',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// Deterministic, stable id derived from props
const selectId = computed(
  () => `registry-select-${props.serverUrl.replace(/[^a-z0-9]/gi, '').slice(-8) || 'default'}`,
);

const registries = ref<Array<{ id: string; label: string }>>([]);
const loading = ref(false);
const error = ref<string | null>(null);

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshDelay = 10000;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetch available registries from the server.
 * Implements exponential backoff on failure (10s → 20s → 40s, max 60s).
 */
async function fetchRegistries(): Promise<void> {
  try {
    loading.value = true;
    const url =
      props.serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/api/registries';
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      registries: Array<{ id: string; framework: string; version: string }>;
    };

    registries.value = data.registries.map((reg) => ({
      id: reg.id,
      label: `${reg.framework} (v${reg.version})`,
    }));
    error.value = null;
    refreshDelay = 10000; // Reset backoff on success
  } catch (err) {
    error.value =
      err instanceof Error
        ? `Could not reach ${props.serverUrl}`
        : 'Could not load registries';
    // Exponential backoff with cap
    refreshDelay = Math.min(refreshDelay * 2, 60000);
  } finally {
    loading.value = false;
  }
}

function scheduleNext(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchRegistries, refreshDelay);
}

onMounted(() => {
  fetchRegistries().then(scheduleNext);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (backoffTimer) clearTimeout(backoffTimer);
});

function onChange(value: string): void {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.registry-selector {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.registry-selector label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
}

.registry-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.registry-select {
  width: 100%;
  /* Min height for touch target (44px) */
  min-height: 36px;
  padding: var(--gp-space-2) var(--gp-space-6) var(--gp-space-2) var(--gp-space-3);
  font-size: 0.8125rem;
  font-family: var(--gp-font-mono);
  color: var(--gp-text);
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  cursor: pointer;
  transition: border-color var(--gp-transition), box-shadow var(--gp-transition);
  appearance: none;
  -webkit-appearance: none;
}

.registry-select:hover:not(:disabled) {
  border-color: var(--gp-border-light);
}

.registry-select:focus-visible {
  outline: none;
  border-color: var(--gp-accent);
  box-shadow: 0 0 0 2px var(--gp-accent-subtle);
}

.registry-select:disabled {
  opacity: 0.6;
  cursor: wait;
}

.registry-select-chevron {
  position: absolute;
  right: var(--gp-space-2);
  pointer-events: none;
  color: var(--gp-text-muted);
}

.registry-error {
  font-size: 0.6875rem;
  color: var(--gp-error-text);
  margin-top: var(--gp-space-1);
}
</style>
