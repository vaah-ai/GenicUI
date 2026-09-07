/**
 * Component-event bus — module-level singleton emitter.
 *
 * When a chat-embedded component fires an event (e.g. user clicks Submit
 * on an InputPair), the renderer calls `componentEventBus.emit(componentId,
 * { action, payload })`. The bus routes the event to the consumer that
 * registered a handler for that `componentId` — typically the chat-bridge
 * `useComponents.sendComponentEvent` which serializes it to a
 * `chat.component_event` WS frame.
 *
 * The bus is keyed by `componentId` rather than being a global emitter
 * so that:
 *   - If multiple components of the same type are mounted (two
 *     InputPairs side by side), events don't cross-talk.
 *   - When a component unmounts, `off(componentId)` cleanly removes the
 *     handler without leaking listeners.
 *
 * Module-level singleton (matches `useChat`, `useComponents`,
 * `useProviders`, `useRegistries`, `useChatInput`).
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */

import { readonly, ref } from 'vue';

/** Shape of a fired component event. */
export interface ComponentEvent {
  /** Event name (e.g. 'submit'). */
  action: string;
  /** Event payload (component-specific, JSON-serializable). */
  payload?: Record<string, unknown>;
}

/** A handler subscribed to events from a specific component. */
export type ComponentEventHandler = (event: ComponentEvent) => void;

/**
 * Internal handler table — `Record<componentId, Set<handler>>`.
 *
 * Stored as a Vue `ref` so Vue Devtools and HMR can observe listener
 * churn if needed (read-only for consumers via `readonly(handlers)`).
 */
const handlers = ref<Record<string, Set<ComponentEventHandler>>>({});

/**
 * Subscribe a handler to events from `componentId`.
 *
 * Idempotent — registering the same handler twice for the same id is
 * a no-op (Set dedupe). Returns an unsubscribe function.
 */
export function on(componentId: string, handler: ComponentEventHandler): () => void {
  if (!handlers.value[componentId]) {
    handlers.value[componentId] = new Set();
  }
  handlers.value[componentId]!.add(handler);
  return () => off(componentId, handler);
}

/**
 * Unsubscribe a handler from a component. No-op if not registered.
 */
export function off(componentId: string, handler: ComponentEventHandler): void {
  const set = handlers.value[componentId];
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) {
    delete handlers.value[componentId];
  }
}

/**
 * Fire an event for `componentId`. All registered handlers are called
 * synchronously in registration order. Errors in one handler are caught
 * and logged so a misbehaving consumer can't break the others.
 *
 * @returns The number of handlers invoked.
 */
export function emit(componentId: string, event: ComponentEvent): number {
  const set = handlers.value[componentId];
  if (!set || set.size === 0) return 0;
  let invoked = 0;
  for (const handler of set) {
    invoked++;
    try {
      handler(event);
    } catch (err) {
      console.error(`[component-event-bus] handler for ${componentId} threw:`, err);
    }
  }
  return invoked;
}

/**
 * Test helper — returns the count of registered handlers across all
 * components. Not used in production.
 */
export function __test_handlerCount(): number {
  let n = 0;
  for (const set of Object.values(handlers.value)) n += set.size;
  return n;
}

/**
 * Test helper — clears every handler. Not used in production.
 */
export function __test_reset(): void {
  handlers.value = {};
}

/**
 * Composable accessor — exposes the bus functions and a read-only view
 * of the handler table for inspection.
 */
export function useComponentEventBus() {
  return {
    on,
    off,
    emit,
    handlers: readonly(handlers),
  };
}
