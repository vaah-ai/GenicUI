<template>
  <div
    class="chat-history"
    ref="containerRef"
    role="log"
    aria-live="polite"
    aria-label="Chat conversation history"
  >
    <div
      v-if="messages.length === 0 && !loading"
      class="chat-history-empty"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span>No messages yet. Click a prompt to start.</span>
    </div>

    <article
      v-for="(msg, index) in messages"
      :key="index"
      class="chat-message"
    >
      <!-- User prompt -->
      <div class="chat-bubble chat-bubble-user">
        <div class="chat-bubble-meta">
          <span class="chat-role-badge user" aria-label="User message">You</span>
          <time class="chat-timestamp" :datetime="msg.timestamp">
            {{ formatTime(msg.timestamp) }}
          </time>
        </div>
        <p class="chat-text">{{ msg.prompt }}</p>
      </div>

      <!-- LLM response (or pending) -->
      <div class="chat-bubble chat-bubble-assistant" :class="assistantClass(msg)">
        <div class="chat-bubble-meta">
          <span class="chat-role-badge assistant" aria-label="Assistant response">
            Assistant
          </span>
        </div>
        <p v-if="msg.response" class="chat-text" v-html="formatResponse(msg.response)" />
        <div
          v-else-if="msg.status === 'streaming'"
          class="chat-pending"
          aria-label="Streaming response"
        >
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
        </div>
        <div
          v-else
          class="chat-pending"
          aria-label="Awaiting response"
        >
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
        </div>
      </div>
    </article>

    <!-- Loading indicator (visible only when no pending message yet) -->
    <div v-if="loading && !hasPending" class="chat-loading" role="status">
      <svg
        class="chat-loading-spinner"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
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
      <span>Connecting to agent…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';

/**
 * A single chat message shape — mirrors `useChat().history.value`.
 */
type ChatHistoryMessage = {
  prompt: string;
  response: string;
  timestamp: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
};

/**
 * Props for ChatHistory.
 */
const props = defineProps<{
  /** Array of chat messages. */
  messages: ChatHistoryMessage[];
  /** Whether the chat is currently processing. */
  loading: boolean;
}>();

// Auto-scroll container
const containerRef = ref<HTMLElement | null>(null);

const hasPending = computed(() =>
  props.messages.some((m) => !m.response || m.status === 'pending' || m.status === 'streaming'),
);

/**
 * Map an assistant status to a bubble class.
 */
function assistantClass(msg: ChatHistoryMessage): string {
  return `chat-bubble-${msg.status}`;
}

/**
 * Render the response text. Lines like `[calling render_component…]`
 * get a faint mono treatment so tool activity is visible without
 * dominating the chat log.
 */
function formatResponse(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\[([^\]]+)\]/g, '<span class="chat-meta-inline">[$1]</span>');
}

watch(
  () => [props.messages.length, props.messages[props.messages.length - 1]?.response],
  async () => {
    await nextTick();
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  },
  { deep: true },
);

/**
 * Format ISO timestamp to readable time.
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
</script>

<style scoped>
.chat-history {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-3);
  padding: var(--gp-space-3) var(--gp-space-4);
  /* No max-height here — let the parent panel-body scroll */
}

.chat-history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gp-space-2);
  padding: var(--gp-space-8) var(--gp-space-4);
  font-size: 0.8125rem;
  color: var(--gp-text-muted);
  text-align: center;
}

/* ----- Bubbles ----- */
.chat-message {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
}

.chat-bubble {
  padding: var(--gp-space-2) var(--gp-space-3);
  border-radius: var(--gp-radius-md);
  border: 1px solid var(--gp-border);
  background: var(--gp-bg);
  max-width: 100%;
  animation: bubble-enter var(--gp-transition) ease-out;
}

@keyframes bubble-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Distinguish user vs assistant visually */
.chat-bubble-user {
  background: var(--gp-accent-subtle);
  border-color: rgba(34, 197, 94, 0.25);
}

.chat-bubble-assistant {
  background: var(--gp-surface);
}

.chat-bubble-streaming {
  border-color: rgba(59, 130, 246, 0.35);
}

.chat-bubble-error {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.06);
}

.chat-meta-inline {
  font-family: var(--gp-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.85em;
  color: var(--gp-text-muted);
  background: rgba(99, 102, 241, 0.08);
  border-radius: 4px;
  padding: 1px 4px;
}

.chat-bubble-meta {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
  margin-bottom: var(--gp-space-1);
}

.chat-role-badge {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--gp-radius-sm);
  line-height: 1.4;
}

.chat-role-badge.user {
  color: var(--gp-accent);
  background: rgba(34, 197, 94, 0.18);
}

.chat-role-badge.assistant {
  color: var(--gp-text-secondary);
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
}

.chat-timestamp {
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  font-variant-numeric: tabular-nums;
}

.chat-text {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--gp-text);
  word-break: break-word;
  white-space: pre-wrap;
}

/* ----- Pending dots (assistant typing) ----- */
.chat-pending {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--gp-space-1) 0;
}

.chat-pending-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gp-text-muted);
  opacity: 0.4;
  animation: bounce-dot 1.2s ease-in-out infinite;
}

.chat-pending-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.chat-pending-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bounce-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-3px); opacity: 1; }
}

/* ----- Loading state ----- */
.chat-loading {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) var(--gp-space-3);
  font-size: 0.75rem;
  color: var(--gp-text-muted);
  font-style: italic;
}

.chat-loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Respect users who prefer less motion */
@media (prefers-reduced-motion: reduce) {
  .chat-bubble,
  .chat-loading-spinner,
  .chat-pending-dot {
    animation: none !important;
  }
}
</style>
