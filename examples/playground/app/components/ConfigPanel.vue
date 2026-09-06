<template>
  <aside class="config-panel" aria-label="Configuration">
    <!-- Error Message with inline retry -->
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
        aria-hidden="true"
        class="error-message-icon"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span class="error-message-text">{{ errorMessage }}</span>
      <button
        type="button"
        class="error-message-retry"
        aria-label="Retry connection"
        @click="handleConnect"
      >
        Retry
      </button>
    </div>

    <!-- WebSocket URL -->
    <div class="config-section">
      <label for="ws-url">Server</label>
      <InputText
        id="ws-url"
        v-model="wsUrl"
        placeholder="ws://localhost:3041/ws"
        :disabled="wsState === 'connecting'"
        aria-describedby="ws-url-help"
      />
      <span id="ws-url-help" class="config-help">
        GenicUI server WebSocket endpoint
      </span>
    </div>

    <!-- Provider config (replaces the legacy API Key field; see Sub-task B) -->
    <ProviderConfig />

    <!-- Connect / Disconnect (single-purpose: open/close the WebSocket only;
         registries refresh is triggered automatically once ws becomes connected) -->
    <div class="socket-buttons" aria-label="Socket connection">
      <Button
        v-if="wsState === 'connecting'"
        label="Connecting…"
        icon="pi pi-spin pi-spinner"
        severity="secondary"
        disabled
      />
      <Button
        v-else-if="wsState === 'error'"
        label="Retry connection"
        icon="pi pi-refresh"
        severity="warning"
        @click="handleConnect"
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

    <!-- Messages counter -->
    <div v-if="messageCount > 0" class="messages-counter">
      Messages received: {{ messageCount }}
    </div>

    <Divider class="config-divider" />

    <!-- Registry Selector -->
    <div class="config-section">
      <RegistrySelector
        :model-value="selectedId"
        :server-url="wsUrl"
        @update:model-value="handleRegistryChange"
      />
    </div>

    <Divider class="config-divider" />

    <!-- Components List -->
    <div class="components-section">
      <h3>
        Components
        <span class="badge" aria-label="component count">{{ components.length }}</span>
      </h3>
      <div
        v-for="comp in components"
        :key="comp.componentId"
        class="component-list-item"
      >
        <div class="component-list-item-name">{{ comp.name }}</div>
        <div class="component-list-item-id">{{ comp.componentId }}</div>
      </div>
      <div v-if="components.length === 0" class="components-empty">
        No components yet
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import RegistrySelector from './RegistrySelector.vue';
import ProviderConfig from './ProviderConfig.vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useComponents } from '~/composables/useComponents.ts';
import { useChat } from '~/composables/useChat.ts';
import { useRegistries } from '~/composables/useRegistries.ts';

const wsUrl = ref('ws://localhost:3041/ws');

const ws = useWebSocket();
const { components, subscribe } = useComponents();
const chat = useChat();
const registries = useRegistries();

const wsState = ws.state;
const messageCount = ws.messageCount;
const errorMessage = ws.errorMsg;
const selectedId = registries.selectedId;

let unsubscribe: () => void = () => {};
onMounted(() => {
  unsubscribe = subscribe(ws);

  ws.onMessage((frame) => {
    if (frame.channel === '__chat__') {
      if (frame.type === 'chat.response') {
        chat.handleResponse(frame);
      } else if (frame.type === 'chat.event') {
        chat.handleEvent(frame);
      } else if (frame.type === 'chat.complete') {
        chat.handleComplete(frame);
      } else if (frame.type === 'chat.error') {
        chat.handleError();
      }
    }
  });
});
onUnmounted(() => {
  unsubscribe();
});

/**
 * Single-purpose Connect action: opens the WebSocket and nothing else.
 * Registries are auto-loaded via the watch below once the socket reports
 * `connected`. This keeps the Socket connection button decoupled from
 * data refresh concerns — the registry dropdown manages its own state.
 */
async function handleConnect(): Promise<void> {
  // apiKey removed (Sub-task B); dev mode allows anonymous WS upgrades.
  await ws.connect(wsUrl.value, null);
}

/**
 * Disconnect closes the socket, clears chat history, and resets the
 * selected registry so a fresh connect yields a clean slate.
 */
function handleDisconnect(): void {
  ws.disconnect();
  chat.clear();
  registries.select('');
}

function handleRegistryChange(value: string): void {
  registries.select(value);
}

/**
 * Watch the WebSocket connection state. When it transitions to `connected`
 * from any other state (initial connect or reconnect), fetch the registry
 * list from the (potentially new) server URL. This is the only place
 * `useRegistries.load()` is triggered from this component — the button
 * itself is single-purpose.
 */
watch(wsState, async (newState, oldState) => {
  if (newState === 'connected' && oldState !== 'connected') {
    await registries.load(wsUrl.value);
  }
});
</script>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-3);
  padding: var(--gp-space-3);
  overflow-y: auto;
  min-height: 0;
}

/* ---------- Error message with retry ---------- */
.error-message {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) var(--gp-space-3);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--gp-radius);
  font-size: 0.75rem;
  color: var(--gp-error-text);
  animation: error-shake var(--gp-transition) ease-out;
}

.error-message-icon {
  flex-shrink: 0;
  color: var(--gp-error-text);
}

.error-message-text {
  flex: 1 1 auto;
  word-break: break-word;
}

.error-message-retry {
  flex-shrink: 0;
  padding: 4px 10px;
  min-height: 28px;
  font-family: var(--gp-font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gp-error-text);
  background: transparent;
  border: 1px solid currentColor;
  border-radius: var(--gp-radius-sm);
  cursor: pointer;
  transition: background var(--gp-transition);
}

.error-message-retry:hover {
  background: rgba(239, 68, 68, 0.15);
}

.error-message-retry:focus-visible {
  outline: 2px solid var(--gp-error-text);
  outline-offset: 2px;
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@media (prefers-reduced-motion: reduce) {
  .error-message {
    animation: none;
  }
}

/* ---------- Sections ---------- */
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

.config-label-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--gp-text-muted);
  margin-left: 4px;
}

.config-help {
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  font-style: italic;
}

.config-divider {
  margin: var(--gp-space-1) 0;
}

.messages-counter {
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  text-align: center;
  padding: var(--gp-space-1) var(--gp-space-2);
  background: var(--gp-bg);
  border-radius: var(--gp-radius-sm);
  font-variant-numeric: tabular-nums;
}

/* ---------- Components list ---------- */
.components-section h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 var(--gp-space-2) 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--gp-accent);
  background: var(--gp-accent-subtle);
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.component-list-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gp-space-2) var(--gp-space-3);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm);
  margin-bottom: var(--gp-space-1);
}

.component-list-item-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gp-text);
}

.component-list-item-id {
  font-family: var(--gp-font-mono);
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
}

.components-empty {
  font-size: 0.75rem;
  color: var(--gp-text-muted);
  text-align: center;
  padding: var(--gp-space-3);
  font-style: italic;
}
</style>
