/**
 * GenicUI Client — type definitions.
 *
 * @module @genicui/client/types
 * @see {F21} — Web Component base class
 */

/**
 * Props object parsed from the `props-json` attribute.
 *
 * The server emits a STATE_SNAPSHOT or STATE_DELTA frame;
 * the client serializes the resulting state to JSON and
 * sets it as the `props-json` attribute on the GenicElement.
 */
export interface GenicElementProps {
  readonly [key: string]: unknown;
}

/**
 * Event payload emitted by child elements inside the
 * GenicElement's Shadow DOM.
 *
 * The base class forwards these to the runtime via the
 * RuntimeBridge interface with `composed: true, bubbles: true`.
 */
export interface ComponentEventPayload {
  readonly action: string;
  readonly detail: Record<string, unknown>;
}

/**
 * Callback signature for the RuntimeBridge's mount/unmount
 * lifecycle hooks.
 *
 * The GenicElement calls these during connectedCallback and
 * disconnectedCallback. The actual WebSocket communication
 * is implemented by the Runtime Engine (F29).
 */
export interface RuntimeBridgeCallbacks {
  /** Called during connectedCallback — component is ready. */
  onMount?(componentId: string): void;

  /** Called during disconnectedCallback — component removed. */
  onUnmount?(componentId: string): void;

  /** Called when a child dispatches a composed event. */
  onEvent?(componentId: string, payload: ComponentEventPayload): void;
}

/**
 * Stub interface for the Runtime Bridge.
 *
 * In the circular dependency between F21 (GenicElement) and
 * F29 (Runtime Engine), the GenicElement depends on the
 * RuntimeBridge to communicate with the server, but the Runtime
 * Engine depends on GenicElement to render components.
 *
 * We break the cycle by injecting a RuntimeBridge via
 * `GenicElement.setRuntimeBridge()`. The F29 implementation
 * provides a concrete RuntimeBridge that handles WebSocket
 * communication.
 *
 * @see {F21} — GenicElement base class
 * @see {F29} — Runtime engine (mount, patch, lifecycle)
 */
export interface RuntimeBridge extends RuntimeBridgeCallbacks {
  /**
   * Called when the element is connected to the DOM.
   * The runtime should register the component and
   * subscribe to WebSocket frames for this componentId.
   */
  onMount(componentId: string): void;

  /**
   * Called when the element is disconnected from the DOM.
   * The runtime should clean up the channel subscription
   * and emit `channel.closed`.
   */
  onUnmount(componentId: string): void;

  /**
   * Called when a child element dispatches a composed event.
   * The runtime should emit a COMPONENT_EVENT frame.
   */
  onEvent(componentId: string, payload: ComponentEventPayload): void;
}
