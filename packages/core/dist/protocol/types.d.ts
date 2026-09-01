/**
 * Protocol envelope types.
 *
 * @module @genicui/core/protocol/types
 * @see {F3} — Protocol envelope + sequence generator
 */
import type { TSchema } from '@sinclair/typebox';
/** Protocol version — always 1 for genicui.v1. */
export declare const PROTOCOL_VERSION: 1;
/**
 * Reserved channel names that cannot be used for component channels.
 * Attempting to use these returns error -32008 (surface_unavailable).
 */
export declare const RESERVED_CHANNELS: Set<string>;
/**
 * JSON-RPC error code for reserved channel usage.
 * -32008 surface_unavailable
 */
export declare const ERROR_CODE_RESERVED_CHANNEL: -32008;
/** Maximum channels per WebSocket socket. */
export declare const MAX_CHANNELS_PER_SOCKET: 256;
/**
 * AG-UI + GenicUI event type names.
 * Enumerated in consolidated-requirements.md §E.
 */
export declare const AG_UI_EVENT_TYPES: readonly ["RUN_STARTED", "RUN_FINISHED", "RUN_ERROR", "TOOL_CALL_STARTED", "TOOL_CALL_ARGS", "TOOL_CALL_END", "TOOL_CALL_RESULT", "STATE_SNAPSHOT", "STATE_DELTA", "COMPONENT_MOUNTED", "COMPONENT_UPDATED", "COMPONENT_UNMOUNTED", "COMPONENT_EVENT", "SURFACE_READY", "SURFACE_ERROR"];
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
export declare const FrameEnvelopeSchema: TSchema;
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
export declare class GenicUIError extends Error {
    /** JSON-RPC error code. */
    readonly code: number;
    constructor(
    /** JSON-RPC error code. */
    code: number, message: string);
}
//# sourceMappingURL=types.d.ts.map