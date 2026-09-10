/**
 * JSON-Patch engine barrel export.
 *
 * @module @genicui/core/patch
 * @see {F4} — JSON-Patch engine wrapper
 */

export { JsonPatchEngine } from './json-patch-engine.js';
export {
  NonSerializableError,
  hasNonSerializable,
  findNonSerializableType,
} from './types.js';
export type { JsonPatchOperation } from './types.js';
