<template>
  <div class="render-surface">
    <!-- Empty state when no components -->
    <EmptyState v-if="components.length === 0" />

    <!-- Component cards -->
    <div
      v-for="comp in components"
      :key="comp.componentId"
      class="component-card"
    >
      <!-- Component header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-weight: 600;">{{ comp.name }}</span>
        <span style="font-size: 0.75rem; color: var(--text-color-secondary);">
          {{ comp.componentId }}
        </span>
      </div>

      <!-- Component props preview -->
      <div style="font-size: 0.75rem; background: var(--surface-ground); padding: 0.5rem; border-radius: 4px; overflow: auto; max-height: 300px;">
        <pre style="margin: 0; font-size: 0.7rem; white-space: pre-wrap;">{{ JSON.stringify(comp.props, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponents } from '~/composables/useComponents.ts';

const { components } = useComponents();
</script>
