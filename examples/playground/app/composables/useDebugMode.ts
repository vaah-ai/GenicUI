/**
 * Debug-mode toggle — gates the diagnostic panels inside each
 * `ToolCallAccordion` (PROPS, INPUT, RESULT blocks). When OFF, the
 * chat column shows only the assistant's prose, the user/agent bubbles,
 * and the actual interactive component previews — a "clean chat"
 * view intended for screenshots, demos, and non-developer stakeholders.
 *
 * State source: URL query param `?debug=off`. Any other value (or
 * missing) means ON. The URL is the source of truth so demos and
 * screenshots can deep-link a clean view, and reload preserves state.
 *
 * Module-level singleton (matches `useChat`, `useComponents`,
 * `useProviders`, `useRegistries`, `useChatInput`, `useComponentEventBus`).
 * Every caller shares the same reactive `isDebug` ref, so flipping
 * the toggle in `ChatPanel` instantly hides the diagnostic blocks in
 * every `ToolCallAccordion` without prop-drilling.
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

import { readonly, ref } from 'vue';

/**
 * Query-string sentinel for the OFF state. Anything other than this
 * literal (including missing, 'on', 'true', '1', etc.) means ON.
 */
const OFF_SENTINEL = 'off';

/**
 * Internal reactive flag — `true` when diagnostic panels should
 * render, `false` when the chat should look "clean".
 */
const isDebug = ref<boolean>(true);

/**
 * Optional URL rewriter. In a Nuxt context, `ChatPanel` calls
 * `setDebug(value)` which invokes `rewriteUrl(value)` to update
 * `window.history` via `useRouter().replace`. We accept the rewriter
 * lazily so the composable has no Nuxt runtime dependency — bare
 * `bun test` runs and unit tests don't need a Nuxt app context.
 */
let rewriteUrl: ((off: boolean) => void) | null = null;

/**
 * Register the URL rewriter. Called once from `ChatPanel.vue`'s
 * `onMounted` so the composable stays Nuxt-free. Tests skip this
 * step and assert via `__test_*` helpers.
 */
export function __setUrlRewriter(fn: (off: boolean) => void): void {
  rewriteUrl = fn;
}

/**
 * Test helper — parse a query string (without the leading `?`) into
 * the same shape the composable reads. Kept here so production code
 * and tests agree on the parsing rules.
 */
export function __parseQuery(queryString: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!queryString) return out;
  // Strip leading `?` if present.
  const trimmed = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (trimmed.length === 0) return out;
  for (const part of trimmed.split('&')) {
    const eq = part.indexOf('=');
    if (eq < 0) {
      out[decodeURIComponent(part)] = '';
    } else {
      out[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(
        part.slice(eq + 1),
      );
    }
  }
  return out;
}

/**
 * Read the current `?debug` value from `window.location.search`.
 * Returns the raw string (without `?debug=`). Used in production
 * via `setDebug(value)` and indirectly by tests via `__test_setQuery`.
 */
function readWindowDebug(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  const search = window.location.search;
  if (!search) return '';
  const parsed = __parseQuery(search);
  return parsed['debug'] ?? '';
}

/**
 * Coerce a raw `?debug` string into a boolean. `?debug=off` → false;
 * anything else (including missing/empty) → true.
 */
function coerce(raw: string): boolean {
  return raw !== OFF_SENTINEL;
}

/**
 * Read the current debug flag from the URL and write it to the
 * internal ref. Called by `ChatPanel` on mount so the initial render
 * honours `?debug=off` from the address bar.
 */
export function initFromUrl(): void {
  isDebug.value = coerce(readWindowDebug());
}

/**
 * Test helper — directly set the debug flag (mirrors the real
 * `initFromUrl` semantics: `off` → false, anything else → true).
 * Resets the URL rewriter so test ordering doesn't leak between cases.
 */
export function __test_setQuery(raw: string): void {
  rewriteUrl = null;
  isDebug.value = coerce(raw);
}

/**
 * Test helper — read the current ref value without going through the
 * readonly proxy. Useful for asserting state changes in tests.
 */
export function __test_isDebug(): boolean {
  return isDebug.value;
}

/**
 * Update the debug flag and (if a rewriter is registered) sync the
 * URL so reloads preserve the choice. `setDebug(true)` removes the
 * param (default ON, no URL noise); `setDebug(false)` sets
 * `?debug=off`.
 */
export function setDebug(value: boolean): void {
  isDebug.value = value;
  if (rewriteUrl) rewriteUrl(!value);
}

/**
 * Composable accessor — exposes the reactive flag (read-only) and
 * the setter. All callers share the same underlying ref.
 */
export function useDebugMode() {
  return {
    isDebug: readonly(isDebug),
    setDebug,
    initFromUrl,
  };
}
