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
