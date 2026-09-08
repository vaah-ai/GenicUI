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
      <div class="chat-panel-actions">
        <!--
          F47-AC7: chat column debug toggle. Gates the diagnostic
          blocks (PROPS / INPUT / RESULT) inside every
          `ToolCallAccordion` so the chat reads as prose + interactive
          components only. State is URL-driven via `?debug=off`; the
          rewriter below keeps the address bar in sync so reloads and
          shared links preserve the choice.
        -->
        <label class="chat-debug-toggle" :aria-label="debugLabel">
          <span class="chat-debug-toggle-text">Debug</span>
          <button
            type="button"
            class="chat-debug-switch"
            :class="{ 'chat-debug-switch-on': isDebug }"
            role="switch"
            :aria-checked="isDebug"
            :aria-label="debugLabel"
            @click="toggleDebug"
          >
            <span class="chat-debug-switch-knob" aria-hidden="true" />
          </button>
        </label>
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
    </div>

    <div class="chat-panel-body">
      <ChatHistory class="chat-panel-history" :messages="history" :loading="isLoading" />
      <ChatInput class="chat-panel-input" @submit="handleSubmit" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useChat } from '~/composables/useChat.ts';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useRegistries } from '~/composables/useRegistries.ts';
import { useProviders } from '~/composables/useProviders.ts';
import { useDebugMode, __setUrlRewriter } from '~/composables/useDebugMode.ts';
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

/**
 * F47-AC7: chat column debug toggle. The composable's `isDebug` is
 * module-scoped (singleton), so every `ToolCallAccordion` reads the
 * same flag without prop-drilling. On mount we hydrate from the URL
 * via `initFromUrl()` and register a URL rewriter that updates
 * `?debug=off` when the user flips the switch.
 */
const { isDebug, setDebug, initFromUrl } = useDebugMode();

onMounted(() => {
  // Hydrate from the URL so deep-links like `?debug=off` take effect
  // before the first paint of `ToolCallAccordion`.
  initFromUrl();
  // Register the URL rewriter — keeps `?debug=off` in sync so reloads
  // and shared links preserve the choice. We touch `window.history`
  // directly so the back stack isn't polluted with one entry per flip.
  __setUrlRewriter((off) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (off) {
      url.searchParams.set('debug', 'off');
    } else {
      url.searchParams.delete('debug');
    }
    window.history.replaceState(window.history.state, '', url.toString());
  });
});

/**
 * Click handler for the inline switch — flips the flag and triggers
 * the URL rewriter registered above.
 */
function toggleDebug(): void {
  setDebug(!isDebug.value);
}

/**
 * Accessible label for the switch. Reads the current state so a
 * screen reader announces "Show debug panels (on)" / "Show debug
 * panels (off)" depending on the toggle's position.
 */
const debugLabel = computed<string>(() =>
  isDebug.value ? 'Hide debug panels' : 'Show debug panels',
);

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
/* F47-AC7: chat column actions row holds the Debug toggle and the
   Clear button. The two share the header right-edge and sit on the
   same baseline regardless of which one (or neither) is rendered. */
.chat-panel-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--gp-space-2);
}

.chat-debug-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--gp-space-1);
  cursor: pointer;
  user-select: none;
  font-size: 0.75rem;
  font-family: var(--gp-font-sans);
  color: var(--gp-text-secondary);
}

.chat-debug-toggle-text {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.chat-debug-switch {
  position: relative;
  width: 30px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid var(--gp-border);
  background: var(--gp-bg);
  padding: 0;
  cursor: pointer;
  transition: background var(--gp-transition), border-color var(--gp-transition);
}

.chat-debug-switch:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}

.chat-debug-switch-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--gp-text-muted);
  transition: transform var(--gp-transition), background var(--gp-transition);
}

.chat-debug-switch-on {
  background: var(--gp-success-bg-strong);
  border-color: var(--gp-success-border-strong);
}

.chat-debug-switch-on .chat-debug-switch-knob {
  transform: translateX(14px);
  background: var(--gp-accent);
}

@media (prefers-reduced-motion: reduce) {
  .chat-debug-switch,
  .chat-debug-switch-knob {
    transition: none;
  }
}

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
