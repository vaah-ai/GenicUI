/**
 * Prototype pollution defense — workspace-local copy.
 *
 * Shallow-copied from `packages/server/src/validation/strip-proto-keys.ts`
 * to honor the "zero edits to packages/" rule. The function is pure
 * logic with no runtime dependencies; behaviour is identical.
 *
 * If the upstream copy changes, this file MUST be updated to match.
 * The workspace's `__tests__/validation.test.ts` exercises the same
 * 10K-random-payload property run as the core test.
 *
 * @module playground-ecommerce/server/providers/validation/strip-proto-keys
 * @see {F14-AC1} — __proto__/constructor/prototype stripped
 */

const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively removes prototype pollution keys from an object or array.
 *
 * Returns a new object/array — never mutates the input.
 * Non-object values (null, primitives) are returned as-is.
 * Uses `Object.create(null)` to prevent prototype leakage in V8.
 *
 * @see {F14-AC1} — prototype pollution defense
 */
export function stripProtoKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => stripProtoKeys(item)) as unknown as T;
  }

  const result = Object.create(null) as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (PROTO_POLLUTION_KEYS.has(key)) continue;
    result[key] = stripProtoKeys(value);
  }

  return result as unknown as T;
}

/**
 * Predicate — returns true if `obj` contains any prototype-pollution
 * key at any depth. Used at registration time as a cheap pre-check.
 */
export function hasProtoKeys(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return obj.some(hasProtoKeys);
  for (const [key, value] of Object.entries(obj)) {
    if (PROTO_POLLUTION_KEYS.has(key)) return true;
    if (value !== null && typeof value === 'object' && hasProtoKeys(value)) {
      return true;
    }
  }
  return false;
}
