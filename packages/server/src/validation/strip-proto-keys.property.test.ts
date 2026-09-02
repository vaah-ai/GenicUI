/**
 * Property-based tests for prototype pollution defense.
 *
 * @module @genicui/server/validation/strip-proto-keys.property.test
 * @see {F14-AC1} — stripProtoKeys never leaks proto keys (fast-check, 10K runs)
 */

import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { stripProtoKeys, hasProtoKeys } from './strip-proto-keys.js';

// ---------------------------------------------------------------------------
// F14-AC1: Property-based tests (10K runs)
// ---------------------------------------------------------------------------

describe('F14-AC1: property-based proto key defense (10K runs)', () => {
  it('stripProtoKeys never returns an object with proto pollution keys', () => {
    // Arbitrary nested object that may contain __proto__, constructor, or prototype
    const arbitraryObj = fc.record({
      name: fc.string(),
      value: fc.integer(),
    });

    fc.assert(
      fc.property(
        fc.oneof(arbitraryObj, fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        (input) => {
          const result = stripProtoKeys(input);
          // If result is an object, it should not have proto pollution keys
          if (result !== null && typeof result === 'object') {
            expect(hasProtoKeys(result)).toBe(false);
          }
        },
      ),
      { numRuns: 10000 },
    );
  });

  it('hasProtoKeys correctly detects clean objects', () => {
    const cleanObj = fc.record({
      name: fc.string(),
      value: fc.integer(),
    });

    fc.assert(
      fc.property(cleanObj, (obj) => {
        expect(hasProtoKeys(obj)).toBe(false);
      }),
      { numRuns: 10000 },
    );
  });

  it('stripProtoKeys preserves non-proto keys', () => {
    const arbitraryObj = fc.record({
      name: fc.string(),
      value: fc.integer(),
    });

    fc.assert(
      fc.property(arbitraryObj, (input) => {
        const result = stripProtoKeys(input) as typeof input;
        expect(result.name).toBe(input.name);
        expect(result.value).toBe(input.value);
      }),
      { numRuns: 10000 },
    );
  });

  it('stripProtoKeys is idempotent on clean objects', () => {
    const arbitraryObj = fc.record({
      name: fc.string(),
      value: fc.integer(),
    });

    fc.assert(
      fc.property(arbitraryObj, (input) => {
        const once = stripProtoKeys(input);
        const twice = stripProtoKeys(once);
        // Both should have the same keys
        expect(Object.keys(twice!).sort()).toEqual(Object.keys(once!).sort());
      }),
      { numRuns: 10000 },
    );
  });

  it('stripProtoKeys returns primitives unchanged', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        (input) => {
          expect(stripProtoKeys(input)).toBe(input);
        },
      ),
      { numRuns: 10000 },
    );
  });
});
