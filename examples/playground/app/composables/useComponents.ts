/**
 * Component state management composable.
 *
 * Tracks mounted components and their current state.
 * Applies COMPONENT_MOUNTED and STATE_DELTA frames to the component registry.
 *
 * @see {F41} — Playground demo app
 */

import { ref, readonly } from 'vue';
import { useWebSocket } from './useWebSocket.ts';

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
 * Component state composable.
 *
 * @returns Reactive component state and methods.
 */
export function useComponents() {
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
    const payload = frame as {
      componentId: string;
      channel: string;
      schema: Record<string, unknown>;
      initialState: Record<string, unknown>;
    };

    // Check if component already exists (idempotent mount)
    const existing = findComponent(payload.componentId);
    if (existing) {
      // Update props with initial state
      existing.props = { ...existing.props, ...payload.initialState };
      return;
    }

    // Extract component name from schema metadata or use generic name
    const name =
      (payload.schema['x-genicui-name'] as string) ?? 'Component';

    components.value.push({
      componentId: payload.componentId,
      channel: payload.channel,
      name,
      schema: payload.schema,
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
   * Subscribe to WebSocket frames and route to component handlers.
   *
   * @param ws — The WebSocket composable instance.
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
