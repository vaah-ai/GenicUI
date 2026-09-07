/**
 * Trust-boundary validation barrel export.
 *
 * @module @genicui/server/validation
 * @see {F14} — Trust-boundary validation
 */

// F14-AC1: Prototype pollution defense
export { stripProtoKeys, hasProtoKeys } from './strip-proto-keys.js';

// F43: MCP-array unwrapping for component props
export {
  unwrapMcpArrays,
  unwrapMcpArrayProps,
} from './unwrap-mcp-arrays.js';

// F14-AC2: Schema validation with field-level details
export {
  validateToolInput,
  checkToolInput,
} from './schema-validation.js';
export type { ValidationResult } from './schema-validation.js';

// F14-AC3: Reject open schemas at registry load
export {
  rejectOpenSchemas,
  RegistryValidationError,
} from './registry-validation.js';

// F14-AC4: Patch path validation
export {
  validatePatchPath,
  validatePatchOperations,
} from './patch-validation.js';
export type {
  PatchValidationResult,
} from './patch-validation.js';
