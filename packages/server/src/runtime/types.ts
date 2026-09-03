/**
 * Server-side event application types — F24.
 *
 * @module @genicui/server/runtime
 *
 * @see {F24} — Server-side event application
 */

import type { Operation } from 'fast-json-patch';

/**
 * Options for applying an event to canonical state.
 */
export interface ApplyEventOptions {
  /** The component channel (same as componentId). */
  channel: string;
  /** The component identifier. */
  componentId: string;
  /** Monotonic sequence number for this frame. */
  seq: bigint;
  /** RFC 6902 JSON-Patch operations to apply. */
  patches: Operation[];
}

/**
 * Result of a successful event application.
 */
export interface ApplyEventResult {
  /** Type of frame emitted: delta (patch) or snapshot (full state). */
  type: 'STATE_DELTA' | 'STATE_SNAPSHOT';
  /** Patch operations (for STATE_DELTA). */
  patch?: Operation[];
  /** Full state snapshot (for STATE_SNAPSHOT). */
  snapshot?: Record<string, unknown>;
  /** The sequence number assigned to this frame. */
  seq: bigint;
}

/**
 * Error result when an event application fails.
 */
export interface ApplyEventError {
  /** JSON-RPC error code. */
  code: number;
  /** Human-readable error message. */
  message: string;
  /** Field-level details (if applicable). */
  details?: string[];
}

/**
 * Dispatch for a successful application or an error.
 */
export type ApplyEventOutcome =
  | ApplyEventResult
  | { error: ApplyEventError };
