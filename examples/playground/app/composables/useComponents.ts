/**
 * Component state management composable.
 *
 * Tracks mounted components and their current state.
 * Applies COMPONENT_MOUNTED and STATE_DELTA frames to the component registry.
 *
 * Module-level singleton (matches `useChat`, `useProviders`, `useRegistries`,
 * `useWebSocket`) — every caller shares the same reactive `components`
 * array. The first version of this composable scoped `ref<MountedComponent[]>`
 * to the function body, which meant `app.vue`'s subscriber updated its own
 * private ref while `RenderSurface` and the sidebar each held a different
 * private ref. The sidebar showed the count but the center never rendered
 * the cards — they were in a different reactive instance. Hoisting the ref
 * + handlers to module scope fixes that class of bug (F43 follow-up).
 *
 * @see {F41} — Playground demo app
 */

import { ref, readonly } from 'vue';
import type { useWebSocket } from './useWebSocket.ts';

/**
 * A mounted component with its schema and current props.
 */
interface MountedComponent {
  componentId: string;
  channel: string;
  name: string;
  schema: Record<string, unknown>;
  props: Record<string, unknown>;
}

/**
 * Shared component registry.
 *
 * Module-level so `app.vue`'s WS subscription, `RenderSurface`, and the
 * sidebar `Components` list all see the same `components` array.
 */
const components = ref<MountedComponent[]>([]);

/**
 * Find a component by its ID.
 *
 * @param componentId — The component ID to find.
 * @returns The component, or undefined if not found.
 */
function findComponent(
  componentId: string,
): MountedComponent | undefined {
  return components.value.find((c) => c.componentId === componentId);
}

/**
 * Handle COMPONENT_MOUNTED frame.
 *
 * @param frame — The frame envelope.
 */
function handleMounted(frame: unknown): void {
  // `frame` is a FrameEnvelope: { v, channel, type, payload, seq }.
  // The componentId / channel / schema / initialState fields live under
  // `frame.payload` per F11/F16 wire contract — older versions of this
  // composable accidentally read them from the envelope root, which
  // silently no-op'd the mount when the bridge started delivering real
  // frames (the bridge fires after the F43 follow-up mux fix that
  // allowed server-initiated frames to flush).
  const payload = (frame as { payload?: unknown }).payload as {
    componentId?: string;
    channel?: string;
    name?: string;
    schema?: Record<string, unknown>;
    initialState?: Record<string, unknown>;
  } | undefined;

  if (!payload || typeof payload.componentId !== 'string' || typeof payload.channel !== 'string') {
    console.warn('[useComponents] COMPONENT_MOUNTED frame missing payload');
    return;
  }

  // Check if component already exists (idempotent mount)
  const existing = findComponent(payload.componentId);
  if (existing) {
    // Update props with initial state
    existing.props = { ...existing.props, ...(payload.initialState ?? {}) };
    return;
  }

  // F43 follow-up: prefer `payload.name` (added in this commit so
  // every MCP / chat bridge carries the component's display name
  // explicitly). Older frames lacked `name`; fall back to a generic
  // label rather than crashing on `schema['x-genicui-name']`, which
  // the server never set anyway.
  const name = typeof payload.name === 'string' && payload.name.length > 0
    ? payload.name
    : 'Component';

  components.value.push({
    componentId: payload.componentId,
    channel: payload.channel,
    name,
    schema: payload.schema ?? {},
    props: payload.initialState ?? {},
  });
}

/**
 * Handle STATE_DELTA frame.
 *
 * Applies JSON-Patch operations to the component's props.
 *
 * @param frame — The frame envelope.
 */
function handleDelta(frame: unknown): void {
  const envelope = frame as {
    channel: string;
    payload: Array<{ op: string; path: string; value?: unknown }>;
  };

  // Find component by channel
  const component = components.value.find(
    (c) => c.channel === envelope.channel,
  );
  if (!component) {
    console.warn(
      `[useComponents] No component found for channel: ${envelope.channel}`,
    );
    return;
  }

  // Apply JSON-Patch operations
  let props = { ...component.props };
  for (const op of envelope.payload) {
    switch (op.op) {
      case 'replace': {
        const key = op.path.replace(/^\//, '');
        if (key) {
          props = { ...props, [key]: op.value };
        }
        break;
      }
      case 'add': {
        const key = op.path.replace(/^\//, '');
        if (key) {
          props = { ...props, [key]: op.value };
        }
        break;
      }
      case 'remove': {
        const key = op.path.replace(/^\//, '');
        if (key) {
          const copy = { ...props };
          delete copy[key];
          props = copy;
        }
        break;
      }
    }
  }

  component.props = props;
}

/**
 * Handle channel.closed frame — unmount a component.
 *
 * @param frame — The frame envelope.
 */
function handleClosed(frame: unknown): void {
  const envelope = frame as { channel: string };
  components.value = components.value.filter(
    (c) => c.channel !== envelope.channel,
  );
}

/**
 * Component state composable.
 *
 * @returns Reactive component state and methods. All callers share the
 *   same underlying `components` ref (module-level singleton).
 */
export function useComponents() {
  /**
   * Subscribe to WebSocket frames and route to component handlers.
   *
   * Idempotent across calls — repeated subscribers each get every frame
   * (the WS broadcast is fan-out). We don't track "already subscribed"
   * because the WS composable's `onMessage` is itself a fan-out.
   *
   * @param ws — The WebSocket composable instance.
   * @returns Unsubscribe function.
   */
  function subscribe(ws: ReturnType<typeof useWebSocket>): () => void {
    return ws.onMessage((frame) => {
      switch (frame.type) {
        case 'COMPONENT_MOUNTED':
          handleMounted(frame);
          break;
        case 'STATE_DELTA':
          handleDelta(frame);
          break;
        case 'channel.closed':
          handleClosed(frame);
          break;
        // Skip __session__ frames (server.hello handled by useWebSocket)
        default:
          break;
      }
    });
  }

  /**
   * Clear all mounted components.
   */
  function clear(): void {
    components.value = [];
  }

  return {
    components: readonly(components),
    findComponent,
    subscribe,
    clear,
  };
}
