<template>
  <aside class="chat-panel" aria-label="Chat history">
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
      <ChatHistory :messages="history" :loading="isLoading" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useChat } from '~/composables/useChat.ts';
import ChatHistory from './ChatHistory.vue';

const { history, isLoading, clear } = useChat();

function handleClear(): void {
  clear();
}
</script>
