<template>
  <details
    class="tool-call"
    :class="`tool-call-${entry.status}`"
    :aria-label="`Tool call: ${entry.name}`"
    :open="isOpenByDefault"
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
      <!--
        F47-AC7 (clean-view refactor): the rendered component preview
        for `render_component` calls is no longer this component's
        responsibility. `ChatHistory.vue` renders it as a sibling of
        the status pill so it stays visible when the debug toggle is
        OFF — hiding it would defeat the whole point of the chat
        surface (the live CityPicker / WeatherCard widgets).

        What this component still owns:
          - Per-component Props accordion (the raw `mountedComponent.props`
            JSON dump) — diagnostic surface, gated by `isDebug`.
          - Tool `Input` block — raw tool input, gated by `isDebug`.
          - Tool `Result` block — raw tool result, gated by `isDebug`
            and hidden for `render_component` calls (the live preview
            replaces it).
          - Tool `Error` block — stays unconditional so failures
            surface even in clean mode.
      -->
      <details
        v-if="showComponentProps && mountedComponent"
        class="tool-call-component-props"
      >
        <summary class="tool-call-component-props-toggle">
          <span>Props</span>
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
            class="tool-call-component-chevron"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <pre>{{ formatJson(mountedComponent.props) }}</pre>
      </details>

      <div v-if="showToolInput" class="tool-call-block">
        <div class="tool-call-block-label">Input</div>
        <pre class="tool-call-block-pre">{{ formatJson(entry.input) }}</pre>
      </div>
      <div v-if="showToolResult" class="tool-call-block">
        <div class="tool-call-block-label">Result</div>
        <pre class="tool-call-block-pre">{{ formatJson(entry.result) }}</pre>
      </div>
      <div v-if="showToolError" class="tool-call-block tool-call-block-error" role="alert">
        <div class="tool-call-block-label">Error</div>
        <pre class="tool-call-block-pre">{{ entry.error }}</pre>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useComponents } from '~/composables/useComponents.ts';
import { useDebugMode } from '~/composables/useDebugMode.ts';
import {
  shouldRenderComponentProps,
  shouldRenderToolInput,
  shouldRenderToolResult,
  shouldRenderToolError,
} from './tool-call-gating.ts';
import {
  resolveMountedComponent,
  isRenderComponentCall,
} from './resolve-mounted-component.ts';
import type { ToolCallEntry } from '~/composables/useChat.ts';

/**
 * ToolCallAccordion — collapsible disclosure for one tool invocation
 * by the agent.
 *
 * Mirrors the `<details>` + chevron pattern from the now-removed
 * `RenderSurface.vue`'s `component-card-props` so the chat panel uses
 * the same affordance vocabulary as the rest of the playground.
 *
 * Status pill:
 *  - `running` — `--gp-accent` text, animated dot
 *  - `done`    — `--gp-text-muted`
 *  - `error`   — red border + faint red background (matches the
 *                `chat-bubble-error` treatment in `ChatHistory.vue`)
 *
 * The accordion is keyboard-accessible via native `<details>`
 * (`Enter` / `Space` toggle, focusable summary).
 *
 * F47-AC7 responsibility split:
 *   - This component is now a *pure diagnostic* surface: per-
 *     component Props JSON disclosure + tool Input / Result /
 *     Error blocks, all gated by the chat column debug toggle.
 *   - The *live `<RenderedComponent>` preview* for `render_component`
 *     calls lives in `ChatHistory.vue` as a sibling of the compact
 *     status pill. Hiding it inside this accordion made it
 *     invisible in clean mode (debug OFF), so we extracted it.
 *   - Lookup of the mounted component entry is delegated to the
 *     shared helper in `./resolve-mounted-component.ts` so both
 *     surfaces use the same resolution rules (componentId →
 *     name → most-recent-fallback).
 */
const props = defineProps<{
  /** The structured tool call entry. */
  entry: ToolCallEntry;
}>();

const { components, findComponent } = useComponents();

/**
 * F47-AC7: read the chat column debug flag. Module-singleton, so
 * every `ToolCallAccordion` instance sees the same value as the
 * toggle in `ChatPanel`. When `false`, the diagnostic blocks
 * (per-component Props, tool Input, tool Result) are hidden so the
 * chat column shows a clean view.
 */
const { isDebug } = useDebugMode();

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
 * True when the tool call refers to `render_component`. Pure-function
 * import from `./resolve-mounted-component.ts` so the lookup logic is
 * shared between this component (debug-mode props accordion) and
 * `ChatHistory.vue` (clean-mode rendered component preview).
 */
const isRenderComponentCallLocal = computed<boolean>(() =>
  isRenderComponentCall(props.entry.name),
);

/**
 * F47-AC7: gate predicates for the four diagnostic / status blocks
 * rendered inside the accordion body. Pure-function imports so the
 * logic is unit-testable in `ToolCallAccordion.test.ts` without a
 * DOM harness.
 */
const showComponentProps = computed<boolean>(() =>
  shouldRenderComponentProps(isDebug.value),
);
const showToolInput = computed<boolean>(() =>
  shouldRenderToolInput(isDebug.value),
);
const showToolResult = computed<boolean>(() =>
  shouldRenderToolResult(
    isDebug.value,
    props.entry.result !== undefined,
    isRenderComponentCallLocal.value,
  ),
);
const showToolError = computed<boolean>(() =>
  shouldRenderToolError(
    props.entry.status === 'error',
    typeof props.entry.error === 'string' && props.entry.error.length > 0,
  ),
);

/**
 * Auto-expand the accordion when it's a `render_component` call AND
 * a mounted component is available. F43 follow-up: the user expects
 * the component preview to be visible without clicking the toggle.
 *
 * Plain tool calls (Read/Bash/etc.) stay collapsed by default —
 * they're metadata, the user only expands to inspect input/result.
 */
const isOpenByDefault = computed<boolean>(
  () => isRenderComponentCallLocal.value && mountedComponent.value !== undefined,
);

/**
 * The mounted component for this tool call, if any. Resolved via
 * the shared helper so the lookup is a single source of truth.
 * Returns `undefined` while the COMPONENT_MOUNTED frame is in
 * flight — the Props disclosure is then hidden by `showComponentProps`
 * (which already requires a `mountedComponent`).
 */
const mountedComponent = computed(() =>
  resolveMountedComponent(props.entry, components, findComponent),
);

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

/* ---------- Per-component Props disclosure ---------- */
.tool-call-component-props {
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm);
  background: var(--gp-bg);
}

.tool-call-component-props-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gp-space-1) var(--gp-space-2);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gp-text-muted);
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background var(--gp-transition);
}

.tool-call-component-props-toggle::-webkit-details-marker {
  display: none;
}

.tool-call-component-props-toggle:hover {
  background: var(--gp-surface-hover);
}

.tool-call-component-props-toggle:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: -2px;
}

.tool-call-component-chevron {
  transition: transform var(--gp-transition);
}

.tool-call-component-props[open] .tool-call-component-chevron {
  transform: rotate(180deg);
}

.tool-call-component-props pre {
  margin: 0;
  padding: var(--gp-space-2);
  font-family: var(--gp-font-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--gp-text-secondary);
  background: var(--gp-bg);
  overflow-x: auto;
  white-space: pre;
  max-height: 320px;
  overflow-y: auto;
}

/* ---------- Raw input / result / error blocks ---------- */
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
  .tool-call-toggle,
  .tool-call-component-props-toggle,
  .tool-call-component-chevron {
    transition: none;
  }
}
</style>
