/**
 * Prototype pollution defense — strips `__proto__`, `constructor`, `prototype` keys
 * recursively from inbound payloads.
 *
 * @module @genicui/server/validation/strip-proto-keys
 * @see {F14-AC1} — __proto__/constructor/prototype stripped
 */
/** Keys that must never be allowed in inbound data. */
const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
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
export function stripProtoKeys(obj) {
    // Non-object values: return as-is
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // Arrays: recurse into each element
    if (Array.isArray(obj)) {
        return obj.map((item) => stripProtoKeys(item));
    }
    // Plain objects: filter out prototype keys, recurse into values
    const result = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
        // Skip prototype pollution keys
        if (PROTO_POLLUTION_KEYS.has(key)) {
            continue;
        }
        result[key] = stripProtoKeys(value);
    }
    return result;
}
/**
 * Checks if the given object contains any prototype pollution keys.
 * Returns `true` if `__proto__`, `constructor`, or `prototype` is found
 * anywhere in the object tree.
 *
 * @param obj — the value to check
 * @returns `true` if prototype pollution keys are detected
 */
export function hasProtoKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    if (Array.isArray(obj)) {
        return obj.some((item) => hasProtoKeys(item));
    }
    for (const key of Object.keys(obj)) {
        if (PROTO_POLLUTION_KEYS.has(key)) {
            return true;
        }
    }
    // Recurse into values
    for (const value of Object.values(obj)) {
        if (hasProtoKeys(value)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=strip-proto-keys.js.map