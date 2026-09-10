/**
 * PrimeVue ResultCard registry — tests.
 *
 * F43 — Chat as the sole render surface (interactive components).
 *
 * @see {F43} — ResultCard: answer surface for the calculator test scenario
 */

import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';

import { ResultCard, registry } from './registry.js';
import { ResultCardSchema } from './result-card-schema.js';

// ---------------------------------------------------------------------------
// Schema: 5-prop API
// ---------------------------------------------------------------------------

describe('ResultCardSchema', () => {
  it('has exactly 5 properties', () => {
    const props = (ResultCardSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).length).toBe(5);
  });

  it('enforced props are the expected 5', () => {
    const props = (ResultCardSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props).sort();
    expect(keys).toEqual([
      'input1',
      'input2',
      'operation',
      'sum',
      'title',
    ]);
  });

  it('additionalProperties is false', () => {
    expect(ResultCardSchema.additionalProperties).toBe(false);
  });

  it('requires sum', () => {
    expect(ResultCardSchema.required).toContain('sum');
  });

  it('accepts a minimal { sum }', () => {
    const result = Value.Check(ResultCardSchema, { sum: 8 });
    expect(result).toBe(true);
  });

  it('accepts full calculator result', () => {
    const result = Value.Check(ResultCardSchema, {
      input1: 5,
      input2: 3,
      sum: 8,
      operation: 'add',
      title: 'Sum',
    });
    expect(result).toBe(true);
  });

  it('accepts every supported operation', () => {
    for (const op of ['add', 'subtract', 'multiply', 'divide']) {
      const result = Value.Check(ResultCardSchema, { sum: 1, operation: op });
      expect(result).toBe(true);
    }
  });

  it('rejects unknown operation', () => {
    const result = Value.Check(ResultCardSchema, { sum: 1, operation: 'modulo' });
    expect(result).toBe(false);
  });

  it('rejects props with extra fields', () => {
    const result = Value.Check(ResultCardSchema, { sum: 1, extra: true });
    expect(result).toBe(false);
  });

  it('rejects missing sum', () => {
    const result = Value.Check(ResultCardSchema, { title: 'X' });
    expect(result).toBe(false);
  });

  it('rejects non-numeric sum', () => {
    const result = Value.Check(ResultCardSchema, { sum: 'eight' });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component entry metadata
// ---------------------------------------------------------------------------

describe('ResultCard component entry', () => {
  it('has correct name', () => {
    expect(ResultCard.name).toBe('result-card');
  });

  it('has correct version', () => {
    expect(ResultCard.version).toBe('1.0.0');
  });

  it('has correct URI', () => {
    expect(ResultCard.uri).toBe('ui://components/result-card@1.0.0');
  });

  it('has framework identifier', () => {
    expect(ResultCard.framework).toBe('primevue@4.2.0');
  });

  it('has tags including card and result', () => {
    expect(ResultCard.tags).toContain('card');
    expect(ResultCard.tags).toContain('result');
  });

  it('has zero events (display-only)', () => {
    expect(ResultCard.events.length).toBe(0);
  });

  it('has 2 example configurations', () => {
    expect(ResultCard.examples.length).toBe(2);
  });

  it('all examples pass schema validation', () => {
    for (const example of ResultCard.examples) {
      const result = Value.Check(ResultCardSchema, example);
      expect(result).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

describe('Registry export (ResultCard)', () => {
  it('ResultCard is in the registry', () => {
    const found = registry.components.find((c) => c.name === 'result-card');
    expect(found).toBeDefined();
    expect(found).toBe(ResultCard);
  });
});

// ---------------------------------------------------------------------------
// Index re-exports smoke test
// ---------------------------------------------------------------------------

describe('Index re-exports (ResultCard)', () => {
  it('exports ResultCard', async () => {
    const mod = await import('./index.js');
    expect(mod.ResultCard).toBeDefined();
    expect(mod.ResultCard.name).toBe('result-card');
  });

  it('exports ResultCardSchema', async () => {
    const mod = await import('./index.js');
    expect(mod.ResultCardSchema).toBeDefined();
  });
});
