<template>
  <div
    class="chat-history"
    ref="containerRef"
    role="log"
    aria-live="polite"
    aria-label="Chat conversation history"
  >
    <!--
      Empty state when no messages have been exchanged yet.
      Three sub-states:
        1. Prompt chips available (a registry is loaded) → show chips so
           the user can click-and-send one of the registry's example
           prompts. Disabled while disconnected so the WS layer rejects
           would-be sends cleanly.
        2. Otherwise → show the generic `EmptyState` placeholder, which
           nudges the user to start the server and connect.
      Chip click routes through `useChatInput().fillAndSubmit()` so the
      input bar's watcher picks it up, fires submit, and clears the
      singleton (see `useChatInput.ts`).
    -->
    <template v-if="messages.length === 0 && !loading">
      <PromptChips
        v-if="promptChips.length > 0"
        class="chat-history-chips"
        :prompts="promptChips"
        :disabled="!isConnected"
        @select="handleChipSelect"
      />
      <EmptyState v-else class="chat-history-empty-state" />
    </template>

    <article
      v-for="(msg, index) in messages"
      :key="index"
      class="chat-message"
    >
      <!-- User prompt (right-aligned bubble, accent-subtle background) -->
      <div class="chat-bubble chat-bubble-user">
        <div class="chat-bubble-meta">
          <span class="chat-role-badge user" aria-label="User message">You</span>
          <time class="chat-timestamp" :datetime="msg.timestamp">
            {{ formatTime(msg.timestamp) }}
          </time>
        </div>
        <p class="chat-text">{{ msg.prompt }}</p>
      </div>

      <!-- LLM response (left-aligned bubble) -->
      <div class="chat-bubble chat-bubble-assistant" :class="assistantClass(msg)">
        <div class="chat-bubble-meta">
          <span class="chat-role-badge assistant" aria-label="Assistant response">
            Assistant
          </span>
          <span v-if="msg.status === 'streaming'" class="chat-streaming-label">
            typing…
          </span>
        </div>
        <!-- Prose -->
        <p v-if="msg.response" class="chat-text" v-html="formatResponse(msg.response)" />
        <div
          v-else-if="msg.status === 'streaming' || msg.status === 'pending'"
          class="chat-pending"
          aria-label="Awaiting response"
        >
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
          <span class="chat-pending-dot" />
        </div>

        <!--
          F47-AC7: tool-call rendering switches between two surfaces
          depending on the chat column debug toggle.
            - Debug ON  → the full `<ToolCallAccordion>` (header +
                          props / input / result / error blocks).
            - Debug OFF → a compact one-line status pill (`✓ render_component`)
                          so the chat reads as prose + interactive
                          components only.
          The rendered component preview (CityPicker / WeatherCard)
          stays visible in both modes — it's NOT a tool-call card.
        -->
        <template v-for="(call, callIdx) in msg.toolCalls" :key="`${msg.timestamp}-tool-${callIdx}`">
          <ToolCallAccordion v-if="isDebug" class="chat-tool" :entry="call" />
          <div
            v-else
            class="chat-tool-pill"
            :class="`chat-tool-pill-${call.status}`"
            :aria-label="`Tool call ${call.name} (${call.status})`"
          >
            {{ formatCleanToolLabel(call.name, call.status) }}
          </div>
        </template>

        <!-- Error banner (when the assistant bubble ends in error state) -->
        <div v-if="msg.status === 'error'" class="chat-error-banner" role="status">
          The assistant turn ended with an error.
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
import ToolCallAccordion from './ToolCallAccordion.vue';
import EmptyState from './EmptyState.vue';
import PromptChips from './PromptChips.vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useRegistries } from '~/composables/useRegistries.ts';
import { useChatInput } from '~/composables/useChatInput.ts';
import { useDebugMode } from '~/composables/useDebugMode.ts';
import { formatCleanToolLabel } from './tool-call-gating.ts';

/**
 * Shape of a single chat message — mirrors `useChat().history.value`.
 * `toolCalls` is the new structured array (F43 follow-up); each entry
 * renders as its own `ToolCallAccordion` below the prose.
 */
type ToolCallStatus = 'running' | 'done' | 'error';

interface ToolCallEntry {
  id: string;
  name: string;
  input: unknown;
  result?: unknown;
  status: ToolCallStatus;
  startedAt: string;
  error?: string;
}

type ChatHistoryMessage = {
  prompt: string;
  response: string;
  timestamp: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  toolCalls: ToolCallEntry[];
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
 * WS connection state — drives the chips' `disabled` prop so the user
 * can't fire a prompt into a dead session.
 *
 * Mirrors `ChatInput.disabled` so the chips and the input bar present
 * the same affordance state.
 */
const ws = useWebSocket();
const isConnected = computed<boolean>(() => ws.state.value === 'connected');

/**
 * F47-AC7: chat column debug flag. Module-singleton so this view
 * shares the same toggle as `ChatPanel` and `ToolCallAccordion`.
 * When OFF, the full `<ToolCallAccordion>` is replaced by a
 * compact one-line status pill so the chat reads as prose +
 * interactive components only.
 */
const { isDebug } = useDebugMode();

/**
 * Prompt chips derived from the currently selected registry. When no
 * registry is selected (or it has no examplePrompts) the chips list is
 * empty and `EmptyState` is rendered instead.
 */
const registries = useRegistries();
const chatInput = useChatInput();
const promptChips = computed<string[]>(() => registries.examplePrompts());

/**
 * Forward a chip click into the singleton input bar so the existing
 * `useChatInput().submitRequested` watcher in `ChatInput` fires the
 * submit handler. No duplication of the submit pipeline.
 */
function handleChipSelect(prompt: string): void {
  chatInput.fillAndSubmit(prompt);
}

/**
 * Map an assistant status to a bubble class.
 */
function assistantClass(msg: ChatHistoryMessage): string {
  return `chat-bubble-${msg.status}`;
}

/**
 * Render the response prose with HTML escaping. The old `[calling …]`
 * inline annotations are gone — tool calls render as accordions
 * below the prose — so this is just plain escaped text with line
 * breaks preserved (pre-wrap on `.chat-text`).
 */
function formatResponse(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

watch(
  () => [props.messages.length, props.messages[props.messages.length - 1]?.response, props.messages[props.messages.length - 1]?.toolCalls.length],
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

/* Wrapper for the EmptyState placeholder inside the chat history. */
.chat-history-empty-state {
  margin-top: var(--gp-space-4);
}

/* Wrapper for the registry prompt chips in the empty-state slot. */
.chat-history-chips {
  margin: var(--gp-space-4) auto;
  max-width: 480px;
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
  /* Right-align within the column to match Claude Code parity. */
  align-self: flex-end;
  max-width: 88%;
}

.chat-bubble-assistant {
  background: var(--gp-surface);
  align-self: flex-start;
  max-width: 95%;
}

.chat-bubble-streaming {
  border-color: rgba(59, 130, 246, 0.35);
}

.chat-bubble-error {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.06);
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

.chat-streaming-label {
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  font-style: italic;
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

/* Tool-call accordion spacing inside the assistant bubble. */
.chat-tool {
  margin-top: var(--gp-space-2);
}
.chat-tool + .chat-tool {
  margin-top: var(--gp-space-1);
}

/*
 * F47-AC7: compact one-line status pill rendered in clean mode
 * (debug toggle OFF) instead of the full ToolCallAccordion. Reads
 * as inline prose so the chat column looks like a chat, not a
 * debug log.
 */
.chat-tool-pill {
  margin-top: var(--gp-space-1);
  font-family: var(--gp-font-mono);
  font-size: 0.6875rem;
  line-height: 1.4;
  letter-spacing: 0.01em;
  color: var(--gp-text-muted);
  opacity: 0.85;
}

.chat-tool-pill-running {
  color: var(--gp-accent);
  opacity: 1;
}

.chat-tool-pill-error {
  color: rgba(239, 68, 68, 0.95);
  opacity: 1;
}

.chat-error-banner {
  margin-top: var(--gp-space-2);
  padding: var(--gp-space-1) var(--gp-space-2);
  font-size: 0.75rem;
  color: rgba(239, 68, 68, 0.95);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--gp-radius-sm);
  background: rgba(239, 68, 68, 0.05);
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
