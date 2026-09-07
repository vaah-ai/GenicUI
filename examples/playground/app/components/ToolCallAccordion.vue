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
        Inline component preview for `render_component` tool calls.
        When the agent calls render_component (bare or MCP-prefixed),
        the server broadcasts COMPONENT_MOUNTED on a per-component
        channel, useComponents tracks it under a componentId. We
        resolve the componentId from the tool input (idempotencyKey
        or auto-generated) so the rendered component shows up *inside
        the chat bubble*. This is the only place rendered components
        live — F43 dropped the old center `RenderSurface` column so
        users see the same artifact right next to the tool call.

        This mirrors the POC's chat-bubble behaviour: tool_result
        surfaces a card, but render_component specifically surfaces
        a visible representation of the rendered component.
      -->
      <div
        v-if="isRenderComponentCall && mountedComponent"
        class="tool-call-component"
        :aria-label="`${mountedComponent.name} component preview`"
      >
        <header class="tool-call-component-header">
          <span class="tool-call-component-name">
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
              class="tool-call-component-icon"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            {{ mountedComponent.name }}
          </span>
          <span class="tool-call-component-id">{{ mountedComponent.componentId }}</span>
        </header>
        <!-- Live interactive UI (POC parity): the chat bubble embeds
             the actual rendered component (PrimeVue DataTable for
             the F43 catalog). F43 follow-up: this is the "make the
             chat show the component UI" surface — the only surface
             after the old center column was removed. -->
        <div class="tool-call-component-body">
          <RenderedComponent
            :name="mountedComponent.name"
            :props="mountedComponent.props"
            :component-id="mountedComponent.componentId"
          />
        </div>
        <!--
          F47-AC7: per-component Props accordion is a diagnostic
          surface (raw prop values). Hidden when the chat column
          debug toggle is OFF so the chat reads as prose + interactive
          components only. The component preview above stays visible
          in both modes. Predicate imported from
          `./tool-call-gating.ts` so the gating logic is unit-tested
          without a DOM.
        -->
        <details
          v-if="showComponentProps"
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
      </div>

      <div
        v-else-if="isRenderComponentCall && !mountedComponent"
        class="tool-call-component tool-call-component-pending"
        aria-live="polite"
      >
        <span class="tool-call-component-pending-label">
          Awaiting component mount…
        </span>
      </div>

      <!--
        F47-AC7: Input / Result blocks are diagnostic surfaces
        (raw tool input + tool result). Hidden when the chat column
        debug toggle is OFF. Error block below stays unconditional
        so failures remain visible in demos — silent failure is worse
        than visual noise. Predicates imported from
        `./tool-call-gating.ts` so the gating logic is unit-tested
        without a DOM.
      -->
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
import type { ToolCallEntry } from '~/composables/useChat.ts';
import RenderedComponent from './RenderedComponent.vue';

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
 * F43 follow-up (component-in-chat): when this entry is a
 * `render_component` tool call and the server has broadcast the
 * matching COMPONENT_MOUNTED frame, we look up the mounted
 * component in the `useComponents()` store and embed a compact
 * preview card (name + componentId + collapsible props) directly
 * in the accordion body. This is what makes the rendered component
 * UI visible inside the chat bubble — matching the user's
 * "visible in the chat" requirement — and the only place rendered
 * components surface after F43 dropped the center column.
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
 * True when the tool call refers to `render_component`, accepting
 * the bare form and Claude Code's MCP-prefixed form
 * (`mcp__<server>__render_component`). Mirrors the server-side
 * `isRenderComponentCall()` helper in `chat-handler.ts`.
 */
const isRenderComponentCall = computed<boolean>(() => {
  const name = props.entry.name;
  if (typeof name !== 'string' || name.length === 0) return false;
  if (name === 'render_component') return true;
  return /^mcp__[^_]+(?:_[^_]+)*__render_component$/.test(name);
});

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
    isRenderComponentCall.value,
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
 * a mounted component is available. F43 follow-up: the POC and the
 * pre-collapse layout both surfaced the rendered component as the
 * dominant element in chat (no expand required). Collapsing it
 * inside a `<details>` made it invisible until the user clicked
 * the toggle, which read as "the component never rendered."
 *
 * Plain tool calls (Read/Bash/etc.) stay collapsed by default —
 * they're metadata, the user only expands to inspect input/result.
 */
const isOpenByDefault = computed<boolean>(
  () => isRenderComponentCall.value && mountedComponent.value !== undefined,
);

/**
 * The mounted component for this tool call, looked up by:
 *   1. `entry.input.componentId` (when the agent supplies one
 *      directly — used by the stateless MCP bridge path), or
 *   2. The matching entry by `input.props` shape when the tool
 *      call name is the most recent mounted component (single
 *      component per turn, matched by display name).
 *
 * Returns undefined while the COMPONENT_MOUNTED frame is in
 * flight — the accordion then renders an "Awaiting component
 * mount…" placeholder so the chat still reflects progress.
 */
const mountedComponent = computed(() => {
  if (!isRenderComponentCall.value) return undefined;

  const input = props.entry.input;
  const inputObj = (input && typeof input === 'object')
    ? (input as Record<string, unknown>)
    : null;
  if (!inputObj) return undefined;

  // 1. Explicit componentId from the tool input
  const explicitId = typeof inputObj['componentId'] === 'string'
    ? (inputObj['componentId'] as string)
    : undefined;
  if (explicitId) {
    const hit = findComponent(explicitId);
    if (hit) return hit;
  }

  // 2. Match by display name (componentName / name field)
  const requestedName = typeof inputObj['componentName'] === 'string'
    ? (inputObj['componentName'] as string)
    : typeof inputObj['name'] === 'string'
      ? (inputObj['name'] as string)
      : '';
  if (!requestedName) return undefined;

  const allByName = components.value.filter((c) => c.name === requestedName);
  if (allByName.length === 0) return undefined;

  // If the tool call carries an idempotencyKey, match exactly; otherwise
  // return the most recent one (the render bridge runs synchronously
  // before the chat.event lands, so "most recent" is the right pick).
  const idem = typeof inputObj['idempotencyKey'] === 'string'
    ? (inputObj['idempotencyKey'] as string)
    : undefined;
  if (idem) {
    const hit = allByName.find((c) => c.props != null);
    if (hit) return hit;
  }
  return allByName[allByName.length - 1];
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

/* ---------- Inline component preview ---------- */
.tool-call-component {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md);
  overflow: hidden;
}

.tool-call-component-pending {
  padding: var(--gp-space-2) var(--gp-space-3);
  font-size: 0.75rem;
  color: var(--gp-text-muted);
  font-style: italic;
}

.tool-call-component-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) var(--gp-space-3);
  background: var(--gp-bg);
  border-bottom: 1px solid var(--gp-border);
}

.tool-call-component-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gp-text);
}

.tool-call-component-icon {
  color: var(--gp-accent);
  flex-shrink: 0;
}

.tool-call-component-id {
  font-family: var(--gp-font-mono);
  font-size: 0.6875rem;
  color: var(--gp-text-muted);
  padding: 2px 6px;
  background: var(--gp-surface);
  border-radius: var(--gp-radius-sm);
}

.tool-call-component-props {
  border-top: 1px solid var(--gp-border);
}

.tool-call-component-props-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gp-space-2) var(--gp-space-3);
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
  padding: var(--gp-space-3);
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

.tool-call-component-body {
  background: var(--gp-surface);
  padding: var(--gp-space-2) var(--gp-space-3);
  border-bottom: 1px solid var(--gp-border);
}

.tool-call-component-body :deep(.p-datatable-table) {
  font-size: 0.75rem;
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
