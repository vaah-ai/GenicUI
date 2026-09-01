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
import type { Operation } from 'fast-json-patch';
/**
 * JSON-Patch engine that wraps fast-json-patch with GenicUI
 * constraints: immutable apply ({ mutate: false }) and
 * non-serializable value detection.
 *
 * @see {F4-AC1} — RFC 6902 with { mutate: false }
 * @see {F4-AC2} — apply(diff(a, b), a) === b
 * @see {F4-AC4} — Date/Map fallback
 */
export declare class JsonPatchEngine {
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
    diff(before: unknown, after: unknown): Operation[];
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
    apply(patch: Operation[], target: unknown): unknown;
}
//# sourceMappingURL=json-patch-engine.d.ts.map