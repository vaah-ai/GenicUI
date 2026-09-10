/**
 * Runtime engine — barrel exports.
 *
 * @module @genicui/client/runtime
 *
 * @see {F29} — Runtime engine (mount, patch, lifecycle)
 */

export { createRuntime, RuntimeEngine } from './runtime.js';
export type {
  RuntimeFrameType,
  RuntimeFrame,
  RuntimeOptions,
  MountResult,
  PatchResult,
  ComponentState,
  SnapshotPayload,
  DeltaPayload,
} from './types.js';
