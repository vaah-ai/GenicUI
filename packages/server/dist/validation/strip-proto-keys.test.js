/**
 * Trust-boundary validation — prototype pollution defense tests.
 *
 * @module @genicui/server/validation/strip-proto-keys.test
 * @see {F14-AC1} — __proto__/constructor/prototype stripped
 */
import { describe, it, expect } from 'bun:test';
import { stripProtoKeys, hasProtoKeys } from './strip-proto-keys.js';
// ---------------------------------------------------------------------------
// F14-AC1: __proto__/constructor/prototype stripped
// ---------------------------------------------------------------------------
describe('F14-AC1: prototype pollution keys stripped', () => {
    describe('stripProtoKeys', () => {
        /**
         * Helper to create an object with a literal __proto__ key.
         * JS object literals treat __proto__ as prototype assignment,
         * so we use Object.defineProperty to create a true own property.
         */
        function createWithProtoKey(obj) {
            const copy = { ...obj };
            Object.defineProperty(copy, '__proto__', { value: { isAdmin: true }, enumerable: true, writable: true, configurable: true });
            return copy;
        }
        it('strips __proto__ from top-level object', () => {
            const input = createWithProtoKey({ name: 'test' });
            const result = stripProtoKeys(input);
            expect(result).not.toHaveProperty('__proto__.isAdmin');
            expect(result).toHaveProperty('name', 'test');
            // Verify the prototype is not polluted
            const plainResult = result;
            expect(plainResult['isAdmin']).toBeUndefined();
        });
        it('strips constructor from top-level object', () => {
            const input = { name: 'test', constructor: { valueOf: () => 'hacked' } };
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(plainResult['name']).toBe('test');
            expect(plainResult['constructor']).toBeUndefined();
        });
        it('strips prototype from top-level object', () => {
            const input = { name: 'test', prototype: { hacked: true } };
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(plainResult['name']).toBe('test');
            expect(plainResult['prototype']).toBeUndefined();
        });
        it('strips all three keys at once', () => {
            const input = createWithProtoKey({
                name: 'test',
                constructor: { valueOf: () => 'hacked' },
                prototype: { hacked: true },
            });
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(plainResult['name']).toBe('test');
            expect(plainResult['__proto__']).toBeUndefined();
            expect(plainResult['constructor']).toBeUndefined();
            expect(plainResult['prototype']).toBeUndefined();
        });
        it('strips keys from nested objects', () => {
            const nested = createWithProtoKey({ rows: [] });
            const input = { props: nested };
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(plainResult['props']['__proto__']).toBeUndefined();
            expect(plainResult['props']['rows']).toEqual([]);
        });
        it('strips keys from deeply nested objects', () => {
            const level3 = createWithProtoKey({ data: 'safe' });
            const input = {
                level1: {
                    level2: {
                        level3,
                    },
                },
            };
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(plainResult['level1']['level2']['level3']['__proto__']).toBeUndefined();
            expect(plainResult['level1']['level2']['level3']['data']).toBe('safe');
        });
        it('strips keys from array elements', () => {
            const arrElement = createWithProtoKey({ name: 'first' });
            const input = [arrElement];
            const result = stripProtoKeys(input);
            const arr = result;
            expect(arr[0]).not.toHaveProperty('__proto__');
            expect(arr[0]['name']).toBe('first');
        });
        it('returns primitives as-is', () => {
            expect(stripProtoKeys('hello')).toBe('hello');
            expect(stripProtoKeys(42)).toBe(42);
            expect(stripProtoKeys(true)).toBe(true);
            expect(stripProtoKeys(null)).toBe(null);
            expect(stripProtoKeys(undefined)).toBe(undefined);
        });
        it('does not mutate the input', () => {
            const input = createWithProtoKey({ name: 'test' });
            // Verify input still has __proto__ as an own property
            expect(Object.hasOwn(input, '__proto__')).toBe(true);
            const result = stripProtoKeys(input);
            // Result should not have __proto__
            const plainResult = result;
            expect(plainResult['__proto__']).toBeUndefined();
            expect(plainResult['name']).toBe('test');
        });
        it('handles empty objects', () => {
            const result = stripProtoKeys({});
            expect(result).toEqual({});
        });
        it('handles objects with only prototype keys', () => {
            const input = createWithProtoKey({});
            const result = stripProtoKeys(input);
            const plainResult = result;
            expect(Object.keys(plainResult)).toHaveLength(0);
        });
    });
    describe('hasProtoKeys', () => {
        function createWithProtoKey(obj) {
            const copy = { ...obj };
            Object.defineProperty(copy, '__proto__', { value: { isAdmin: true }, enumerable: true, writable: true, configurable: true });
            return copy;
        }
        it('returns true for __proto__ key', () => {
            expect(hasProtoKeys(createWithProtoKey({}))).toBe(true);
        });
        it('returns true for constructor key', () => {
            expect(hasProtoKeys({ constructor: { valueOf: () => 'hacked' } })).toBe(true);
        });
        it('returns true for prototype key', () => {
            expect(hasProtoKeys({ prototype: { hacked: true } })).toBe(true);
        });
        it('returns false for clean objects', () => {
            expect(hasProtoKeys({ name: 'test', value: 42 })).toBe(false);
        });
        it('returns true for nested proto keys', () => {
            expect(hasProtoKeys({
                props: createWithProtoKey({}),
            })).toBe(true);
        });
        it('returns false for primitives', () => {
            expect(hasProtoKeys('hello')).toBe(false);
            expect(hasProtoKeys(42)).toBe(false);
            expect(hasProtoKeys(null)).toBe(false);
        });
    });
});
//# sourceMappingURL=strip-proto-keys.test.js.map