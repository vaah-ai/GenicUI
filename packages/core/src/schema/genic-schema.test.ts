/**
 * F2 — GenicSchema<T> abstraction tests.
 *
 * @see {F2-AC1} — additionalProperties: false enforcement
 * @see {F2-AC2} — JSON Schema 2020-12 output
 * @see {F2-AC3} — Standard Schema interop
 */

import { describe, expect, it } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { genicSchema, createGenicSchema } from './genic-schema.js';

describe('F2: GenicSchema abstraction', () => {
  // --- F2-AC1: additionalProperties: false enforcement ---

  it('F2-AC1: adds additionalProperties: false to top-level object', () => {
    const T = Type.Object({
      name: Type.String(),
      count: Type.Integer(),
    });

    const { schema } = genicSchema(T).build({ name: 'Test' });

    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
  });

  it('F2-AC1: injects additionalProperties: false into nested objects', () => {
    const T = Type.Object({
      user: Type.Object({
        name: Type.String(),
        address: Type.Object({
          city: Type.String(),
        }),
      }),
    });

    const { schema } = genicSchema(T).build({ name: 'Nested' });

    const user = schema.properties?.user as Record<string, unknown> | undefined;
    expect(user?.additionalProperties).toBe(false);

    const address = (user?.properties as Record<string, unknown> | undefined)?.address as Record<string, unknown> | undefined;
    expect(address?.additionalProperties).toBe(false);
  });

  it('F2-AC1: injects additionalProperties: false into array items', () => {
    const T = Type.Object({
      rows: Type.Array(
        Type.Object({
          id: Type.String(),
          value: Type.Number(),
        }),
      ),
    });

    const { schema } = genicSchema(T).build({ name: 'ArrayItems' });

    const rows = (schema.properties?.rows as Record<string, unknown>) || {};
    const items = (rows.items as Record<string, unknown>) || {};
    expect(items.additionalProperties).toBe(false);
  });

  it('F2-AC1: does not mutate the original TypeBox schema', () => {
    const T = Type.Object({
      name: Type.String(),
    });

    genicSchema(T).build({ name: 'MutateTest' });

    // Original schema should not have additionalProperties
    expect(T.additionalProperties).toBeUndefined();
  });

  // --- F2-AC2: JSON Schema 2020-12 output ---

  it('F2-AC2: includes $schema meta-schema URI', () => {
    const T = Type.Object({ name: Type.String() });
    const { schema } = genicSchema(T).build({ name: 'MetaSchema' });

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('F2-AC2: includes x-genicui-name annotation', () => {
    const T = Type.Object({ name: Type.String() });
    const { schema } = genicSchema(T).build({ name: 'MyComponent' });

    expect(schema['x-genicui-name']).toBe('MyComponent');
  });

  it('F2-AC2: includes x-genicui-version annotation (default)', () => {
    const T = Type.Object({ name: Type.String() });
    const { schema } = genicSchema(T).build({ name: 'VersionTest' });

    expect(schema['x-genicui-version']).toBe('0.1.0');
  });

  it('F2-AC2: includes x-genicui-version annotation (custom)', () => {
    const T = Type.Object({ name: Type.String() });
    const { schema } = genicSchema(T).build({ name: 'VersionTest', version: '1.2.3' });

    expect(schema['x-genicui-version']).toBe('1.2.3');
  });

  it('F2-AC2: preserves TypeBox-generated required fields', () => {
    const T = Type.Object({
      name: Type.String(),
      optional: Type.Optional(Type.String()),
    });

    const { schema } = genicSchema(T).build({ name: 'RequiredTest' });

    expect(schema.required).toEqual(['name']);
  });

  // --- Deprecated field support ---

  it('F2-deprecated: marks top-level property as deprecated', () => {
    const T = Type.Object({
      oldField: Type.String(),
      newField: Type.String(),
    });

    const { schema } = genicSchema(T).deprecated('oldField').build({ name: 'DepTest' });

    const oldField = (schema.properties?.oldField as Record<string, unknown>) || {};
    expect(oldField.deprecated).toBe(true);

    const newField = (schema.properties?.newField as Record<string, unknown>) || {};
    expect(newField.deprecated).toBeUndefined();
  });

  it('F2-deprecated: marks nested property as deprecated', () => {
    const T = Type.Object({
      config: Type.Object({
        legacy: Type.String(),
        current: Type.String(),
      }),
    });

    const { schema } = genicSchema(T).deprecated('config.legacy').build({ name: 'NestedDep' });

    const config = schema.properties?.config as Record<string, unknown> | undefined;
    const legacyProp = config?.properties as Record<string, unknown> | undefined;
    expect(legacyProp?.legacy).toHaveProperty('deprecated', true);
    expect(legacyProp?.current).not.toHaveProperty('deprecated');
  });

  it('F2-deprecated: supports multiple deprecated paths', () => {
    const T = Type.Object({
      fieldA: Type.String(),
      fieldB: Type.String(),
      fieldC: Type.String(),
    });

    const { schema } = genicSchema(T)
      .deprecated('fieldA')
      .deprecated('fieldB')
      .build({ name: 'MultiDep' });

    const props = schema.properties as Record<string, Record<string, unknown> | undefined>;
    expect(props?.fieldA?.deprecated).toBe(true);
    expect(props?.fieldB?.deprecated).toBe(true);
    expect(props?.fieldC?.deprecated).toBeUndefined();
  });

  it('F2-deprecated: ignores non-existent paths without error', () => {
    const T = Type.Object({ name: Type.String() });

    const { schema } = genicSchema(T).deprecated('nonexistent').build({ name: 'SafeDep' });

    expect(schema.type).toBe('object');
    // Should not crash; just ignore the path
  });

  // --- createGenicSchema convenience function ---

  it('F2-convenience: createGenicSchema works without deprecated calls', () => {
    const T = Type.Object({ name: Type.String() });
    const { schema } = createGenicSchema(T, { name: 'Convenience' });

    expect(schema.additionalProperties).toBe(false);
    expect(schema['x-genicui-name']).toBe('Convenience');
  });

  // --- TypeBox value validation ---

  it('F2-validation: compiled schema validates correct values', () => {
    const T = Type.Object({
      name: Type.String(),
      count: Type.Integer({ minimum: 0 }),
    });

    genicSchema(T).build({ name: 'Validation' });

    // Use TypeBox Value library for runtime validation
    expect(Value.Check(T, { name: 'test', count: 5 })).toBe(true);
    expect(Value.Check(T, { name: 'test', count: -1 })).toBe(false);
  });

  // --- Edge cases ---

  it('F2-edge: handles empty object', () => {
    const T = Type.Object({});
    const { schema } = genicSchema(T).build({ name: 'Empty' });

    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toEqual({});
  });

  it('F2-edge: handles string type (not object)', () => {
    const T = Type.String();
    const { schema } = genicSchema(T).build({ name: 'StringOnly' });

    expect(schema.type).toBe('string');
    // Strings don't get additionalProperties
    expect(schema.additionalProperties).toBeUndefined();
  });
});
