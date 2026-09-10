/**
 * Registry schema validation tests — rejects open schemas at load time.
 *
 * @module @genicui/server/validation/registry-validation.test
 * @see {F14-AC3} — additionalProperties:true rejected at registry load
 */

import { describe, it, expect } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { rejectOpenSchemas, RegistryValidationError } from './registry-validation.js';

// ---------------------------------------------------------------------------
// F14-AC3: additionalProperties:true rejected at registry load
// ---------------------------------------------------------------------------

describe('F14-AC3: open schemas rejected at load time', () => {
  describe('rejectOpenSchemas', () => {
    it('passes clean schemas', () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Integer(),
      });

      expect(() => rejectOpenSchemas(schema)).not.toThrow();
    });

    it('rejects additionalProperties: true at root', () => {
      const schema = Type.Object({ name: Type.String() });
      (schema as Record<string, unknown>).additionalProperties = true;

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
      expect(() => rejectOpenSchemas(schema)).toThrow('additionalProperties: true');
    });

    it('rejects additionalProperties: true in nested object', () => {
      const openSchema = Type.Object({ extra: Type.String() });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      const schema = Type.Object({
        props: openSchema,
      });

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
      expect(() => rejectOpenSchemas(schema)).toThrow('/properties/props');
    });

    it('rejects additionalProperties: true in array items', () => {
      const openSchema = Type.Object({ id: Type.String() });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      const schema = Type.Object({
        rows: Type.Array(openSchema),
      });

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
    });

    it('rejects additionalProperties: true in union branches', () => {
      const openSchema = Type.Object({ type: Type.Literal('open') });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      const schema = Type.Union([
        Type.Object({ type: Type.Literal('closed') }),
        openSchema,
      ]);

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
    });

    it('rejects additionalProperties: true in allOf schemas', () => {
      const openSchema = Type.Object({ extra: Type.String() });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      // Manually construct allOf schema
      const schema = {
        allOf: [
          Type.Object({ name: Type.String() }),
          openSchema,
        ],
      } as unknown as import('@sinclair/typebox').TSchema;

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
    });

    it('rejects deeply nested open schemas', () => {
      const openSchema = Type.Object({ data: Type.String() });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      const schema = Type.Object({
        level1: Type.Object({
          level2: Type.Object({
            level3: openSchema,
          }),
        }),
      });

      expect(() => rejectOpenSchemas(schema)).toThrow(RegistryValidationError);
      expect(() => rejectOpenSchemas(schema)).toThrow('/level3');
    });

    it('includes path in error', () => {
      const openSchema = Type.Object({ x: Type.Number() });
      (openSchema as Record<string, unknown>).additionalProperties = true;

      const schema = Type.Object({
        config: Type.Object({
          settings: openSchema,
        }),
      });

      try {
        rejectOpenSchemas(schema);
        expect.unreachable('should have thrown');
      } catch (e) {
        const err = e as RegistryValidationError;
        expect(err.name).toBe('RegistryValidationError');
        expect(err.path).toContain('settings');
      }
    });

    it('passes schemas with additionalProperties: false', () => {
      const schema = Type.Object(
        { name: Type.String() },
        { additionalProperties: false },
      );

      expect(() => rejectOpenSchemas(schema)).not.toThrow();
    });

    it('passes schemas without additionalProperties', () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Number(),
      });

      expect(() => rejectOpenSchemas(schema)).not.toThrow();
    });
  });

  describe('RegistryValidationError', () => {
    it('exposes path and message', () => {
      const err = new RegistryValidationError('test error', '/some/path');

      expect(err.name).toBe('RegistryValidationError');
      expect(err.message).toBe('test error');
      expect(err.path).toBe('/some/path');
    });
  });
});
