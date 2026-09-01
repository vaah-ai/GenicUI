/**
 * Frame envelope helper and channel validation.
 *
 * Constructs wire protocol envelopes and validates channel names.
 *
 * @module @genicui/core/protocol/envelope
 * @see {F3} — Protocol envelope + sequence generator
 */
import { Type } from '@sinclair/typebox';
import { PROTOCOL_VERSION, RESERVED_CHANNELS, ERROR_CODE_RESERVED_CHANNEL, GenicUIError, AG_UI_EVENT_TYPES, } from './types.js';
/**
 * Validates that a channel name is not reserved.
 *
 * @param channel - The channel name to validate.
 * @throws {GenicUIError} with code -32008 if the channel is reserved.
 */
export function validateChannel(channel) {
    if (RESERVED_CHANNELS.has(channel)) {
        throw new GenicUIError(ERROR_CODE_RESERVED_CHANNEL, `Channel "${channel}" is reserved and cannot be used for components`);
    }
}
/**
 * Creates a wire protocol frame envelope.
 *
 * @param args - Envelope arguments.
 * @returns A valid FrameEnvelope.
 * @throws {GenicUIError} if the channel is reserved.
 */
export function envelope(args) {
    validateChannel(args.channel);
    const ret = {
        v: PROTOCOL_VERSION,
        channel: args.channel,
        type: args.type,
        payload: args.payload,
        seq: args.seq,
    };
    if (args.causes !== undefined) {
        ret.causes = args.causes;
    }
    return ret;
}
/**
 * TypeBox schema for a valid channel name.
 */
export const ChannelSchema = Type.String({
    minLength: 1,
    maxLength: 128,
    pattern: '^[^\\x00-\\x1f]+$',
    description: 'Channel name — no control characters, not reserved',
});
/**
 * TypeBox schema for AG-UI event types.
 */
export const EventTypeSchema = Type.String({
    minLength: 1,
    maxLength: 64,
    description: 'AG-UI / GenicUI event type',
    enum: AG_UI_EVENT_TYPES,
});
//# sourceMappingURL=envelope.js.map