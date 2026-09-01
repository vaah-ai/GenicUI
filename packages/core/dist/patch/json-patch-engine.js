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
        // fast-json-patch.compare requires objects or arrays on both sides.
        // When types are different (e.g. primitive → object, array → string),
        // the simplest correct approach is to serialize both to JSON and back,
        // then compare the resulting objects. This handles all edge cases.
        //
        // If both are plain objects/arrays, compare directly for optimal
        // fine-grained patches.
        const beforeIsObj = before !== null &&
            (typeof before === 'object' || Array.isArray(before));
        const afterIsObj = after !== null &&
            (typeof after === 'object' || Array.isArray(after));
        if (beforeIsObj && afterIsObj) {
            // Both are objects or arrays. If one is an array and the other
            // is an object, fast-json-patch can't handle the transition
            // correctly (it generates ops that don't apply). In this case,
            // emit a full-replace patch.
            const beforeIsArray = Array.isArray(before);
            const afterIsArray = Array.isArray(after);
            if (beforeIsArray !== afterIsArray) {
                return [{ op: 'replace', path: '', value: after }];
            }
            // Both are objects or both are arrays — compare directly for
            // fine-grained ops.
            const ops = compare(before, after);
            return ops ?? [];
        }
        // Types are incompatible (e.g. null → {}, "a" → [1], 42 → "x").
        // Use a full-replace patch: remove everything, then add the new value.
        // This is the correct RFC 6902 behavior when the root type changes.
        // But if both values are equal (e.g., both are the same string), return
        // an empty patch since no change is needed.
        if (before === after) {
            return [];
        }
        return [
            { op: 'replace', path: '', value: after },
        ];
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
        // If the patch is empty (no changes), return the target as-is.
        if (patch.length === 0) {
            return target;
        }
        // If the patch contains a root replace (path: ''), it means diff()
        // determined the root type changed (e.g., null → object, array → string).
        // In this case, just return the new value directly.
        if (patch.length === 1 &&
            patch[0].op === 'replace' &&
            patch[0].path === '') {
            return patch[0].value;
        }
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