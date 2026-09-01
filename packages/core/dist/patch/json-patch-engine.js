/**
 * JSON-Patch engine — thin wrapper around fast-json-patch.
 *
 * - `diff(before, after)` generates RFC 6902 operations.
 * - `apply(patch, target)` applies RFC 6902 operations immutably
 *   (never mutates the target, uses `{ mutate: false }`).
 * - Detects non-serializable values (Date, Map, Set, ...) during
 *   diff and throws `NonSerializableError` so the caller can fall
 *   back to STATE_SNAPSHOT.
 *
 * @module @genicui/core/patch/json-patch-engine
 * @see {F4} — JSON-Patch engine wrapper
 */
import { compare, applyPatch } from 'fast-json-patch';
import { NonSerializableError, findNonSerializableType } from './types.js';
/**
 * JSON-Patch engine that wraps fast-json-patch with GenicUI
 * constraints: immutable apply ({ mutate: false }) and
 * non-serializable value detection.
 *
 * @see {F4-AC1} — RFC 6902 with { mutate: false }
 * @see {F4-AC2} — apply(diff(a, b), a) === b
 * @see {F4-AC4} — Date/Map fallback
 */
export class JsonPatchEngine {
    /**
     * Generate RFC 6902 JSON-Patch operations to transform `before`
     * into `after`.
     *
     * If either `before` or `after` contains non-serializable values
     * (Date, Map, Set, RegExp, Function, ...), throws
     * `NonSerializableError`. The caller should fall back to emitting
     * a STATE_SNAPSHOT event instead.
     *
     * @param before — the original state
     * @param after — the desired new state
     * @returns RFC 6902 operations array
     * @throws {NonSerializableError} if a non-serializable value is found
     *
     * @see {F4-AC1} — RFC 6902 patch generation
     * @see {F4-AC4} — non-serializable detection
     */
    diff(before, after) {
        // Check both inputs for non-serializable values (F4-AC4).
        const beforeType = findNonSerializableType(before);
        if (beforeType) {
            throw new NonSerializableError(beforeType);
        }
        const afterType = findNonSerializableType(after);
        if (afterType) {
            throw new NonSerializableError(afterType);
        }
        // fast-json-patch.compare requires objects.
        // If either side is not an object/array, wrap both in a container
        // so the patch operates on a consistent shape.
        const needsWrap = before === null || after === null ||
            (typeof before !== 'object' && !Array.isArray(before)) ||
            (typeof after !== 'object' && !Array.isArray(after));
        if (needsWrap) {
            before = { _value: before };
            after = { _value: after };
        }
        // fast-json-patch.compare returns RFC 6902 operations.
        const ops = compare(before, after);
        // compare() returns null when objects are identical.
        return ops ?? [];
    }
    /**
     * Apply RFC 6902 JSON-Patch operations to `target`, returning
     * an immutable result. The original `target` is never mutated.
     *
     * Uses fast-json-patch's `applyPatch` with `{ mutate: false }`
     * to guarantee immutability, and `{ banProto: true }` to
     * prevent prototype pollution.
     *
     * @param patch — RFC 6902 operations array
     * @param target — the state to patch
     * @returns the patched result (new object, original unchanged)
     *
     * @see {F4-AC1} — { mutate: false }
     * @see {F4-AC2} — round-trip correctness
     */
    apply(patch, target) {
        // fast-json-patch.applyPatch requires objects.
        // If the target is a primitive, wrap it in a container to match
        // what diff() did. Unwrap the result afterward.
        const needsWrap = target === null ||
            (typeof target !== 'object' && !Array.isArray(target));
        const document = needsWrap
            ? { _value: target }
            : target;
        // applyPatch with banProto: true prevents __proto__ pollution.
        // mutate: false ensures the original is never mutated.
        const results = applyPatch(document, patch, true, // validate
        false, // mutate (false = immutable)
        true);
        // applyPatch returns OperationResult[]; each result.newDocument
        // is the state after that operation. The last one is the final state.
        const finalResult = results[results.length - 1];
        const patched = finalResult.newDocument;
        // Unwrap if the target was wrapped.
        return needsWrap ? patched._value : patched;
    }
}
//# sourceMappingURL=json-patch-engine.js.map