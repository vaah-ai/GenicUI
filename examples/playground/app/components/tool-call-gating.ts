/**
 * Pure-function gating predicates for `ToolCallAccordion.vue`.
 *
 * F47-AC7: the chat column debug toggle hides the diagnostic blocks
 * (per-component `Props`, tool `Input`, tool `Result`) when off. The
 * `Error` block stays unconditional — silent failure is worse than
 * visual noise in demos.
 *
 * Extracted as plain functions (no Vue refs, no DOM) so unit tests
 * can exercise them in isolation. `ToolCallAccordion.vue` imports
 * these and binds the template `v-if` clauses to the predicates —
 * the bindings in the template and the assertions in the test file
 * MUST agree (see `ToolCallAccordion.test.ts`).
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

/**
 * Per-component `Props` accordion — the disclosure that dumps the
 * mounted component's props as pretty-printed JSON. Diagnostic
 * surface; gated by the chat column debug toggle.
 */
export function shouldRenderComponentProps(isDebug: boolean): boolean {
  return isDebug;
}

/**
 * Tool `Input` block — the JSON dump of the agent's tool input.
 * Diagnostic surface; gated by the chat column debug toggle.
 */
export function shouldRenderToolInput(isDebug: boolean): boolean {
  return isDebug;
}

/**
 * Tool `Result` block — the JSON dump of the tool's return value
 * (omitted for `render_component` calls where the live preview
 * takes its place; that suppression is mirrored here).
 *
 * Diagnostic surface; gated by the chat column debug toggle.
 */
export function shouldRenderToolResult(
  isDebug: boolean,
  hasResult: boolean,
  isRenderComponentCall: boolean,
): boolean {
  if (!isDebug) return false;
  if (!hasResult) return false;
  if (isRenderComponentCall) return false;
  return true;
}

/**
 * Tool `Error` block — stays visible regardless of the debug
 * toggle. Failures must surface in demos even in clean mode.
 */
export function shouldRenderToolError(
  isErrorStatus: boolean,
  hasErrorMessage: boolean,
): boolean {
  return isErrorStatus && hasErrorMessage;
}

/**
 * F47-AC7 (clean-view): decides whether the live `<RenderedComponent>`
 * preview should be rendered in clean mode (debug toggle OFF).
 *
 * The preview is the user-facing surface — it shows the actual
 * interactive CityPicker / WeatherCard widget the agent mounted. It
 * must stay visible in BOTH modes:
 *
 *   - Debug ON  → the preview lives inside the `<ToolCallAccordion>`'s
 *                 opened body (existing behaviour, unchanged).
 *   - Debug OFF → the preview lives next to the compact status pill
 *                 in `ChatHistory.vue`, so the user still sees the
 *                 component even when the diagnostic accordions are
 *                 hidden.
 *
 * This predicate gates the clean-mode render in `ChatHistory.vue`. The
 * debug-mode render is unconditional inside `ToolCallAccordion` (the
 * `showComponentProps` predicate covers only the per-component Props
 * JSON dump, not the component itself).
 *
 * @param isRenderComponentCall - True when this tool call is
 *                                `render_component` (bare or
 *                                MCP-prefixed).
 * @param hasMountedComponent   - True when the COMPONENT_MOUNTED
 *                                frame has landed and the matching
 *                                entry exists in the
 *                                `useComponents()` store.
 */
export function shouldRenderCleanComponentPreview(
  isRenderComponentCall: boolean,
  hasMountedComponent: boolean,
): boolean {
  return isRenderComponentCall && hasMountedComponent;
}

/**
 * F47-AC7 (clean-view): when the chat column debug toggle is OFF,
 * `ChatHistory` replaces every `ToolCallAccordion` with a compact
 * one-line status pill. This function produces the visible label:
 *   "→ render_component"     (running)
 *   "✓ render_component"     (done)
 *   "× render_component"     (error)
 *
 * Falls back to `"tool call"` when `name` is empty so the pill is
 * never blank. Status is lowercased intentionally — the pill reads
 * like inline prose, not a structured chip.
 *
 * @param name — Tool-call name (e.g. "render_component", or the
 *              MCP-prefixed `mcp__<server>__render_component`).
 * @param status — One of `'running' | 'done' | 'error'`.
 */
export function formatCleanToolLabel(
  name: string,
  status: 'running' | 'done' | 'error',
): string {
  const trimmed = name.trim();
  const display = trimmed.length > 0 ? trimmed : 'tool call';
  switch (status) {
    case 'running':
      return `→ ${display}`;
    case 'done':
      return `✓ ${display}`;
    case 'error':
      return `× ${display}`;
  }
}
