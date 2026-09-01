/**
 * JSON-Patch engine property-based tests.
 *
 * Fast-check 10K random object pairs round-trip:
 * apply(diff(a, b), a) === b for all pairs.
 *
 * @see {F4-AC3} — 10K random pairs round-trip (fast-check)
 */
import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { JsonPatchEngine } from './json-patch-engine.js';
describe('JsonPatchEngine property tests', () => {
    // ----------------------------------------------------------------
    // F4-AC3: 10K random pairs round-trip
    // ----------------------------------------------------------------
    it('F4-AC3: apply(diff(a, b), a) === b for 10K random pairs', () => {
        const engine = new JsonPatchEngine();
        fc.assert(fc.property(fc.jsonValue(), fc.jsonValue(), (a, b) => {
            const patch = engine.diff(a, b);
            const result = engine.apply(patch, a);
            expect(result).toEqual(b);
        }), { numRuns: 10_000 });
    });
    // ----------------------------------------------------------------
    // Additional property: diff(a, a) returns empty patch
    // ----------------------------------------------------------------
    it('diff(a, a) always returns an empty patch', () => {
        const engine = new JsonPatchEngine();
        fc.assert(fc.property(fc.jsonValue(), (a) => {
            const patch = engine.diff(a, a);
            expect(patch).toEqual([]);
        }), { numRuns: 1_000 });
    });
    // ----------------------------------------------------------------
    // Property: applying patch twice should not crash (idempotency check)
    // ----------------------------------------------------------------
    it('apply(diff(a, b), b) should not mutate b', () => {
        const engine = new JsonPatchEngine();
        fc.assert(fc.property(fc.jsonValue(), fc.jsonValue(), (a, b) => {
            const bCopy = JSON.parse(JSON.stringify(b));
            const patch = engine.diff(a, b);
            engine.apply(patch, b);
            // b should be unchanged
            expect(b).toEqual(bCopy);
        }), { numRuns: 1_000 });
    });
});
//# sourceMappingURL=json-patch-engine.property.test.js.map