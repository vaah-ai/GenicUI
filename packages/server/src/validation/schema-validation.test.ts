/**
 * Schema validation tests — TypeBox Value.Errors() for tool input validation.
 *
 * @module @genicui/server/validation/schema-validation.test
 * @see {F14-AC2} — Invalid props -> -32003 with field details
 */

import { describe, it, expect } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { validateToolInput, checkToolInput } from './schema-validation.js';
import { GENICUI_ERROR_CODES } from '../mcp/tool-registry.js';

// ---------------------------------------------------------------------------
// F14-AC2: Invalid props -> -32003 with field details
// ---------------------------------------------------------------------------

describe('F14-AC2: invalid props -> -32003 with field details', () => {
  describe('validateToolInput', () => {
    it('accepts valid input', () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Integer(),
      });

      const result = validateToolInput(schema, { name: 'test', value: 42 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing required field', () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Integer(),
      });

      const result = validateToolInput(schema, { name: 'test' });

      expect(result.valid).toBe(false);
      expect(result.code).toBe(GENICUI_ERROR_CODES.props_invalid);
      expect(result.message).toBe('props_invalid');
      expect(result.errors).toHaveLength(2); // "required" + "type"
      expect(result.errors[0]).toContain('/value');
    });

    it('rejects wrong type', () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Integer(),
      });

      const result = validateToolInput(schema, { name: 'test', value: 'not-a-number' });

      expect(result.valid).toBe(false);
      expect(result.code).toBe(GENICUI_ERROR_CODES.props_invalid);
      expect(result.errors[0]).toContain('/value');
    });

    it('rejects extra fields due to additionalProperties: false', () => {
      const schema = Type.Object(
        {
          name: Type.String(),
        },
        { additionalProperties: false },
      );

      const result = validateToolInput(schema, {
        name: 'test',
        extraField: 'should-be-rejected',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('/extraField');
    });

    it('returns field-level details for multiple errors', () => {
      const schema = Type.Object({
        name: Type.String({ minLength: 3 }),
        value: Type.Integer({ minimum: 0 }),
      });

      const result = validateToolInput(schema, { name: 'ab', value: -5 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('/name');
      expect(result.errors[1]).toContain('/value');
    });

    it('handles null input', () => {
      const schema = Type.Object({
        name: Type.String(),
      });

      const result = validateToolInput(schema, null);

      expect(result.valid).toBe(false);
    });

    it('handles undefined input', () => {
      const schema = Type.Object({
        name: Type.String(),
      });

      const result = validateToolInput(schema, undefined);

      expect(result.valid).toBe(false);
    });

    it('handles nested validation errors', () => {
      const schema = Type.Object({
        props: Type.Object({
          rows: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
          })),
        }),
      });

      const result = validateToolInput(
        schema,
        { props: { rows: [{ id: 123, name: 'test' }] } },
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('/rows/0/id');
    });

    it('handles discriminated union validation', () => {
      const schema = Type.Union([
        Type.Object({ op: Type.Literal('patch'), patch: Type.Array(Type.Object({})) }),
        Type.Object({ op: Type.Literal('merge'), merge: Type.Object({}) }),
      ]);

      // Valid: patch mode
      const validResult = validateToolInput(schema, { op: 'patch', patch: [{}] });
      expect(validResult.valid).toBe(true);

      // Valid: merge mode
      const validResult2 = validateToolInput(schema, { op: 'merge', merge: {} });
      expect(validResult2.valid).toBe(true);
    });
  });

  describe('checkToolInput', () => {
    it('returns true for valid input', () => {
      const schema = Type.Object({ name: Type.String() });
      expect(checkToolInput(schema, { name: 'test' })).toBe(true);
    });

    it('returns false for invalid input', () => {
      const schema = Type.Object({ name: Type.String() });
      expect(checkToolInput(schema, { name: 123 })).toBe(false);
      expect(checkToolInput(schema, {})).toBe(false);
    });
  });
});
