/**
 * Resolves the `useComponents()` mounted entry that corresponds to a
 * given tool-call entry, when the tool call was `render_component`.
 *
 * Used by BOTH `ChatHistory.vue` (clean-mode preview rendered next
 * to the status pill) and `ToolCallAccordion.vue` (debug-mode Props
 * disclosure inside the accordion body). Extracted as a pure function
 * so the lookup logic stays a single source of truth and the unit
 * tests can exercise it without rendering either component.
 *
 * Resolution strategy (mirrors what the in-component version did
 * before F47-AC7 split responsibilities):
 *   1. If `entry.input.componentId` is a string and matches a
 *      mounted component, return it.
 *   2. Otherwise, find the most recent mounted component whose
 *      `name` matches `entry.input.componentName` or
 *      `entry.input.name` (the agent may use either field).
 *   3. If the tool call carries an `idempotencyKey`, prefer the
 *      match whose `props` is populated (a sentinel that the
 *      render bridge runs synchronously, so the entry is ready
 *      by the time the chat event lands).
 *   4. Returns `undefined` while the COMPONENT_MOUNTED frame is
 *      in flight — the caller can then render an "Awaiting
 *      component mount…" placeholder.
 *
 * The function is intentionally non-reactive: it reads the
 * `components` array (a `Ref`'s `.value`) and returns a value or
 * `undefined`. Callers should invoke it inside a `computed` so the
 * template re-renders when `components.value` changes.
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

import type { Ref } from 'vue';

export interface MountedComponentEntry {
  componentId: string;
  name: string;
  props: Record<string, unknown> | null;
}

/** Minimal tool-call shape required by the resolver. */
export interface RenderComponentCallEntry {
  /** Tool-call name (e.g. "render_component"). */
  name: string;
  /**
   * Raw tool input. Typically a `Record<string, unknown>` containing
   * the component name/id and props. May be `null`/`undefined` for
   * malformed frames — the resolver treats those as no match.
   */
  input: unknown;
}

/** Signature of `useComponents().findComponent`. */
export type FindComponentFn = (id: string) => MountedComponentEntry | undefined;

/**
 * Returns the mounted component for a given tool-call entry, or
 * `undefined` when the call is not `render_component` / no
 * COMPONENT_MOUNTED frame has landed yet.
 *
 * @param entry - The structured tool-call entry from `useChat`.
 * @param components - The `Ref` returned by `useComponents()`.
 * @param findComponent - The `findComponent(id)` helper from
 *                        `useComponents()`.
 */
export function resolveMountedComponent(
  entry: RenderComponentCallEntry,
  components: Ref<MountedComponentEntry[]>,
  findComponent: FindComponentFn,
): MountedComponentEntry | undefined {
  if (!isRenderComponentCall(entry.name)) return undefined;

  const input = entry.input;
  const inputObj = (input && typeof input === 'object')
    ? (input as Record<string, unknown>)
    : null;
  if (!inputObj) return undefined;

  // 1. Explicit componentId from the tool input.
  const explicitId = typeof inputObj['componentId'] === 'string'
    ? (inputObj['componentId'] as string)
    : undefined;
  if (explicitId) {
    const hit = findComponent(explicitId);
    if (hit) return hit;
  }

  // 2. Match by display name (componentName / name field).
  const requestedName = typeof inputObj['componentName'] === 'string'
    ? (inputObj['componentName'] as string)
    : typeof inputObj['name'] === 'string'
      ? (inputObj['name'] as string)
      : '';
  if (!requestedName) return undefined;

  const allByName = components.value.filter((c) => c.name === requestedName);
  if (allByName.length === 0) return undefined;

  // 3. If an idempotencyKey is set, prefer the match whose props are
  //    populated (the render bridge resolves synchronously).
  const idem = typeof inputObj['idempotencyKey'] === 'string'
    ? (inputObj['idempotencyKey'] as string)
    : undefined;
  if (idem) {
    const hit = allByName.find((c) => c.props != null);
    if (hit) return hit;
  }

  // 4. Otherwise pick the most recent (last in the array).
  return allByName[allByName.length - 1];
}

/**
 * True when the tool-call name refers to `render_component`,
 * accepting the bare form and Claude Code's MCP-prefixed form
 * (`mcp__<server>__render_component`). Mirrors the server-side
 * `isRenderComponentCall()` helper in `chat-handler.ts`.
 */
export function isRenderComponentCall(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) return false;
  if (name === 'render_component') return true;
  return /^mcp__[^_]+(?:_[^_]+)*__render_component$/.test(name);
}
