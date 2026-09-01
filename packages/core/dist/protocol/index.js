/**
 * Protocol envelope barrel export.
 *
 * @module @genicui/core/protocol
 * @see {F3} — Protocol envelope + sequence generator
 */
export { PROTOCOL_VERSION, RESERVED_CHANNELS, ERROR_CODE_RESERVED_CHANNEL, MAX_CHANNELS_PER_SOCKET, AG_UI_EVENT_TYPES, FrameEnvelopeSchema, GenicUIError, } from './types.js';
export { SequenceGenerator } from './sequence.js';
export { validateChannel, envelope, ChannelSchema, EventTypeSchema, } from './envelope.js';
export { FrameBuffer } from './buffer.js';
//# sourceMappingURL=index.js.map