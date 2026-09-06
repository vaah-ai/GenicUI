/**
 * Chat input bar — shared singleton state.
 *
 * Module-level state so the registry prompt chips (`RenderSurface`)
 * and the chat input bar (`ChatInput`) can coordinate without prop
 * drilling. Chip click → `input.fillAndSubmit(prompt)` → the input
 * bar's watcher fires `handleSubmit()` once → `input.clear()` resets
 * the singleton so the next chip click works.
 *
 * @see {F43 follow-up} — Claude Code–style chat panel + prompt input bar
 */

import { ref, readonly } from 'vue';

/**
 * Module-level singleton state so all callers share one draft.
 */
const draft = ref<string>('');
/** Set to true after a programmatic fill to trigger the input bar's submit watcher. */
const submitRequested = ref<boolean>(false);

/**
 * Chat input composable for the prompt bar + chip quick-start flow.
 *
 * @returns Reactive input state and methods.
 */
export function useChatInput() {
  /**
   * Fill the input bar with `prompt` and request an auto-submit.
   *
   * The input bar watches `submitRequested`; when it flips to true, it
   * fires `handleSubmit()` and then calls `clear()` so the next chip
   * click can fire again.
   *
   * @param prompt — The prompt text to fill.
   */
  function fillAndSubmit(prompt: string): void {
    draft.value = prompt;
    submitRequested.value = true;
  }

  /**
   * Reset the singleton. Called by the input bar after a programmatic
   * submit so the next chip click works. Safe to call any time.
   */
  function clear(): void {
    draft.value = '';
    submitRequested.value = false;
  }

  return {
    /** Read-only draft (the input bar two-way binds via v-model on its own local state). */
    draft: readonly(draft),
    /** Read-only submit-requested flag. Input bar watches this. */
    submitRequested: readonly(submitRequested),
    fillAndSubmit,
    clear,
  };
}
