/**
 * GenicUI Client — barrel exports.
 *
 * @module @genicui/client
 */

export { GenicElement } from './genic-element.js';
export type {
  GenicElementProps,
  ComponentEventPayload,
  RuntimeBridge,
  RuntimeBridgeCallbacks,
} from './types.js';

// F29 — Runtime engine exports
export { createRuntime, RuntimeEngine } from './runtime/index.js';
export type {
  RuntimeFrameType,
  RuntimeFrame,
  RuntimeOptions,
  MountResult,
  PatchResult,
  ComponentState,
  SnapshotPayload,
  DeltaPayload,
} from './runtime/index.js';
