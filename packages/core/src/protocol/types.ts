/**
 * Protocol envelope types.
 *
 * @module @genicui/core/protocol/types
 * @see {F3} — Protocol envelope + sequence generator
 */

import type { TSchema, Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

/** Protocol version — always 1 for genicui.v1. */
export const PROTOCOL_VERSION = 1 as const;

/**
 * Reserved channel names that cannot be used for component channels.
 * Attempting to use these returns error -32008 (surface_unavailable).
 */
export const RESERVED_CHANNELS = new Set([
  '__session__',
  '__mcp__',
  '__agent__',
]);

/**
 * JSON-RPC error code for reserved channel usage.
 * -32008 surface_unavailable
 */
export const ERROR_CODE_RESERVED_CHANNEL = -32008 as const;

/** Maximum channels per WebSocket socket. */
export const MAX_CHANNELS_PER_SOCKET = 256 as const;

/**
 * AG-UI + GenicUI event type names.
 * Enumerated in consolidated-requirements.md §E.
 */
export const AG_UI_EVENT_TYPES = [
  // Server lifecycle
  'RUN_STARTED',
  'RUN_FINISHED',
  'RUN_ERROR',
  // Tool call lifecycle
  'TOOL_CALL_STARTED',
  'TOOL_CALL_ARGS',
  'TOOL_CALL_END',
  'TOOL_CALL_RESULT',
  // State
  'STATE_SNAPSHOT',
  'STATE_DELTA',
  // GenicUI extensions
  'COMPONENT_MOUNTED',
  'COMPONENT_UPDATED',
  'COMPONENT_UNMOUNTED',
  'COMPONENT_EVENT',
  'SURFACE_READY',
  'SURFACE_ERROR',
] as const;

/**
 * A recognized wire protocol event type.
 */
export type AGUIEventType = (typeof AG_UI_EVENT_TYPES)[number];

/**
 * Wire protocol frame envelope.
 *
 * Every frame sent over the WebSocket carries this envelope:
 * - `v`: protocol version (always 1)
 * - `channel`: componentId or reserved channel name
 * - `type`: AG-UI / GenicUI event type
 * - `payload`: event-specific data
 * - `seq`: monotonic uint64 sequence number
 * - `causes`: optional causal references to prior sequence numbers
 *
 * @see {F3} — Frame envelope
 */
export interface FrameEnvelope {
  v: typeof PROTOCOL_VERSION;
  channel: string;
  type: string;
  payload: unknown;
  seq: bigint;
  causes?: bigint[];
}

/**
 * TypeBox schema for FrameEnvelope.
 * Used for runtime validation of inbound frames.
 */
export const FrameEnvelopeSchema: TSchema = Type.Object(
  {
    v: Type.Union([Type.Literal(1)], {
      description: 'Protocol version, must be 1',
    }),
    channel: Type.String({
      minLength: 1,
      maxLength: 128,
      description: 'Component ID or reserved channel name',
    }),
    type: Type.String({
      minLength: 1,
      maxLength: 64,
      description: 'AG-UI / GenicUI event type',
    }),
    payload: Type.Unknown({
      description: 'Event-specific payload data',
    }),
    seq: Type.Unknown({
      description: 'Monotonic uint64 sequence number (bigint at runtime)',
    }),
    causes: Type.Optional(
      Type.Array(
        Type.Unknown({
          description: 'Causal reference sequence numbers (bigint at runtime)',
        }),
      ),
    ),
  },
  {
    $schema: 'http://json-schema.org/draft-2020-12/schema',
    additionalProperties: false,
    description: 'GenicUI wire protocol frame envelope',
  },
);

/**
 * Result of buffering frames: frames dispatched in order.
 */
export interface FrameBufferResult {
  /** Frames flushed in sequence order. */
  frames: FrameEnvelope[];
  /** Sequence number expected next for this channel. */
  nextExpectedSeq: bigint;
}

/**
 * Error thrown when a reserved channel is used for a component.
 */
export class GenicUIError extends Error {
  constructor(
    /** JSON-RPC error code. */
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'GenicUIError';
  }
}
