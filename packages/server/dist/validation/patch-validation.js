/**
 * Patch path validation — ensures each JSON-Patch operation path exists
 * in the current state before applying.
 *
 * @module @genicui/server/validation/patch-validation
 * @see {F14-AC4} — Patch op with invalid path -> -32004
 */
import { GENICUI_ERROR_CODES } from '../mcp/tool-registry.js';
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
export function validatePatchPath(op, state) {
    const { op: operation, path, from } = op;
    // 'add' operations are always valid — they create new paths
    if (operation === 'add') {
        return { valid: true, invalidPath: null, code: 0, message: '' };
    }
    // 'replace' and 'test' — the path must exist
    if (operation === 'replace' || operation === 'test') {
        if (!pathExistsInState(path, state)) {
            return {
                valid: false,
                invalidPath: path,
                code: GENICUI_ERROR_CODES.patch_invalid,
                message: 'patch_invalid',
            };
        }
    }
    // 'remove' — the path must exist (you can't remove something that doesn't exist)
    if (operation === 'remove') {
        if (!pathExistsInState(path, state)) {
            return {
                valid: false,
                invalidPath: path,
                code: GENICUI_ERROR_CODES.patch_invalid,
                message: 'patch_invalid',
            };
        }
    }
    // 'move' and 'copy' — the 'from' path must exist
    if ((operation === 'move' || operation === 'copy') && from) {
        if (!pathExistsInState(from, state)) {
            return {
                valid: false,
                invalidPath: from,
                code: GENICUI_ERROR_CODES.patch_invalid,
                message: 'patch_invalid',
            };
        }
    }
    return { valid: true, invalidPath: null, code: 0, message: '' };
}
/**
 * Validate all JSON-Patch operations against the current state.
 *
 * Returns the first validation failure found, or success if all ops pass.
 *
 * @param ops — the array of JSON-Patch operations
 * @param state — the current state object
 * @returns validation result for the first invalid operation
 */
export function validatePatchOperations(ops, state) {
    for (let i = 0; i < ops.length; i++) {
        const result = validatePatchPath(ops[i], state);
        if (!result.valid) {
            return result;
        }
    }
    return { valid: true, invalidPath: null, code: 0, message: '' };
}
/**
 * Check if a JSON Pointer path exists in the given state object.
 *
 * Parses the path string (e.g., "/rows/0/name") and traverses the state.
 * Returns `false` if any segment doesn't exist.
 *
 * @param path — JSON Pointer path (e.g., "/rows/0/name")
 * @param state — the state object to traverse
 * @returns `true` if the path exists in the state
 */
function pathExistsInState(path, state) {
    // Empty path means root — always exists
    if (path === '' || path === '/') {
        return state !== undefined;
    }
    // Parse JSON Pointer path — remove leading '/', split by '/'
    // Each segment may contain escaped characters (~1 -> ~, ~0 -> /)
    const segments = path
        .replace(/^\//, '')
        .split('/')
        .map((segment) => segment.replace(/~1/g, '~').replace(/~0/g, '/'));
    let current = state;
    for (let i = 0; i < segments.length; i++) {
        if (current === null || typeof current !== 'object') {
            return false;
        }
        const segment = segments[i];
        current = current[segment];
        if (current === undefined) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=patch-validation.js.map