<template>
  <aside :id="panelId" class="chat-panel" aria-label="Chat history">
    <div class="chat-panel-header">
      <div class="chat-panel-title">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          style="color: var(--gp-accent)"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h2>Chat</h2>
        <span v-if="history.length > 0" class="chat-panel-count" aria-label="messages">
          {{ history.length }}
        </span>
      </div>
      <button
        v-if="history.length > 0"
        type="button"
        class="chat-clear-btn"
        aria-label="Clear chat history"
        @click="handleClear"
      >
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
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
        <span>Clear</span>
      </button>
    </div>

    <div class="chat-panel-body">
      <ChatHistory class="chat-panel-history" :messages="history" :loading="isLoading" />
      <ChatInput class="chat-panel-input" @submit="handleSubmit" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useChat } from '~/composables/useChat.ts';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useRegistries } from '~/composables/useRegistries.ts';
import { useProviders } from '~/composables/useProviders.ts';
import ChatHistory from './ChatHistory.vue';
import ChatInput from './ChatInput.vue';

/**
 * F43: `panelId` is the DOM id for the skip-link target. Defaults
 * to `'chat-panel'`; the playground passes `'chat-panel-main'` from
 * `app.vue` so its skip-to-content link points at the live chat
 * surface (previously this pointed at the removed `RenderSurface`).
 */
const props = withDefaults(
  defineProps<{ panelId?: string }>(),
  { panelId: 'chat-panel' },
);

const { history, isLoading, clear, sendMessage } = useChat();
const ws = useWebSocket();
const registries = useRegistries();
const providers = useProviders();

function handleClear(): void {
  clear();
}

/**
 * Submit handler for the prompt bar.
 *
 * Mirrors `RenderSurface.handlePromptSelect` verbatim — reads the
 * currently selected registry id + the active provider wire payload
 * and forwards both to `chat.sendMessage`. The chat composable then
 * emits a `chat.message` frame on the `__chat__` channel which the
 * server's `chat-handler` spawns a provider CLI for (or echoes back
 * when no provider is configured).
 */
function handleSubmit(prompt: string): void {
  const reg = registries.selected();
  const providerPayload = providers.getWirePayload();
  sendMessage(prompt, ws, reg?.id, providerPayload);
}
</script>

<style scoped>
.chat-panel-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.chat-panel-history {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.chat-panel-input {
  flex: 0 0 auto;
}
</style>
