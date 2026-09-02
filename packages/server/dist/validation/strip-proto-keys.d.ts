/**
 * Prototype pollution defense — strips `__proto__`, `constructor`, `prototype` keys
 * recursively from inbound payloads.
 *
 * @module @genicui/server/validation/strip-proto-keys
 * @see {F14-AC1} — __proto__/constructor/prototype stripped
 */
/**
 * Recursively removes prototype pollution keys from an object or array.
 *
 * Returns a new object/array — never mutates the input.
 * Non-object values (null, primitives) are returned as-is.
 *
 * Uses `Object.create(null)` to prevent prototype leakage in V8.
 *
 * @param obj — the value to sanitize
 * @returns a sanitized copy with prototype pollution keys removed
 *
 * @see {F14-AC1} — prototype pollution defense
 */
export declare function stripProtoKeys<T>(obj: T): T;
/**
 * Checks if the given object contains any prototype pollution keys.
 * Returns `true` if `__proto__`, `constructor`, or `prototype` is found
 * anywhere in the object tree.
 *
 * @param obj — the value to check
 * @returns `true` if prototype pollution keys are detected
 */
export declare function hasProtoKeys(obj: unknown): boolean;
//# sourceMappingURL=strip-proto-keys.d.ts.map