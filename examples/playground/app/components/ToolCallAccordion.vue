<template>
  <details
    class="tool-call"
    :class="`tool-call-${entry.status}`"
    :aria-label="`Tool call: ${entry.name}`"
  >
    <summary class="tool-call-toggle">
      <span class="tool-call-icon" aria-hidden="true">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>
      <span class="tool-call-name">{{ entry.name }}</span>
      <span
        class="tool-call-status"
        :class="`tool-call-status-${entry.status}`"
        :aria-label="`Status: ${entry.status}`"
      >
        {{ statusLabel }}
      </span>
      <svg
        class="tool-call-chevron"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </summary>

    <div class="tool-call-body">
      <div class="tool-call-block">
        <div class="tool-call-block-label">Input</div>
        <pre class="tool-call-block-pre">{{ formatJson(entry.input) }}</pre>
      </div>
      <div v-if="entry.result !== undefined" class="tool-call-block">
        <div class="tool-call-block-label">Result</div>
        <pre class="tool-call-block-pre">{{ formatJson(entry.result) }}</pre>
      </div>
      <div v-if="entry.status === 'error' && entry.error" class="tool-call-block tool-call-block-error" role="alert">
        <div class="tool-call-block-label">Error</div>
        <pre class="tool-call-block-pre">{{ entry.error }}</pre>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ToolCallEntry } from '~/composables/useChat.ts';

/**
 * ToolCallAccordion — collapsible disclosure for one tool invocation
 * by the agent.
 *
 * Mirrors the `<details>` + chevron pattern from `RenderSurface.vue`'s
 * `component-card-props` (lines 83-102) so the chat panel uses the
 * same affordance vocabulary as the rest of the playground.
 *
 * Status pill:
 *  - `running` — `--gp-accent` text, animated dot
 *  - `done`    — `--gp-text-muted`
 *  - `error`   — red border + faint red background (matches the
 *                `chat-bubble-error` treatment in `ChatHistory.vue`)
 *
 * The accordion is keyboard-accessible via native `<details>`
 * (`Enter` / `Space` toggle, focusable summary).
 */
const props = defineProps<{
  /** The structured tool call entry. */
  entry: ToolCallEntry;
}>();

/**
 * Human-readable status label for the pill.
 */
const statusLabel = computed<string>(() => {
  switch (props.entry.status) {
    case 'running':
      return 'running';
    case 'done':
      return 'done';
    case 'error':
      return 'error';
  }
});

/**
 * Pretty-print JSON for display inside `<pre>`. Falls back to
 * `String(value)` if the payload is non-serializable (e.g. a function).
 */
function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
</script>

<style scoped>
.tool-call {
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm);
  background: var(--gp-bg);
  overflow: hidden;
  transition: border-color var(--gp-transition);
}

.tool-call-running {
  border-color: rgba(34, 197, 94, 0.35);
}

.tool-call-error {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.06);
}

.tool-call-toggle {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
  padding: var(--gp-space-1) var(--gp-space-2);
  font-size: 0.75rem;
  font-family: var(--gp-font-sans);
  color: var(--gp-text-secondary);
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background var(--gp-transition);
}

.tool-call-toggle::-webkit-details-marker {
  display: none;
}

.tool-call-toggle:hover {
  background: var(--gp-surface-hover);
}

.tool-call-toggle:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: -2px;
}

.tool-call-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gp-accent);
  opacity: 0.85;
  flex-shrink: 0;
}

.tool-call-name {
  flex: 1 1 auto;
  font-family: var(--gp-font-mono);
  font-size: 0.75rem;
  color: var(--gp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-call-status {
  flex-shrink: 0;
  display: inline-block;
  padding: 0 var(--gp-space-1);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 999px;
  line-height: 1.5;
  border: 1px solid var(--gp-border);
  background: var(--gp-bg);
  color: var(--gp-text-muted);
}

.tool-call-status-running {
  color: var(--gp-accent);
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.08);
}

.tool-call-status-done {
  color: var(--gp-text-muted);
}

.tool-call-status-error {
  color: rgba(239, 68, 68, 0.95);
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}

.tool-call-chevron {
  flex-shrink: 0;
  color: var(--gp-text-muted);
  transition: transform var(--gp-transition);
}

.tool-call[open] .tool-call-chevron {
  transform: rotate(180deg);
}

.tool-call-body {
  border-top: 1px solid var(--gp-border);
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2);
  background: var(--gp-surface);
}

.tool-call-block {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.tool-call-block-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
}

.tool-call-block-pre {
  margin: 0;
  padding: var(--gp-space-2);
  font-family: var(--gp-font-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--gp-text-secondary);
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm);
  overflow-x: auto;
  white-space: pre;
  max-height: 240px;
  overflow-y: auto;
}

.tool-call-block-error .tool-call-block-pre {
  color: rgba(239, 68, 68, 0.95);
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.05);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tool-call,
  .tool-call-chevron,
  .tool-call-toggle {
    transition: none;
  }
}
</style>
