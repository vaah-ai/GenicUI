/**
 * Tests for the workspace-local F14 trust-boundary primitives.
 *
 * These primitives are *shallow workspace-local copies* of the
 * authoritative versions in `packages/server/src/validation/`. We test
 * them here to guarantee behaviour parity for the workspace plugin API.
 *
 * TODO(M5.x): once provider-types is exported from @genicui/server,
 * collapse this with the core test suite.
 */

import { describe, it, expect } from 'bun:test';
import { Type } from '@sinclair/typebox';

import {
  stripProtoKeys,
  hasProtoKeys,
  rejectOpenSchemas,
  RegistryValidationError,
  validateToolInput,
  checkToolInput,
  type ValidationResult,
} from '../validation/index.js';

/**
 * Helper — JS object literals treat `__proto__` as prototype assignment,
 * so we use `JSON.parse` (or `Object.defineProperty`) to create a true
 * own property that the strip-recorder can see.
 */
function createWithProtoKey(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

describe('stripProtoKeys', () => {
  it('strips top-level __proto__', () => {
    const input = JSON.parse('{"url":"u","__proto__":"bad"}');
    const out = stripProtoKeys(input);
    expect('__proto__' in out).toBe(false);
    expect(out.url).toBe('u');
  });

  it('strips top-level constructor', () => {
    const input: Record<string, unknown> = { constructor: 'x', url: 'u' };
    const out = stripProtoKeys(input);
    expect('constructor' in out).toBe(false);
  });

  it('strips top-level prototype', () => {
    const input: Record<string, unknown> = { prototype: 'x', url: 'u' };
    const out = stripProtoKeys(input);
    expect('prototype' in out).toBe(false);
  });

  it('recurses into nested objects', () => {
    const out = stripProtoKeys({
      outer: { inner: 'ok', __proto__: 'bad' },
    });
    expect((out as { outer: { inner: string; __proto__?: unknown } }).outer.__proto__).toBeUndefined();
  });

  it('passes through non-object scalars', () => {
    expect(stripProtoKeys('hello')).toBe('hello');
    expect(stripProtoKeys(42)).toBe(42);
    expect(stripProtoKeys(null)).toBe(null);
  });
});

describe('hasProtoKeys', () => {
  it('returns true when __proto__ is an own property', () => {
    const input = JSON.parse('{"a":1,"__proto__":"x"}');
    expect(hasProtoKeys(input)).toBe(true);
  });

  it('returns true when constructor key is present', () => {
    expect(hasProtoKeys({ a: 1, constructor: 'x' } as Record<string, unknown>)).toBe(true);
  });

  it('returns true when prototype key is present', () => {
    expect(hasProtoKeys({ a: 1, prototype: 'x' } as Record<string, unknown>)).toBe(true);
  });

  it('returns false for safe objects', () => {
    expect(hasProtoKeys({ a: 1, b: 2 })).toBe(false);
  });

  it('detects nested proto keys', () => {
    const input = JSON.parse('{"outer":{"__proto__":"x"}}');
    expect(hasProtoKeys(input)).toBe(true);
  });
});

describe('rejectOpenSchemas', () => {
  it('throws RegistryValidationError on additionalProperties: true', () => {
    expect(() =>
      rejectOpenSchemas(Type.Object({ url: Type.String() }, { additionalProperties: true })),
    ).toThrow(RegistryValidationError);
  });

  it('returns silently on additionalProperties: false', () => {
    expect(() =>
      rejectOpenSchemas(Type.Object({ url: Type.String() }, { additionalProperties: false })),
    ).not.toThrow();
  });

  it('rejects nested open schemas', () => {
    expect(() =>
      rejectOpenSchemas(
        Type.Object({
          outer: Type.Object({ inner: Type.String() }, { additionalProperties: true }),
        }),
      ),
    ).toThrow();
  });
});

describe('validateToolInput', () => {
  it('returns valid: true for clean inputs', () => {
    const schema = Type.Object(
      { url: Type.String() },
      { additionalProperties: false },
    );
    const result: ValidationResult = validateToolInput(schema, { url: 'u' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns valid: false and code -32003 for invalid inputs', () => {
    const schema = Type.Object(
      { url: Type.String() },
      { additionalProperties: false },
    );
    const result = validateToolInput(schema, { url: 42 });
    expect(result.valid).toBe(false);
    expect(result.code).toBe(-32003);
    expect(result.message).toBe('props_invalid');
  });

  it('rejects additional properties when schema is closed', () => {
    const schema = Type.Object(
      { url: Type.String() },
      { additionalProperties: false },
    );
    const result = validateToolInput(schema, { url: 'u', evil: true });
    expect(result.valid).toBe(false);
  });
});

describe('checkToolInput', () => {
  it('returns false on invalid input (does not throw)', () => {
    const schema = Type.Object(
      { url: Type.String() },
      { additionalProperties: false },
    );
    // checkToolInput is the non-throwing shortcut; it returns the
    // boolean. The throwing variant lives in the chat handler that
    // wraps `callTool` entries.
    expect(checkToolInput(schema, { url: 42 })).toBe(false);
  });

  it('returns true on valid input', () => {
    const schema = Type.Object(
      { url: Type.String() },
      { additionalProperties: false },
    );
    expect(checkToolInput(schema, { url: 'u' })).toBe(true);
  });
});

describe('RegistryValidationError carries the JSON pointer path', () => {
  it('exposes the path property', () => {
    try {
      rejectOpenSchemas(Type.Object({ url: Type.String() }, { additionalProperties: true }));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryValidationError);
      expect((err as RegistryValidationError).path).toBe('/root');
    }
  });
});
