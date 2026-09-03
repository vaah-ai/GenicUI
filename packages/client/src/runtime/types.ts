/**
 * Runtime engine types — F29.
 *
 * @module @genicui/client/runtime/types
 *
 * @see {F29} — Runtime engine (mount, patch, lifecycle)
 */

import type { JsonPatchOperation } from '@genicui/core';

/**
 * Frame types the server can emit to the client.
 *
 * @see {F29} — Runtime engine
 */
export type RuntimeFrameType =
  | 'STATE_SNAPSHOT'
  | 'STATE_DELTA'
  | 'channel.closed'
  | 'server.hello'
  | 'COMPONENT_MOUNTED'
  | 'COMPONENT_EVENT';

/**
 * A single frame received from the server over WebSocket.
 *
 * Matches the wire format: { v, channel, type, payload, seq, causes? }
 *
 * @see {F3} — Protocol envelope + sequence generator
 */
export interface RuntimeFrame {
  /** Protocol version. */
  readonly v: number;
  /** Component channel (same as componentId). */
  readonly channel: string;
  /** Frame type. */
  readonly type: RuntimeFrameType;
  /** Frame payload — shape depends on type. */
  readonly payload: unknown;
  /** Monotonic sequence number. */
  readonly seq: bigint;
  /** Causality — optional references to prior frames. */
  readonly causes?: bigint[];
}

/**
 * Configuration for the runtime engine.
 *
 * @see {F29} — Runtime engine
 */
export interface RuntimeOptions {
  /**
   * The DOM container element where components will be mounted.
   * Defaults to `document.body` if not provided.
   */
  container?: HTMLElement;

  /**
   * Callback invoked when the server sends a `server.hello` frame.
   * Receives the server.hello payload.
   */
  onHello?(payload: Record<string, unknown>): void;

  /**
   * Callback invoked when a component emits an event.
   * Receives the componentId, action, and detail.
   */
  onEvent?(componentId: string, action: string, detail: Record<string, unknown>): void;
}

/**
 * Result of a mount operation.
 *
 * @see {F29-AC1} — Mount within 50ms
 */
export interface MountResult {
  /** The component identifier. */
  componentId: string;
  /** The mounted DOM element. */
  element: HTMLElement;
  /** Time taken to mount in milliseconds. */
  mountTimeMs: number;
}

/**
 * Result of a patch operation.
 *
 * @see {F29-AC2} — Patch within 10ms
 */
export interface PatchResult {
  /** The component identifier. */
  componentId: string;
  /** Time taken to patch in milliseconds. */
  patchTimeMs: number;
}

/**
 * State of a single mounted component.
 */
export interface ComponentState {
  /** The DOM element. */
  element: HTMLElement;
  /** Current props object. */
  props: Record<string, unknown>;
}

/**
 * Parsed STATE_SNAPSHOT payload from the server.
 */
export interface SnapshotPayload {
  /** The component identifier. */
  componentId: string;
  /** Initial props to set on the component. */
  props: Record<string, unknown>;
  /** Optional schema for the component. */
  schema?: Record<string, unknown>;
}

/**
 * Parsed STATE_DELTA payload from the server.
 */
export interface DeltaPayload {
  /** The component identifier. */
  componentId: string;
  /** JSON-Patch operations to apply. */
  patch: JsonPatchOperation[];
}
