<template>
  <div class="render-surface">
    <!-- Empty state when no components -->
    <EmptyState v-if="components.length === 0" />

    <!-- Component cards -->
    <div
      v-for="(comp, index) in components"
      :key="comp.componentId"
      class="component-card"
      :style="{ animationDelay: `${index * 50}ms` }"
    >
      <!-- Component header -->
      <div class="component-card-header">
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
            style="vertical-align: middle; margin-right: 6px; color: var(--gp-accent)"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          {{ comp.name }}
        </span>
        <span class="component-card-id">
          {{ comp.componentId }}
        </span>
      </div>

      <!-- Component props preview -->
      <div class="component-card-props">
        <pre>{{ JSON.stringify(comp.props, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponents } from '~/composables/useComponents.ts';

const { components } = useComponents();
</script>
