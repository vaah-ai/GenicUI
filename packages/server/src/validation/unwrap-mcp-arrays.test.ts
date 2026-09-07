/**
 * MCP-array unwrap utility tests — F43 sanitizer extracted to a shared
 * module so both the chat-bridge and the direct `render_component` MCP
 * tool can apply it.
 *
 * @module @genicui/server/validation/unwrap-mcp-arrays.test
 * @see {F43} — MCP Permissions + Prop Shape
 */

import { describe, it, expect } from 'bun:test';
import {
  unwrapMcpArrays,
  unwrapMcpArrayProps,
} from './unwrap-mcp-arrays.js';

describe('unwrapMcpArrays', () => {
  it('passes flat arrays through unchanged', () => {
    const flat = [{ id: 'r1' }, { id: 'r2' }];
    expect(unwrapMcpArrays(flat)).toEqual(flat);
  });

  it('unwraps { item: [...] } at the top level', () => {
    const wrapped = { item: [{ id: 'r1' }, { id: 'r2' }] };
    expect(unwrapMcpArrays(wrapped)).toEqual([{ id: 'r1' }, { id: 'r2' }]);
  });

  it('unwraps { item: [...] } nested inside objects', () => {
    const input = {
      rows: { item: [{ id: 'r1' }] },
      pageSize: 10,
    };
    expect(unwrapMcpArrays(input)).toEqual({
      rows: [{ id: 'r1' }],
      pageSize: 10,
    });
  });

  it('does not unwrap objects whose only key is not "item"', () => {
    const input = { rows: 'still-a-string' };
    expect(unwrapMcpArrays(input)).toEqual({ rows: 'still-a-string' });
  });

  it('does not unwrap objects with more than one key, even with "item"', () => {
    const input = { item: [1, 2], extra: true };
    expect(unwrapMcpArrays(input)).toEqual({ item: [1, 2], extra: true });
  });

  it('coerces short finite numeric strings to numbers', () => {
    expect(unwrapMcpArrays('10')).toBe(10);
    expect(unwrapMcpArrays('-3')).toBe(-3);
    expect(unwrapMcpArrays('1.5')).toBe(1.5);
    expect(unwrapMcpArrays('  42  ')).toBe(42);
  });

  it('leaves non-numeric strings alone', () => {
    expect(unwrapMcpArrays('hello')).toBe('hello');
    expect(unwrapMcpArrays('v1.0.0')).toBe('v1.0.0');
    expect(unwrapMcpArrays('')).toBe('');
  });

  it('leaves long numeric-looking strings alone (version pins, ids)', () => {
    const long = '12345678901234567890';
    expect(unwrapMcpArrays(long)).toBe(long);
  });

  it('passes primitives through unchanged', () => {
    expect(unwrapMcpArrays(42)).toBe(42);
    expect(unwrapMcpArrays(true)).toBe(true);
    expect(unwrapMcpArrays(null)).toBe(null);
    expect(unwrapMcpArrays(undefined)).toBe(undefined);
  });

  it('does not mutate the input', () => {
    const input = { rows: { item: [{ id: 'r1' }] } };
    const snapshot = JSON.stringify(input);
    unwrapMcpArrays(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('unwrapMcpArrayProps', () => {
  it('normalizes every prop recursively', () => {
    const props = {
      rows: { item: [{ id: 'r1' }] },
      pageSize: '10',
      other: { nested: { item: ['a', 'b'] } },
    };
    expect(unwrapMcpArrayProps(props)).toEqual({
      rows: [{ id: 'r1' }],
      pageSize: 10,
      other: { nested: ['a', 'b'] },
    });
  });

  it('returns a new object — does not mutate the input', () => {
    const props = { rows: [{ id: '1' }] };
    const out = unwrapMcpArrayProps(props);
    expect(out).not.toBe(props);
    expect(props).toEqual({ rows: [{ id: '1' }] });
  });
});
