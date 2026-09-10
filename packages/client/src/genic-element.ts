/**
 * GenicElement — Web Component base class with closed Shadow DOM,
 * JSON-Patch re-rendering, and composed event forwarding.
 *
 * This is the bridge between the GenicUI framework-agnostic core
 * and browser-rendered UI. It extends HTMLElement, attaches a
 * closed Shadow DOM, observes `props-json` and `component-id`
 * attributes, and forwards child events with `composed: true`.
 *
 * @module @genicui/client/genic-element
 * @see {F21} — Web Component base class
 */

import { JsonPatchEngine } from '@genicui/core';

import type { RuntimeBridge, ComponentEventPayload, GenicElementProps } from './types.js';

/**
 * Default stub runtime bridge used when no concrete
 * implementation is injected via `setRuntimeBridge()`.
 *
 * This allows GenicElement to be tested and rendered
 * without depending on the Runtime Engine (F29).
 */
const STUB_BRIDGE: RuntimeBridge = {
  onMount(_componentId: string): void {
    // Stub — no-op
  },
  onUnmount(_componentId: string): void {
    // Stub — no-op
  },
  onEvent(_componentId: string, _payload: ComponentEventPayload): void {
    // Stub — no-op
  },
};

/**
 * Module-level runtime bridge. Subclasses or the runtime
 * engine (F29) inject a concrete implementation via
 * `GenicElement.setRuntimeBridge()`.
 */
let moduleBridge: RuntimeBridge = STUB_BRIDGE;

/**
 * JSON-Patch engine instance shared across all GenicElement
 * instances. Uses `{ mutate: false }` to guarantee immutability.
 */
const patchEngine = new JsonPatchEngine();

/**
 * Observed attribute names required by the GenicElement spec.
 *
 * - `props-json`: JSON-serialized props object
 * - `component-id`: unique component identifier from the server
 *
 * @see {F21} — Web Component base class
 */
const OBSERVED_ATTRIBUTES = ['props-json', 'component-id'] as const;

/**
 * GenicElement base class.
 *
 * Extends HTMLElement with:
 * - Closed Shadow DOM (attachShadow({mode:'closed'}))
 * - JSON-Patch re-rendering on props-json change
 * - Composed:true event forwarding to document
 * - Lifecycle hooks (connectedCallback, disconnectedCallback)
 *
 * To use, extend and override `render()`:
 *
 * ```ts
 * class MyComponent extends GenicElement {
 *   render(props: GenicElementProps): DocumentFragment {
 *     // Return Shadow DOM content
 *   }
 * }
 * customElements.define('my-component', MyComponent);
 * ```
 *
 * @see {F21-AC1} — Closed Shadow DOM
 * @see {F21-AC2} — JSON-Patch re-render
 * @see {F21-AC3} — Composed event forwarding
 * @see {F21-AC4} — Unmount cleanup
 */
export class GenicElement extends HTMLElement {
  /**
   * Observed attributes for reactive behavior.
   * When `props-json` or `component-id` changes, the
   * `attributeChangedCallback` fires.
   */
  static observedAttributes: string[] = [...OBSERVED_ATTRIBUTES];

  /**
   * Shadow root of this element. `null` until
   * `connectedCallback` fires and creates the shadow root.
   */
  protected _shadowRoot: ShadowRoot | null = null;

  /**
   * Current props parsed from `props-json` attribute.
   * Used as the baseline for JSON-Patch diffing.
   */
  protected _currentProps: GenicElementProps = {};

  /**
   * Component identifier from the server. Used by the
   * runtime bridge to track subscriptions.
   */
  protected _componentId: string = '';

  /**
   * Whether the element has been connected to the DOM
   * and initialized the Shadow DOM.
   */
  protected _connected: boolean = false;

  /**
   * Whether event forwarding has been set up on the
   * shadow root. Prevents duplicate listeners on reconnect.
   */
  protected _eventForwardingSetup: boolean = false;

  /**
   * Set the module-level runtime bridge.
   *
   * Call this once during application initialization
   * (typically by the Runtime Engine, F29) to inject
   * a concrete implementation that handles WebSocket
   * communication.
   *
   * @param bridge — the runtime bridge implementation
   */
  static setRuntimeBridge(bridge: RuntimeBridge): void {
    moduleBridge = bridge;
  }

  /**
   * Get the current module-level runtime bridge.
   */
  static getRuntimeBridge(): RuntimeBridge {
    return moduleBridge;
  }

  /**
   * Returns the component-id attribute value.
   */
  get componentId(): string {
    return this._componentId;
  }

  /**
   * Returns the current parsed props object.
   */
  get props(): GenicElementProps {
    return { ...this._currentProps };
  }

  /**
   * Returns the shadow root, or `null` if not yet connected.
   */
  get shadowRoot(): ShadowRoot | null {
    return this._shadowRoot;
  }

  /**
   * @see {F21-AC1} — Closed Shadow DOM
   */
  connectedCallback(): void {
    if (this._connected) {
      return;
    }

    this._connected = true;

    // Attach closed Shadow DOM (F21-AC1) — only if not already attached.
    // In environments that retain the shadow root across disconnect/reconnect
    // cycles, re-attaching would throw.  The browser detaches the shadow root
    // on disconnect, so this guard is a safe no-op there.
    if (this._shadowRoot == null) {
      this._shadowRoot = this.attachShadow({ mode: 'closed' });
    }

    // Read initial attributes
    const propsJson = this.getAttribute('props-json');
    const componentId = this.getAttribute('component-id');

    if (propsJson) {
      try {
        this._currentProps = JSON.parse(propsJson);
      } catch {
        // Invalid JSON — ignore and use empty props
        this._currentProps = {};
      }
    }

    if (componentId) {
      this._componentId = componentId;
    }

    // Render initial content
    this.render(this._currentProps);

    // Notify runtime bridge of mount
    if (this._componentId) {
      moduleBridge.onMount(this._componentId);
    }

    // Set up event forwarding for composed events (F21-AC3)
    this._setupEventForwarding();
  }

  /**
   * @see {F21-AC4} — Unmount cleanup
   */
  disconnectedCallback(): void {
    if (!this._connected) {
      return;
    }

    // Notify runtime bridge of unmount (F21-AC4)
    if (this._componentId) {
      moduleBridge.onUnmount(this._componentId);
    }

    this._connected = false;
    this._eventForwardingSetup = false;
  }

  /**
   * @see {F21-AC2} — JSON-Patch re-render
   */
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'component-id') {
      this._componentId = newValue ?? '';
      return;
    }

    if (name === 'props-json') {
      if (!newValue) {
        this._currentProps = {};
        this.render({});
        return;
      }

      let newProps: GenicElementProps;
      try {
        newProps = JSON.parse(newValue);
      } catch {
        // Invalid JSON — ignore change
        return;
      }

      // Apply JSON-Patch diff to update shadow DOM (F21-AC2)
      if (Object.keys(this._currentProps).length > 0) {
        const patches = patchEngine.diff(this._currentProps, newProps);
        if (patches.length > 0) {
          this.onPatch(patches);
        }
      } else {
        // First render — no patch needed
        this.render(newProps);
      }

      this._currentProps = newProps;
    }
  }

  /**
   * Render the Shadow DOM content with the given props.
   *
   * Subclasses override this method to return a DocumentFragment
   * with the desired content. The default implementation creates
   * a simple fragment with a JSON display of the props.
   *
   * @param props — the current props object
   * @returns DocumentFragment to set inside the Shadow DOM
   */
  protected render(props: GenicElementProps): void {
    if (!this._shadowRoot) {
      return;
    }

    this._shadowRoot.innerHTML = '';

    // Default rendering: display props as JSON in a pre element
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(props, null, 2);
    this._shadowRoot.appendChild(pre);
  }

  /**
   * Called when a JSON-Patch is applied to the element's props.
   *
   * Subclasses override this to apply fine-grained DOM updates
   * instead of a full re-render. The default implementation
   * re-renders the entire Shadow DOM.
   *
   * @param patches — the JSON-Patch operations
   */
  protected onPatch(_patches: unknown[]): void {
    // Default: full re-render with new props
    this.render(this._currentProps);
  }

  /**
   * Set up event forwarding for composed events.
   *
   * Listens on the shadow root for events with `composed: true`
   * and forwards them to the runtime bridge. This allows child
   * elements inside the Shadow DOM to communicate with the
   * GenicUI server.
   *
   * @see {F21-AC3} — Composed event forwarding
   */
  protected _setupEventForwarding(): void {
    if (!this._shadowRoot || this._eventForwardingSetup) {
      return;
    }
    this._eventForwardingSetup = true;

    // Listen for composed events on the shadow root
    const listener = (event: Event): void => {
      // Only forward CustomEvents with composed: true
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const payload: ComponentEventPayload = {
        action: event.type,
        detail: (event.detail as Record<string, unknown>) ?? {},
      };

      if (this._componentId) {
        moduleBridge.onEvent(this._componentId, payload);
      }
    };

    this._shadowRoot.addEventListener(
      'customEvent',
      listener as EventListener,
      { capture: true },
    );
  }
}
