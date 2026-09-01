// BaseAdaptor — unit tests for validateProps.
// Run with: bun test poc/adaptors/base-adaptor.test.mjs

import { describe, it, expect } from 'bun:test';
import { BaseAdaptor } from './base-adaptor.mjs';

function makeAdaptor(schema) {
  return new BaseAdaptor({
    schema,
    component: { html: () => '<div />', wire: () => {} },
    getState: (p) => p,
  });
}

describe('BaseAdaptor.validateProps', () => {
  describe('required prop validation', () => {
    it('reports missing required prop', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'rows', type: 'array', required: true }],
      });
      const result = a.validateProps({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required prop: rows');
    });

    it('reports missing required prop for null value', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'rows', type: 'array', required: true }],
      });
      const result = a.validateProps({ rows: null });
      expect(result.valid).toBe(false);
    });

    it('passes when required prop is provided', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'rows', type: 'array', required: true }],
      });
      expect(a.validateProps({ rows: [] }).valid).toBe(true);
    });
  });

  describe('type validation', () => {
    it('string type — rejects number', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'label', type: 'string', required: true }],
      });
      const result = a.validateProps({ label: 42 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('label must be string');
    });

    it('number type — rejects string', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'count', type: 'number', required: true }],
      });
      const result = a.validateProps({ count: 'five' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('count must be number');
    });

    it('boolean type — rejects string', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'active', type: 'boolean', required: true }],
      });
      const result = a.validateProps({ active: 'yes' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('active must be boolean');
    });

    it('array type — rejects non-array', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'rows', type: 'array', required: true }],
      });
      const result = a.validateProps({ rows: 'not array' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rows must be array');
    });

    it('object type — rejects non-object', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'config', type: 'object', required: true }],
      });
      const result = a.validateProps({ config: 'string' });
      expect(result.valid).toBe(false);
    });

    it('object type — rejects array (arrays are not objects)', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'config', type: 'object', required: true }],
      });
      const result = a.validateProps({ config: [1, 2] });
      expect(result.valid).toBe(false);
    });
  });

  describe('itemShape validation', () => {
    it('validates each item against itemShape', () => {
      const a = makeAdaptor({
        propDescriptors: [
          {
            name: 'rows',
            type: 'array',
            required: true,
            itemShape: { id: 'string', value: 'number' },
          },
        ],
      });

      const result = a.validateProps({
        rows: [
          { id: 'a', value: 1 },
          { id: 'b', value: 'wrong' },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rows[1].value must be number');
    });

    it('passes when all items match itemShape', () => {
      const a = makeAdaptor({
        propDescriptors: [
          {
            name: 'rows',
            type: 'array',
            required: true,
            itemShape: { id: 'string', value: 'number' },
          },
        ],
      });

      expect(
        a.validateProps({
          rows: [
            { id: 'a', value: 1 },
            { id: 'b', value: 2 },
          ],
        }).valid
      ).toBe(true);
    });

    it('validates boolean itemShape', () => {
      const a = makeAdaptor({
        propDescriptors: [
          {
            name: 'flags',
            type: 'array',
            required: true,
            itemShape: { active: 'boolean' },
          },
        ],
      });

      const result = a.validateProps({ flags: [{ active: 'yes' }] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('flags[0].active must be boolean');
    });
  });

  describe('edge cases', () => {
    it('empty props with no descriptors is valid', () => {
      const a = makeAdaptor({ propDescriptors: [] });
      expect(a.validateProps({}).valid).toBe(true);
    });

    it('null props is treated as empty object', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'x', type: 'number' }],
      });
      expect(a.validateProps(null).valid).toBe(true);
    });

    it('undefined optional prop is skipped', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'optional', type: 'string' }],
      });
      expect(a.validateProps({}).valid).toBe(true);
    });

    it('null optional prop is skipped', () => {
      const a = makeAdaptor({
        propDescriptors: [{ name: 'optional', type: 'string' }],
      });
      expect(a.validateProps({ optional: null }).valid).toBe(true);
    });

    it('missing propDescriptors treated as empty array', () => {
      const a = makeAdaptor({});
      expect(a.validateProps({}).valid).toBe(true);
    });

    it('multiple errors collected', () => {
      const a = makeAdaptor({
        propDescriptors: [
          { name: 'a', type: 'string', required: true },
          { name: 'b', type: 'number', required: true },
        ],
      });
      const result = a.validateProps({ a: 123, b: 'not num' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});
