/**
 * Runtime engine — F29.
 *
 * Mounts, patches, and tears down Web Components in response
 * to WebSocket frames from the server. Implements:
 * - STATE_SNAPSHOT → mount within 50ms (F29-AC1)
 * - STATE_DELTA → patch within 10ms (F29-AC2)
 * - channel.closed → unmount + dispose (F29-AC3)
 * - Module isolation — no window globals (F29-AC4)
 *
 * @module @genicui/client/runtime/runtime
 *
 * @see {F29} — Runtime engine (mount, patch, lifecycle)
 * @see {F21} — GenicElement Web Component base
 */

import { JsonPatchEngine } from '@genicui/core';

import { GenicElement } from '../genic-element.js';
import type { RuntimeBridge, ComponentEventPayload } from '../types.js';
import type {
  RuntimeFrame,
  RuntimeOptions,
  MountResult,
  PatchResult,
  ComponentState,
} from './types.js';

/** Default mount timeout — F29-AC1 requires <50ms. */
const MOUNT_TIMEOUT_MS = 50;

/** Default patch timeout — F29-AC2 requires <10ms. */
const PATCH_TIMEOUT_MS = 10;

/**
 * Runtime engine that bridges server WebSocket frames to browser DOM.
 *
 * Maintains a Map<componentId, ComponentState> of all mounted
 * components and routes incoming frames to the correct handler.
 *
 * @see {F29} — Runtime engine
 */
export class RuntimeEngine {
  /** Map of componentId → current state (element + props). */
  readonly #components = new Map<string, ComponentState>();

  /** DOM container for mounted components. */
  readonly #container: HTMLElement;

  /** JSON-Patch engine for applying deltas. */
  readonly #patchEngine = new JsonPatchEngine();

  /** Whether the engine has been disposed. */
  #disposed = false;

  /**
   * Create a new runtime engine.
   *
   * @param options — runtime configuration
   */
  constructor(private readonly options: RuntimeOptions = {}) {
    this.#container = options.container ?? document.body;

    // Wire this engine as the RuntimeBridge for GenicElement (F21-F29 integration)
    const bridge: RuntimeBridge = {
      onMount: this.#onMount.bind(this),
      onUnmount: this.#onUnmount.bind(this),
      onEvent: this.#onEvent.bind(this),
    };
    GenicElement.setRuntimeBridge(bridge);
  }

  /**
   * Process an incoming WebSocket frame.
   *
   * Routes the frame to the correct handler based on its type:
   * - STATE_SNAPSHOT → mount new component
   * - STATE_DELTA → patch existing component
   * - channel.closed → unmount component
   * - server.hello → forward to onHello callback
   * - COMPONENT_EVENT → forward to onEvent callback
   *
   * @param frame — the parsed frame from the server
   * @returns the result of the operation, or null for informational frames
   */
  onMessage(frame: RuntimeFrame): MountResult | PatchResult | null {
    if (this.#disposed) {
      return null;
    }

    switch (frame.type) {
      case 'STATE_SNAPSHOT':
        return this.#handleSnapshot(frame);
      case 'STATE_DELTA':
        return this.#handleDelta(frame);
      case 'channel.closed':
        this.#handleClosed(frame);
        return null;
      case 'server.hello':
        this.#handleHello(frame);
        return null;
      case 'COMPONENT_EVENT':
        this.#handleComponentEvent(frame);
        return null;
      default:
        return null;
    }
  }

  /**
   * Get the currently mounted component IDs.
   */
  get mountedComponentIds(): ReadonlySet<string> {
    return new Set(this.#components.keys());
  }

  /**
   * Get the count of mounted components.
   */
  get mountedCount(): number {
    return this.#components.size;
  }

  /**
   * Check if a component is currently mounted.
   *
   * @param componentId — the component to check
   */
  isMounted(componentId: string): boolean {
    return this.#components.has(componentId);
  }

  // -----------------------------------------------------------------------
  // Frame Handlers
  // -----------------------------------------------------------------------

  /**
   * Handle STATE_SNAPSHOT — mount a new component (F29-AC1).
   *
   * Creates a new GenicElement, sets its attributes, and appends
   * it to the container. Measures mount time and asserts <50ms.
   */
  #handleSnapshot(frame: RuntimeFrame): MountResult {
    const start = performance.now();
    const componentId = frame.channel;
    const payload = frame.payload as Record<string, unknown>;
    const props = (payload.props as Record<string, unknown>) ?? {};

    // Create the Web Component element
    const element = this.#createElement(componentId, props);

    // Append to container — triggers connectedCallback
    this.#container.appendChild(element);

    // Record state
    this.#components.set(componentId, { element, props });

    const mountTimeMs = performance.now() - start;

    // F29-AC1: Assert mount within 50ms
    if (mountTimeMs > MOUNT_TIMEOUT_MS) {
      console.warn(
        `[GenicUI Runtime] Mount of "${componentId}" took ${mountTimeMs.toFixed(2)}ms ` +
        `(exceeds ${MOUNT_TIMEOUT_MS}ms threshold)`,
      );
    }

    return { componentId, element, mountTimeMs };
  }

  /**
   * Handle STATE_DELTA — patch an existing component (F29-AC2).
   *
   * Applies JSON-Patch operations to the current props, then
   * updates the element's props-json attribute.
   */
  #handleDelta(frame: RuntimeFrame): PatchResult {
    const start = performance.now();
    const componentId = frame.channel;

    const state = this.#components.get(componentId);
    if (!state) {
      console.warn(
        `[GenicUI Runtime] STATE_DELTA for unknown component "${componentId}", ignoring`,
      );
      return { componentId, patchTimeMs: 0 };
    }

    const patches = frame.payload as unknown[][];

    // Apply patches to current props (F4 — JsonPatchEngine with { mutate: false })
    // JsonPatchEngine.apply accepts Operation[] which is { op, path, value? }[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newProps = this.#patchEngine.apply(patches as any, state.props);
    const newPropsObj = newProps as Record<string, unknown>;

    // Update the element via props-json attribute (triggers attributeChangedCallback → F21-AC2)
    state.element.setAttribute('props-json', JSON.stringify(newPropsObj));

    // Update internal state
    state.props = newPropsObj;

    const patchTimeMs = performance.now() - start;

    // F29-AC2: Assert patch within 10ms
    if (patchTimeMs > PATCH_TIMEOUT_MS) {
      console.warn(
        `[GenicUI Runtime] Patch of "${componentId}" took ${patchTimeMs.toFixed(2)}ms ` +
        `(exceeds ${PATCH_TIMEOUT_MS}ms threshold)`,
      );
    }

    return { componentId, patchTimeMs };
  }

  /**
   * Handle channel.closed — unmount component (F29-AC3).
   *
   * Removes the element from the DOM and cleans up internal state.
   */
  #handleClosed(_frame: RuntimeFrame): void {
    const componentId = _frame.channel;

    const state = this.#components.get(componentId);
    if (!state) {
      return;
    }

    // Remove from DOM — triggers disconnectedCallback → F21-AC4
    if (state.element.parentNode) {
      state.element.parentNode.removeChild(state.element);
    }

    // Clean up internal state
    this.#components.delete(componentId);
  }

  /**
   * Handle server.hello — forward to callback.
   */
  #handleHello(frame: RuntimeFrame): void {
    const payload = frame.payload as Record<string, unknown>;
    this.options.onHello?.(payload);
  }

  /**
   * Handle COMPONENT_EVENT — forward to callback.
   */
  #handleComponentEvent(frame: RuntimeFrame): void {
    const payload = frame.payload as Record<string, unknown>;
    const componentId = frame.channel;
    const action = payload.action as string;
    const detail = payload.detail as Record<string, unknown> ?? {};
    this.options.onEvent?.(componentId, action, detail);
  }

  // -----------------------------------------------------------------------
  // RuntimeBridge Integration (F21-F29)
  // -----------------------------------------------------------------------

  /**
   * Called by GenicElement.onMount during connectedCallback.
   * The runtime bridge forwards mount events to the server.
   */
  #onMount(_componentId: string): void {
    // Mount event from the client side — in a full implementation,
    // this would emit a client.hello frame back to the server.
    // For MVP, the server already knows about the component from
    // the STATE_SNAPSHOT it sent.
  }

  /**
   * Called by GenicElement.onUnmount during disconnectedCallback.
   */
  #onUnmount(componentId: string): void {
    // Clean up internal state if the element was removed from DOM
    // by the browser (not by our runtime).
    this.#components.delete(componentId);
  }

  /**
   * Called by GenicElement when a child dispatches a composed event.
   */
  #onEvent(componentId: string, payload: ComponentEventPayload): void {
    // Forward to the onEvent callback for the consumer to handle.
    // In a full implementation, this would emit a COMPONENT_EVENT
    // frame back to the server via WebSocket.
    this.options.onEvent?.(componentId, payload.action, payload.detail);
  }

  // -----------------------------------------------------------------------
  // Element Factory
  // -----------------------------------------------------------------------

  /**
   * Create a GenicElement instance with the given componentId and props.
   *
   * Uses the registered custom element tag name. If no element is
   * registered, creates a generic GenicElement subclass on demand.
   */
  #createElement(
    componentId: string,
    props: Record<string, unknown>,
  ): HTMLElement {
    // Derive the tag name from the componentId prefix.
    // Component IDs follow the pattern: {prefix}-{sessionId}-{ulid}
    // e.g., "dt-sess9f8e-01HK9X" → tag "genic-data-table"
    // For simplicity, we use a generic "genic-component" tag.
    // In production, the component registry (F37) maps names to tags.
    const tag = 'genic-component';

    // Register the element class if not already registered
    if (!customElements.get(tag)) {
      class RuntimeComponent extends GenicElement {
        // Uses the default GenicElement render() — subclasses
        // in production override this for custom rendering.
      }
      customElements.define(tag, RuntimeComponent);
    }

    const element = document.createElement(tag) as HTMLElement;
    element.setAttribute('component-id', componentId);
    element.setAttribute('props-json', JSON.stringify(props));

    return element;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Dispose the runtime engine.
   *
   * Unmounts all components, clears internal state, and
   * prevents further frame processing.
   */
  dispose(): void {
    this.#disposed = true;

    // Unmount all components
    for (const [componentId, state] of this.#components) {
      if (state.element.parentNode) {
        state.element.parentNode.removeChild(state.element);
      }
      void componentId;
    }

    this.#components.clear();
  }
}

/**
 * Factory function to create a new runtime engine.
 *
 * @see {F29} — Runtime engine
 *
 * @param options — runtime configuration
 * @returns the runtime engine instance
 */
export function createRuntime(options?: RuntimeOptions): RuntimeEngine {
  return new RuntimeEngine(options);
}
