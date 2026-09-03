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
      <!-- Spinner while connecting -->
      <svg
        v-if="wsState === 'connecting'"
        class="status-spinner"
        viewBox="0 0 24 24"
        width="14"
        height="14"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-dasharray="40 60"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ wsStateLabel }}</span>
      <span v-if="session" style="opacity: 0.6">
        · {{ session }}
      </span>
      <span v-if="wsState === 'connecting'" style="opacity: 0.6">
        (attempt {{ retryCount }})
      </span>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message" role="alert">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ errorMessage }}</span>
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
        :disabled="wsState === 'connecting'"
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
        :disabled="wsState === 'connecting'"
      />
    </div>

    <!-- Connect / Disconnect -->
    <div style="margin-top: var(--gp-space-2);">
      <Button
        v-if="wsState === 'connecting'"
        label="Connecting…"
        icon="pi pi-spin pi-spinner"
        severity="secondary"
        disabled
      />
      <Button
        v-else-if="wsState !== 'connected'"
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

    <!-- Registry Selector -->
    <div class="config-section">
      <RegistrySelector
        v-model="selectedRegistry"
        :server-url="wsUrl"
      />
    </div>

    <!-- Prompt Chips -->
    <div v-if="examplePrompts.length > 0" class="prompts-section">
      <h3>Try a Prompt</h3>
      <PromptChips
        :prompts="examplePrompts"
        @select="handlePromptSelect"
      />
    </div>

    <!-- Chat History -->
    <div v-if="chatHistory.length > 0 || chatLoading" class="chat-section">
      <h3>Chat</h3>
      <ChatHistory
        :messages="chatHistory"
        :loading="chatLoading"
      />
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import PromptChips from './PromptChips.vue';
import ChatHistory from './ChatHistory.vue';
import RegistrySelector from './RegistrySelector.vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useComponents } from '~/composables/useComponents.ts';
import { useChat } from '~/composables/useChat.ts';

const wsUrl = ref('ws://localhost:3040/ws');
const apiKey = ref('');
const selectedRegistry = ref('');

const ws = useWebSocket();
const { components, subscribe } = useComponents();
const chat = useChat();

const wsState = ws.state;
const session = ws.sessionId;
const messageCount = ws.messageCount;
const errorMessage = ws.errorMsg;
const retryCount = ws.retryCount;

const chatHistory = chat.history;
const chatLoading = chat.isLoading;

// Example prompts derived from the selected registry or default set
const examplePrompts = ref<string[]>([
  'Show me a data table with orders',
  'Create a data table with users and their status',
  'Build a data table with products, prices, and categories',
  'Display a data table of employees with department and role',
  'Show a data table with inventory items and stock levels',
]);

/**
 * Human-readable label for the connection state.
 */
const wsStateLabel = computed(() => {
  switch (wsState.value) {
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Connected';
    case 'error':
      return 'Connection failed';
    default:
      return 'Disconnected';
  }
});

// Subscribe to WebSocket messages
let unsubscribe: () => void = () => {};
onMounted(() => {
  unsubscribe = subscribe(ws);

  // Subscribe to chat responses
  ws.onMessage((frame) => {
    if (frame.channel === '__chat__') {
      if (frame.type === 'chat.response') {
        chat.handleResponse(frame);
      } else if (frame.type === 'chat.error') {
        chat.handleError();
      }
    }
  });
});
onUnmounted(() => {
  unsubscribe();
});

async function handleConnect(): Promise<void> {
  await ws.connect(wsUrl.value, apiKey.value || null);
}

function handleDisconnect(): void {
  ws.disconnect();
  chat.clear();
}

/**
 * Handle prompt chip click — send the prompt through WebSocket.
 */
function handlePromptSelect(prompt: string): void {
  chat.sendMessage(prompt, ws, selectedRegistry.value || undefined);
}
</script>

<style scoped>
.prompts-section {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
  margin-top: var(--gp-space-2);
}

.prompts-section h3 {
  font-size: 0.8125rem;
  font-weight: 600;
  margin: 0;
  color: var(--gp-text);
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
  margin-top: var(--gp-space-2);
}

.chat-section h3 {
  font-size: 0.8125rem;
  font-weight: 600;
  margin: 0;
  color: var(--gp-text);
}
</style>
