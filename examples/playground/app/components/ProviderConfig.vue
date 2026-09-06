<template>
  <div class="provider-config">
    <!-- Providers dropdown -->
    <div class="config-section">
      <label :for="providerSelectId">Provider</label>
      <div class="provider-select-wrapper">
        <select
          :id="providerSelectId"
          :value="selectedId"
          class="provider-select"
          @change="onProviderChange(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="provider in providers"
            :key="provider.id"
            :value="provider.id"
            :disabled="provider.disabled"
          >
            {{ provider.label }}
            <template v-if="provider.disabled"> (coming soon)</template>
          </option>
        </select>
        <svg
          class="provider-select-chevron"
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
      <span v-if="selected.description" class="config-help">
        {{ selected.description }}
      </span>
    </div>

    <!-- Dynamic config fields for the selected provider -->
    <div
      v-for="field in selected.configFields"
      :key="field.key"
      class="config-section"
    >
      <label :for="fieldId(field.key)">{{ field.label }}</label>
      <InputText
        :id="fieldId(field.key)"
        :model-value="configValues[field.key]"
        :placeholder="field.placeholder"
        @update:model-value="(value: string) => onFieldChange(field.key, value)"
      />
      <span v-if="field.help" class="config-help">{{ field.help }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InputText from 'primevue/inputtext';
import { PROVIDERS } from '../providers/registry.js';
import { useProviders } from '../composables/useProviders.js';
import type { ProviderDescriptor } from '../providers/types.js';

const providersStore = useProviders();
const selectedId = providersStore.selectedProviderId;
const configValues = computed<Record<string, string>>(() => providersStore.getConfig());

const selected = computed<ProviderDescriptor>(() => providersStore.getSelected());
const providers = PROVIDERS;

const providerSelectId = computed(
  () => `provider-select-${selectedId.value}`,
);

function fieldId(key: string): string {
  return `provider-${selectedId.value}-${key}`;
}

function onProviderChange(value: string): void {
  providersStore.select(value);
}

function onFieldChange(key: string, value: string): void {
  providersStore.setConfigField(key, value);
}
</script>

<style scoped>
.provider-config {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-3);
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.config-section label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
}

.config-help {
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  font-style: italic;
}

.provider-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.provider-select {
  width: 100%;
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

.provider-select:hover {
  border-color: var(--gp-border-light);
}

.provider-select:focus-visible {
  outline: none;
  border-color: var(--gp-accent);
  box-shadow: 0 0 0 2px var(--gp-accent-subtle);
}

.provider-select-chevron {
  position: absolute;
  right: var(--gp-space-2);
  pointer-events: none;
  color: var(--gp-text-muted);
}
</style>
