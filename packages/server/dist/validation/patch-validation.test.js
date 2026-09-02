/**
 * Patch path validation tests — ensures patch targets exist before apply.
 *
 * @module @genicui/server/validation/patch-validation.test
 * @see {F14-AC4} — Patch op with invalid path -> -32004
 */
import { describe, it, expect } from 'bun:test';
import { validatePatchPath, validatePatchOperations } from './patch-validation.js';
import { GENICUI_ERROR_CODES } from '../mcp/tool-registry.js';
// ---------------------------------------------------------------------------
// F14-AC4: Patch op with invalid path -> -32004
// ---------------------------------------------------------------------------
describe('F14-AC4: patch op with invalid path -> -32004', () => {
    describe('validatePatchPath', () => {
        it('always accepts add operations', () => {
            const op = { op: 'add', path: '/newField', value: 'hello' };
            const state = { existingField: 'yes' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('accepts replace on existing path', () => {
            const op = { op: 'replace', path: '/name', value: 'new' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects replace on non-existent path', () => {
            const op = { op: 'replace', path: '/missing', value: 'new' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
            expect(result.code).toBe(GENICUI_ERROR_CODES.patch_invalid);
            expect(result.message).toBe('patch_invalid');
            expect(result.invalidPath).toBe('/missing');
        });
        it('accepts remove on existing path', () => {
            const op = { op: 'remove', path: '/name' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects remove on non-existent path', () => {
            const op = { op: 'remove', path: '/missing' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
            expect(result.code).toBe(GENICUI_ERROR_CODES.patch_invalid);
        });
        it('accepts test on existing path', () => {
            const op = { op: 'test', path: '/name', value: 'old' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects test on non-existent path', () => {
            const op = { op: 'test', path: '/missing', value: 'old' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
        });
        it('accepts move with valid from path', () => {
            const op = { op: 'move', from: '/name', path: '/renamed' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects move with invalid from path', () => {
            const op = { op: 'move', from: '/missing', path: '/target' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
            expect(result.invalidPath).toBe('/missing');
        });
        it('accepts copy with valid from path', () => {
            const op = { op: 'copy', from: '/name', path: '/duplicate' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects copy with invalid from path', () => {
            const op = { op: 'copy', from: '/missing', path: '/target' };
            const state = { name: 'old' };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
            expect(result.invalidPath).toBe('/missing');
        });
        it('handles nested paths', () => {
            const op = { op: 'replace', path: '/props/rows/0/name', value: 'new' };
            const state = { props: { rows: [{ name: 'old' }] } };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('rejects nested path when intermediate missing', () => {
            const op = { op: 'replace', path: '/props/rows/0/name', value: 'new' };
            const state = { props: { rows: [] } };
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(false);
        });
        it('accepts root path', () => {
            const op = { op: 'add', path: '/', value: {} };
            const state = {};
            const result = validatePatchPath(op, state);
            expect(result.valid).toBe(true);
        });
        it('handles JSON Pointer escape sequences (~1 -> ~, ~0 -> /)', () => {
            const state = { 'tilde~': 'val', 'slash/': 'val2' };
            const op1 = { op: 'replace', path: '/tilde~1', value: 'new' };
            expect(validatePatchPath(op1, state).valid).toBe(true);
            const op2 = { op: 'replace', path: '/slash~0', value: 'new' };
            expect(validatePatchPath(op2, state).valid).toBe(true);
        });
    });
    describe('validatePatchOperations', () => {
        it('accepts all valid operations', () => {
            const ops = [
                { op: 'add', path: '/a', value: 1 },
                { op: 'add', path: '/b', value: 2 },
            ];
            const state = {};
            const result = validatePatchOperations(ops, state);
            expect(result.valid).toBe(true);
        });
        it('rejects first invalid operation', () => {
            const ops = [
                { op: 'add', path: '/a', value: 1 },
                { op: 'replace', path: '/missing', value: 2 },
                { op: 'add', path: '/c', value: 3 },
            ];
            const state = {};
            const result = validatePatchOperations(ops, state);
            expect(result.valid).toBe(false);
            expect(result.invalidPath).toBe('/missing');
        });
        it('handles empty operations array', () => {
            const result = validatePatchOperations([], {});
            expect(result.valid).toBe(true);
        });
    });
});
//# sourceMappingURL=patch-validation.test.js.map