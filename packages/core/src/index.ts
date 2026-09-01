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
export const VERSION: string = "0.1.0";

// F2 — GenicSchema abstraction exports
export { genicSchema, createGenicSchema } from './schema/genic-schema.js';
export type {
  GenicSchemaOptions,
  GenicSchemaResult,
  GenicSchemaBuilder,
  JSONSchema2020_12,
} from './schema/types.js';

// F3 — Protocol envelope + sequence generator exports
export {
  SequenceGenerator,
  envelope,
  validateChannel,
  FrameBuffer,
  PROTOCOL_VERSION,
  RESERVED_CHANNELS,
  ERROR_CODE_RESERVED_CHANNEL,
  MAX_CHANNELS_PER_SOCKET,
  AG_UI_EVENT_TYPES,
  FrameEnvelopeSchema,
  GenicUIError,
} from './protocol/index.js';
export type {
  FrameEnvelope,
  FrameBufferResult,
  AGUIEventType,
} from './protocol/index.js';

// F4 — JSON-Patch engine wrapper exports
export {
  JsonPatchEngine,
  NonSerializableError,
  hasNonSerializable,
  findNonSerializableType,
} from './patch/index.js';
export type { JsonPatchOperation } from './patch/index.js';
