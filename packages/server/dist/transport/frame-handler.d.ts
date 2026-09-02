/**
 * Frame serialization and parsing for the WebSocket transport.
 *
 * Handles parsing inbound frames (JSON → FrameEnvelope) with prototype-key
 * sanitization, and serializing outbound frames (FrameEnvelope → JSON) with
 * bigint support.
 *
 * @module @genicui/server/transport/frame-handler
 *
 * @see {F11} — Frame envelope + channel multiplexing
 * @see {F11-AC1} — Single-line JSON, monotonic seq
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
import type { FrameEnvelope } from '@genicui/core';
/**
 * WebSocket close code for protocol error (malformed frame).
 *
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
export declare const CLOSE_CODE_PROTOCOL_ERROR = 1003;
/**
 * Parse a raw inbound message into a validated FrameEnvelope.
 *
 * Accepts:
 * - A JSON string containing a valid frame envelope
 * - A pre-parsed object that passes TypeBox validation
 *
 * Returns `null` if the input is not a valid frame (caller should close
 * the WebSocket with code 1003).
 *
 * @see {F11-AC4} — Malformed frame → WS close 1003
 */
export declare function parseFrame(raw: string | unknown): FrameEnvelope | null;
/**
 * Serialize a FrameEnvelope to a JSON string for transmission over WebSocket.
 *
 * Handles bigint conversion for `seq` and `causes` fields.
 *
 * @see {F11-AC1} — Single-line JSON with monotonic seq
 */
export declare function serializeFrame(frame: FrameEnvelope): string;
//# sourceMappingURL=frame-handler.d.ts.map