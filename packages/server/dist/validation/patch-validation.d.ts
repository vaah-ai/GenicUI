/**
 * Patch path validation — ensures each JSON-Patch operation path exists
 * in the current state before applying.
 *
 * @module @genicui/server/validation/patch-validation
 * @see {F14-AC4} — Patch op with invalid path -> -32004
 */
import type { JsonPatchOperation } from '@genicui/core';
/**
 * Result of patch path validation.
 */
export interface PatchValidationResult {
    /** `true` if all patch paths are valid. */
    readonly valid: boolean;
    /** The first invalid path found (if any). */
    readonly invalidPath: string | null;
    /** JSON-RPC error code (only when `valid` is `false`). */
    readonly code: number;
    /** Error message name (only when `valid` is `false`). */
    readonly message: string;
}
/**
 * Validate a single JSON-Patch operation path against the current state.
 *
 * For 'add' operations, the path may not exist (it's creating a new property).
 * For 'replace', 'test', and 'remove' operations, the path must exist in the state.
 * For 'move' and 'copy', the 'from' path must exist.
 *
 * @param op — the JSON-Patch operation to validate
 * @param state — the current state object
 * @returns validation result
 *
 * @see {F14-AC4} — invalid patch path -> -32004
 */
export declare function validatePatchPath(op: JsonPatchOperation, state: unknown): PatchValidationResult;
/**
 * Validate all JSON-Patch operations against the current state.
 *
 * Returns the first validation failure found, or success if all ops pass.
 *
 * @param ops — the array of JSON-Patch operations
 * @param state — the current state object
 * @returns validation result for the first invalid operation
 */
export declare function validatePatchOperations(ops: JsonPatchOperation[], state: unknown): PatchValidationResult;
//# sourceMappingURL=patch-validation.d.ts.map