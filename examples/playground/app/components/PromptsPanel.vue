<template>
  <aside class="prompts-panel" aria-label="Suggested prompts">
    <header class="prompts-panel-header">
      <h2 class="prompts-panel-title">
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
          class="prompts-panel-title-icon"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        Suggested Prompts
      </h2>
      <p class="prompts-panel-help">
        Click any prompt to send it to the assistant.
      </p>
    </header>

    <!--
      Vertical list of clickable rows.
      Three sub-states:
        1. No registry selected → guidance message ("Select a registry
           in the sidebar to see its example prompts").
        2. Registry selected but no examplePrompts → muted message
           ("This registry has no example prompts").
        3. Registry with prompts → list of rows; each row is a
           native <button> for keyboard a11y.

      Click routes through `useChatInput().fillAndSubmit()` — same
      path the ChatHistory empty-state chips use, so the existing
      `ChatInput` watcher fires submit and clears the singleton.
    -->
    <ul
      v-if="prompts.length > 0"
      class="prompts-list"
      role="list"
    >
      <li
        v-for="(prompt, index) in prompts"
        :key="`${index}-${prompt}`"
        class="prompts-list-item"
      >
        <button
          type="button"
          class="prompts-list-row"
          :disabled="!isConnected"
          :aria-label="`Send prompt: ${prompt}`"
          @click="handleSelect(prompt)"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="prompts-list-icon"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="prompts-list-text">{{ prompt }}</span>
        </button>
      </li>
    </ul>

    <div v-else-if="!hasRegistry" class="prompts-panel-empty">
      <p>Select a registry in the sidebar to see its example prompts.</p>
    </div>

    <div v-else class="prompts-panel-empty">
      <p>This registry has no example prompts.</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useRegistries } from '~/composables/useRegistries.ts';
import { useChatInput } from '~/composables/useChatInput.ts';

/**
 * F43 — PromptsPanel: persistent middle-column list of registry
 * example prompts. Each row is a clickable button that fills the
 * chat input bar and submits (same flow as the empty-state chips).
 *
 * Why a separate column instead of relying on the chat empty state:
 * the user wanted quick access to prompts even after a conversation
 * has started, so the list is visible throughout the session —
 * independent of `useChat.history.length`.
 *
 * Reuses `useRegistries.examplePrompts()` (which already caps to 8
 * entries) so the visible list stays short and the panel scrolls
 * vertically without a viewport pinch on the 1200px+ layout.
 */
const ws = useWebSocket();
const registries = useRegistries();
const chatInput = useChatInput();

const prompts = computed<string[]>(() => registries.examplePrompts());
const hasRegistry = computed<boolean>(() => !!registries.selected());
const isConnected = computed<boolean>(() => ws.state.value === 'connected');

function handleSelect(prompt: string): void {
  chatInput.fillAndSubmit(prompt);
}
</script>

<style scoped>
.prompts-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-3);
  padding: var(--gp-space-4);
  border-right: 1px solid var(--gp-border);
  background: var(--gp-surface);
  overflow-y: auto;
  min-height: 0;
}

.prompts-panel-header {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
  padding-bottom: var(--gp-space-3);
  border-bottom: 1px solid var(--gp-border);
}

.prompts-panel-title {
  display: inline-flex;
  align-items: center;
  gap: var(--gp-space-2);
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-secondary);
}

.prompts-panel-title-icon {
  color: var(--gp-accent);
  opacity: 0.8;
  flex-shrink: 0;
}

.prompts-panel-help {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
}

.prompts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.prompts-list-item {
  margin: 0;
  padding: 0;
}

.prompts-list-row {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
  width: 100%;
  padding: var(--gp-space-2) var(--gp-space-3);
  font-family: var(--gp-font-sans);
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--gp-text);
  text-align: left;
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm);
  cursor: pointer;
  transition:
    background var(--gp-transition),
    border-color var(--gp-transition),
    color var(--gp-transition),
    transform var(--gp-transition);
  /* Min touch target height. */
  min-height: 36px;
}

.prompts-list-row:hover:not(:disabled) {
  background: var(--gp-surface-hover);
  border-color: var(--gp-accent);
  color: var(--gp-accent);
}

.prompts-list-row:active:not(:disabled) {
  transform: translateX(2px);
}

.prompts-list-row:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
  border-color: var(--gp-accent);
}

.prompts-list-row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prompts-list-icon {
  flex-shrink: 0;
  color: var(--gp-accent);
  opacity: 0.7;
  transition: transform var(--gp-transition), opacity var(--gp-transition);
}

.prompts-list-row:hover:not(:disabled) .prompts-list-icon {
  transform: translateX(2px);
  opacity: 1;
}

.prompts-list-text {
  flex: 1 1 auto;
  word-break: break-word;
}

.prompts-panel-empty {
  padding: var(--gp-space-3);
  border: 1px dashed var(--gp-border);
  border-radius: var(--gp-radius-sm);
  background: var(--gp-bg);
  font-size: 0.75rem;
  color: var(--gp-text-muted);
  text-align: center;
}

.prompts-panel-empty p {
  margin: 0;
  line-height: 1.4;
}

/* Respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .prompts-list-row,
  .prompts-list-icon {
    transition: none;
  }
  .prompts-list-row:active:not(:disabled) {
    transform: none;
  }
}
</style>
