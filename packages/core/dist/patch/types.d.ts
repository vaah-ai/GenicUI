/**
 * JSON-Patch engine types.
 *
 * @module @genicui/core/patch/types
 * @see {F4} — JSON-Patch engine wrapper
 */
/**
 * RFC 6902 JSON-Patch operation.
 *
 * Per RFC 6902, the operation object has exactly five fields:
 * - `op`: one of "add", "remove", "replace", "move", "copy", "test"
 * - `path`: JSON Pointer (RFC 6901)
 * - `value`: required for add, replace, test (absent for others)
 * - `from`: required for move, copy (JSON Pointer)
 */
export interface JsonPatchOperation {
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: unknown;
    from?: string;
}
/**
 * Re-export the Operation type alias used by fast-json-patch.
 * fast-json-patch's Operation type is equivalent to RFC 6902 ops.
 */
export type { JsonPatchOperation as Operation };
/**
 * Error thrown when the engine encounters a non-serializable value
 * (Date, Map, Set, RegExp, Function, etc.) during diff.
 *
 * The caller should fall back to a STATE_SNAPSHOT event instead
 * of sending a patch over the wire.
 *
 * @see {F4-AC4} — Date/Map → STATE_SNAPSHOT fallback
 */
export declare class NonSerializableError extends Error {
    /** The type of the non-serializable value (e.g. "Date", "Map"). */
    readonly valueType: string;
    constructor(
    /** The type of the non-serializable value (e.g. "Date", "Map"). */
    valueType: string);
}
/**
 * Returns `true` if the given value is not reliably JSON-serializable
 * (Date, Map, Set, RegExp, Function, Promise, WeakMap, WeakSet).
 *
 * The caller should fall back to STATE_SNAPSHOT when this returns `true`.
 *
 * @see {F4-AC4} — Date/Map fallback detection
 */
export declare function hasNonSerializable(value: unknown): boolean;
/**
 * Returns the constructor name of a non-serializable value, or
 * `null` if the value is JSON-serializable.
 *
 * Used by JsonPatchEngine.diff() to determine which value type
 * triggered the NonSerializableError.
 */
export declare function findNonSerializableType(value: unknown): string | null;
//# sourceMappingURL=types.d.ts.map