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
export class NonSerializableError extends Error {
  constructor(
    /** The type of the non-serializable value (e.g. "Date", "Map"). */
    public readonly valueType: string,
  ) {
    super(
      `Non-serializable value of type ${valueType} encountered during diff. ` +
        `Caller should emit STATE_SNAPSHOT instead of a patch.`,
    );
    this.name = 'NonSerializableError';
  }
}

/**
 * Set of value types that are not JSON-serializable and therefore
 * cannot be reliably represented in RFC 6902 patches.
 */
const NON_SERIALIZABLE_TYPES = new Set([
  'Date',
  'Map',
  'Set',
  'RegExp',
  'Function',
  'Promise',
  'WeakMap',
  'WeakSet',
]);

/**
 * Returns `true` if the given value is not reliably JSON-serializable
 * (Date, Map, Set, RegExp, Function, Promise, WeakMap, WeakSet).
 *
 * The caller should fall back to STATE_SNAPSHOT when this returns `true`.
 *
 * @see {F4-AC4} — Date/Map fallback detection
 */
export function hasNonSerializable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const ctor = (value as object).constructor;
  if (ctor && NON_SERIALIZABLE_TYPES.has(ctor.name)) {
    return true;
  }

  // Recurse into arrays and plain objects
  if (Array.isArray(value)) {
    return value.some((item) => hasNonSerializable(item));
  }

  // For plain objects, recurse into values
  if (ctor.name === 'Object') {
    return Object.values(value).some((v) => hasNonSerializable(v));
  }

  // For other object types (e.g. class instances), check constructor name
  if (ctor && NON_SERIALIZABLE_TYPES.has(ctor.name)) {
    return true;
  }

  return false;
}

/**
 * Returns the constructor name of a non-serializable value, or
 * `null` if the value is JSON-serializable.
 *
 * Used by JsonPatchEngine.diff() to determine which value type
 * triggered the NonSerializableError.
 */
export function findNonSerializableType(
  value: unknown,
): string | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const ctor = (value as object).constructor;
  if (ctor && NON_SERIALIZABLE_TYPES.has(ctor.name)) {
    return ctor.name;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findNonSerializableType(item);
      if (result) return result;
    }
  }

  if (ctor.name === 'Object') {
    for (const v of Object.values(value)) {
      const result = findNonSerializableType(v);
      if (result) return result;
    }
  }

  if (ctor && NON_SERIALIZABLE_TYPES.has(ctor.name)) {
    return ctor.name;
  }

  return null;
}
