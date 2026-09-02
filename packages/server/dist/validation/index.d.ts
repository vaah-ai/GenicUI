/**
 * Trust-boundary validation barrel export.
 *
 * @module @genicui/server/validation
 * @see {F14} — Trust-boundary validation
 */
export { stripProtoKeys, hasProtoKeys } from './strip-proto-keys.js';
export { validateToolInput, checkToolInput, } from './schema-validation.js';
export type { ValidationResult } from './schema-validation.js';
export { rejectOpenSchemas, RegistryValidationError, } from './registry-validation.js';
export { validatePatchPath, validatePatchOperations, } from './patch-validation.js';
export type { PatchValidationResult, } from './patch-validation.js';
//# sourceMappingURL=index.d.ts.map