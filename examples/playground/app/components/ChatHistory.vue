<template>
  <div class="chat-history" ref="containerRef">
    <div
      v-if="messages.length === 0"
      class="chat-history-empty"
    >
      <span>No messages yet. Click a prompt or start chatting.</span>
    </div>

    <div
      v-for="(msg, index) in messages"
      :key="index"
      class="chat-message"
    >
      <!-- User prompt -->
      <div class="chat-prompt">
        <span class="chat-role-badge user">You</span>
        <span class="chat-text">{{ msg.prompt }}</span>
      </div>

      <!-- LLM response -->
      <div class="chat-response">
        <span class="chat-role-badge assistant">LLM</span>
        <span class="chat-text">{{ msg.response }}</span>
      </div>

      <!-- Timestamp -->
      <div class="chat-timestamp">
        {{ formatTime(msg.timestamp) }}
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="chat-loading">
      <svg
        class="chat-loading-spinner"
        viewBox="0 0 24 24"
        width="16"
        height="16"
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
      <span>Processing...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

/**
 * Props for ChatHistory.
 */
const props = defineProps<{
  /** Array of chat messages. */
  messages: Array<{
    prompt: string;
    response: string;
    timestamp: string;
  }>;
  /** Whether the chat is currently processing. */
  loading: boolean;
}>();

// Auto-scroll container
const containerRef = ref<HTMLElement | null>(null);

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  },
);

/**
 * Format ISO timestamp to readable time.
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<style scoped>
.chat-history {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
  overflow-y: auto;
  max-height: 200px;
  padding-right: var(--gp-space-1);
}

.chat-history-empty {
  font-size: 0.75rem;
  color: var(--gp-text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--gp-space-2) 0;
}

.chat-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-prompt,
.chat-response {
  display: flex;
  gap: var(--gp-space-1);
  align-items: flex-start;
}

.chat-role-badge {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  line-height: 1.4;
}

.chat-role-badge.user {
  color: var(--gp-accent);
  background: color-mix(in srgb, var(--gp-accent) 15%, transparent);
}

.chat-role-badge.assistant {
  color: color-mix(in srgb, var(--gp-text) 70%, transparent);
  background: color-mix(in srgb, var(--gp-text) 10%, transparent);
}

.chat-text {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gp-text);
}

.chat-timestamp {
  font-size: 0.625rem;
  color: var(--gp-text-muted);
  margin-top: 2px;
  padding-left: calc(var(--gp-space-1) + 38px);
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: var(--gp-space-1);
  font-size: 0.75rem;
  color: var(--gp-text-muted);
}

.chat-loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
