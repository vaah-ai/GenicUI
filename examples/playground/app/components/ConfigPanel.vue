<template>
  <div class="config-panel">
    <!-- Header -->
    <div>
      <h2 style="margin: 0 0 0.5rem; font-size: 1.25rem;">
        GenicUI Playground
      </h2>
      <p style="margin: 0; font-size: 0.875rem; color: var(--text-color-secondary)">
        Connect to the GenicUI server to render components.
      </p>
    </div>

    <!-- Connection Status -->
    <div
      class="connection-status"
      :class="wsState"
    >
      <span>{{ wsState }}</span>
      <span v-if="session">({{ session }})</span>
    </div>

    <!-- Configuration -->
    <div>
      <label for="ws-url" style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600;">
        WebSocket URL
      </label>
      <InputText
        id="ws-url"
        v-model="wsUrl"
        placeholder="ws://localhost:3040/ws"
      />
    </div>

    <div>
      <label for="api-key" style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600;">
        API Key (optional)
      </label>
      <InputText
        id="api-key"
        v-model="apiKey"
        type="password"
        placeholder="gnc_live_..."
      />
    </div>

    <!-- Connect / Disconnect -->
    <Button
      v-if="wsState !== 'connected'"
      label="Connect"
      @click="handleConnect"
    />
    <Button
      v-else
      label="Disconnect"
      severity="secondary"
      @click="handleDisconnect"
    />

    <!-- Messages -->
    <div v-if="messageCount > 0" style="font-size: 0.75rem; color: var(--text-color-secondary);">
      Messages received: {{ messageCount }}
    </div>

    <!-- Divider -->
    <Divider />

    <!-- Components list -->
    <div>
      <h3 style="margin: 0 0 0.5rem; font-size: 0.875rem; font-weight: 600;">
        Components ({{ components.length }})
      </h3>
      <div
        v-for="comp in components"
        :key="comp.componentId"
        class="component-card"
        style="padding: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem;"
      >
        <div style="font-weight: 600;">{{ comp.name }}</div>
        <div style="color: var(--text-color-secondary);">
          {{ comp.componentId }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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
