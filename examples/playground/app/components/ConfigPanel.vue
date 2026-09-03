<template>
  <div class="config-panel">
    <!-- Header -->
    <div class="panel-header">
      <h2>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="color: var(--gp-accent)"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        GenicUI Playground
      </h2>
      <p>Connect to a GenicUI server to render components live.</p>
    </div>

    <!-- Connection Status -->
    <div
      class="connection-status"
      :class="wsState"
      :aria-label="`Connection status: ${wsState}`"
    >
      <span>{{ wsState }}</span>
      <span v-if="session" style="opacity: 0.6">
        · {{ session }}
      </span>
    </div>

    <!-- WebSocket URL -->
    <div class="config-section">
      <label for="ws-url">
        WebSocket URL
      </label>
      <InputText
        id="ws-url"
        v-model="wsUrl"
        placeholder="ws://localhost:3040/ws"
        aria-describedby="ws-url-help"
      />
      <span id="ws-url-help" style="font-size: 0.6875rem; color: var(--gp-text-muted);">
        Address of your GenicUI server WebSocket endpoint
      </span>
    </div>

    <!-- API Key -->
    <div class="config-section">
      <label for="api-key">
        API Key <span style="opacity: 0.5; font-weight: 400; text-transform: none;">(optional)</span>
      </label>
      <InputText
        id="api-key"
        v-model="apiKey"
        type="password"
        placeholder="gnc_live_…"
      />
    </div>

    <!-- Connect / Disconnect -->
    <div style="margin-top: var(--gp-space-2);">
      <Button
        v-if="wsState !== 'connected'"
        label="Connect"
        icon="pi pi-link"
        @click="handleConnect"
      />
      <Button
        v-else
        label="Disconnect"
        icon="pi pi-unlink"
        severity="secondary"
        @click="handleDisconnect"
      />
    </div>

    <!-- Messages -->
    <div v-if="messageCount > 0" class="messages-counter">
      Messages received: {{ messageCount }}
    </div>

    <!-- Divider -->
    <Divider class="config-divider" />

    <!-- Components List -->
    <div class="components-section">
      <h3>
        Components
        <span class="badge">{{ components.length }}</span>
      </h3>
      <div
        v-for="comp in components"
        :key="comp.componentId"
        class="component-list-item"
      >
        <div class="component-list-item-name">{{ comp.name }}</div>
        <div class="component-list-item-id">{{ comp.componentId }}</div>
      </div>
      <div
        v-if="components.length === 0"
        style="font-size: 0.75rem; color: var(--gp-text-muted); font-style: italic;"
      >
        No components yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useComponents } from '~/composables/useComponents.ts';

const wsUrl = ref('ws://localhost:3040/ws');
const apiKey = ref('');

const ws = useWebSocket();
const { components, subscribe } = useComponents();

const wsState = ws.state;
const session = ws.sessionId;
const messageCount = ws.messageCount;

// Subscribe to WebSocket messages
let unsubscribe: () => void = () => {};
onMounted(() => {
  unsubscribe = subscribe(ws);
});
onUnmounted(() => {
  unsubscribe();
});

async function handleConnect(): Promise<void> {
  await ws.connect(wsUrl.value, apiKey.value || null);
}

function handleDisconnect(): void {
  ws.disconnect();
}
</script>
