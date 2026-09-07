<template>
  <form
    class="chat-input"
    :aria-label="'Send a prompt'"
    @submit.prevent="handleSubmit"
  >
    <label class="chat-input-sr-only" for="chat-input-textarea">Prompt input</label>
    <textarea
      id="chat-input-textarea"
      ref="textareaRef"
      v-model="draft"
      class="chat-input-textarea"
      :placeholder="placeholderText"
      rows="1"
      :disabled="disabled"
      :aria-label="'Prompt input'"
      :aria-disabled="disabled"
      @keydown="handleKeydown"
      @input="autoResize"
    />
    <button
      type="submit"
      class="chat-input-send"
      :disabled="!canSubmit"
      :aria-label="'Send prompt'"
      :aria-disabled="!canSubmit"
    >
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
      >
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useChatInput } from '~/composables/useChatInput.ts';

/**
 * ChatInput — bottom-of-panel prompt bar.
 *
 * Behaviour:
 *  - Disabled when the WebSocket isn't `connected` so the user can't
 *    fire prompts into a dead session.
 *  - Enter submits; Shift+Enter inserts a newline (native textarea
 *    default; we just `preventDefault` on plain Enter).
 *  - Auto-grows rows from 1 to `MAX_ROWS` based on `scrollHeight`
 *    after each input event.
 *  - Watches the `useChatInput()` singleton: when `submitRequested`
 *    flips true (a chip click happened elsewhere), fires the submit
 *    handler and clears the singleton so the next chip click works.
 *
 * Submit callback: emits `submit` with the trimmed prompt text.
 *
 * @see {F43 follow-up} — Claude Code–style chat panel + prompt input bar
 */
const emit = defineEmits<{
  /** Submit pressed; prompt is the trimmed value. */
  submit: [prompt: string];
}>();

const ws = useWebSocket();
const inputState = useChatInput();

/** Local draft so the textarea is a controlled input. */
const draft = ref<string>('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const MAX_ROWS = 5;
const LINE_HEIGHT_PX = 20;

/**
 * Reactive disabled state — `computed` (NOT a plain arrow function)
 * so Vue can track the dependency on `ws.state.value`. Previously
 * these were plain functions and only evaluated once at setup time,
 * leaving the input stuck in "Connect the socket to send prompts…"
 * even after the WS flipped to `connected`.
 */
const isConnected = computed<boolean>(() => ws.state.value === 'connected');
const disabled = computed<boolean>(() => !isConnected.value);

const placeholderText = computed<string>(() =>
  isConnected.value
    ? 'Ask anything or describe a UI to render…'
    : 'Connect the socket to send prompts…',
);

/** Send button is disabled when the WS is down OR the draft is empty. */
const canSubmit = computed<boolean>(
  () => isConnected.value && draft.value.trim().length > 0,
);

/**
 * Resize the textarea between 1 and MAX_ROWS based on its scrollHeight.
 * Runs after `nextTick` so the DOM has applied the value update before
 * we read `scrollHeight` (avoids measuring the wrong height).
 */
async function autoResize(): Promise<void> {
  await nextTick();
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  const maxHeight = LINE_HEIGHT_PX * MAX_ROWS + 16; // + padding
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}

/**
 * Submit handler — trims the draft, emits, clears, refocuses.
 *
 * Called from Enter keypress, the submit button, or the
 * `useChatInput().submitRequested` watcher (chip click).
 */
function handleSubmit(): void {
  if (!canSubmit.value) return;
  const trimmed = draft.value.trim();
  emit('submit', trimmed);
  draft.value = '';
  void autoResize();
  // Return focus to the textarea so the user can keep typing.
  textareaRef.value?.focus();
}

/**
 * Keydown: Enter submits; Shift+Enter is left to the native textarea
 * (newline). Plain Enter must `preventDefault` so it doesn't also
 * insert a newline before submit fires.
 */
function handleKeydown(ev: KeyboardEvent): void {
  if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
    ev.preventDefault();
    handleSubmit();
  }
}

/**
 * Watch the singleton `submitRequested` flag. A chip click in the
 * chat's empty state (or in any other consumer of `useChatInput`)
 * flips it to true; we fire the submit and clear the flag so the
 * next chip click works.
 */
watch(
  () => inputState.submitRequested.value,
  (requested) => {
    if (!requested) return;
    draft.value = inputState.draft.value;
    void nextTick(() => {
      void autoResize();
      handleSubmit();
      inputState.clear();
    });
  },
);

onMounted(() => {
  void autoResize();
});
</script>

<style scoped>
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) var(--gp-space-3);
  background: var(--gp-bg);
  border-top: 1px solid var(--gp-border);
  flex: 0 0 auto;
}

/* Visually-hidden label for screen readers; the textarea's own
   aria-label carries the accessible name. */
.chat-input-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.chat-input-textarea {
  flex: 1 1 auto;
  min-height: 36px;
  max-height: 116px; /* 5 × 20 + 16 padding */
  resize: none;
  padding: var(--gp-space-2) var(--gp-space-3);
  font-family: var(--gp-font-sans);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gp-text);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  transition: border-color var(--gp-transition), background var(--gp-transition);
  /* Avoid iOS auto-zoom on focus */
  touch-action: manipulation;
}

.chat-input-textarea::placeholder {
  color: var(--gp-text-muted);
}

.chat-input-textarea:hover:not(:disabled) {
  border-color: var(--gp-border-light);
}

.chat-input-textarea:focus-visible {
  outline: none;
  border-color: var(--gp-accent);
  /* 2px ring via box-shadow so it doesn't reflow the layout */
  box-shadow: 0 0 0 2px var(--gp-accent-subtle);
}

.chat-input-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-input-send {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--gp-text-secondary);
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius);
  cursor: pointer;
  /* Touch target size — the visible button is 36px but the form is
     padded, so the effective tap area is >= 44px on mobile. */
  touch-action: manipulation;
  transition:
    color var(--gp-transition),
    background var(--gp-transition),
    border-color var(--gp-transition),
    transform var(--gp-transition);
}

.chat-input-send:hover:not(:disabled) {
  color: var(--gp-accent);
  background: var(--gp-surface-hover);
  border-color: var(--gp-accent);
}

.chat-input-send:active:not(:disabled) {
  transform: translateY(1px);
}

.chat-input-send:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}

.chat-input-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .chat-input-textarea,
  .chat-input-send {
    transition: none;
  }
  .chat-input-send:active:not(:disabled) {
    transform: none;
  }
}
</style>
