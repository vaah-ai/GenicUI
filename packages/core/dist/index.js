/**
 * GenicUI Core — shared types and constants.
 *
 * @module @genicui/core
 */
/**
 * Package version string.
 * Updated automatically by release tooling; manually synced for now.
 *
 * @see {F1-AC2} — ESM resolution test
 */
export const VERSION = "0.1.0";
// F2 — GenicSchema abstraction exports
export { genicSchema, createGenicSchema } from './schema/genic-schema.js';
// F3 — Protocol envelope + sequence generator exports
export { SequenceGenerator, envelope, validateChannel, FrameBuffer, PROTOCOL_VERSION, RESERVED_CHANNELS, ERROR_CODE_RESERVED_CHANNEL, MAX_CHANNELS_PER_SOCKET, AG_UI_EVENT_TYPES, FrameEnvelopeSchema, GenicUIError, } from './protocol/index.js';
// F4 — JSON-Patch engine wrapper exports
export { JsonPatchEngine, NonSerializableError, hasNonSerializable, findNonSerializableType, } from './patch/index.js';
// F5 — SessionStore interface + InMemoryStore exports
export { InMemoryStore } from './session/index.js';
//# sourceMappingURL=index.js.map