/**
 * Frame envelope helper and channel validation.
 *
 * Constructs wire protocol envelopes and validates channel names.
 *
 * @module @genicui/core/protocol/envelope
 * @see {F3} — Protocol envelope + sequence generator
 */
import type { FrameEnvelope } from './types.js';
/**
 * Arguments for creating a frame envelope.
 */
export interface EnvelopeArgs {
    channel: string;
    type: string;
    payload: unknown;
    seq: bigint;
    causes?: bigint[];
}
/**
 * Validates that a channel name is not reserved.
 *
 * @param channel - The channel name to validate.
 * @throws {GenicUIError} with code -32008 if the channel is reserved.
 */
export declare function validateChannel(channel: string): void;
/**
 * Creates a wire protocol frame envelope.
 *
 * @param args - Envelope arguments.
 * @returns A valid FrameEnvelope.
 * @throws {GenicUIError} if the channel is reserved.
 */
export declare function envelope(args: EnvelopeArgs): FrameEnvelope;
/**
 * TypeBox schema for a valid channel name.
 */
export declare const ChannelSchema: import("@sinclair/typebox").TString;
/**
 * TypeBox schema for AG-UI event types.
 */
export declare const EventTypeSchema: import("@sinclair/typebox").TString;
//# sourceMappingURL=envelope.d.ts.map