/**
 * PrimeVue InputPair registry — tests.
 *
 * F43 — Chat as the sole render surface (interactive components).
 *
 * @see {F43} — InputPair + ResultCard test scenario
 */

import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';

import { InputPair, registry } from './registry.js';
import { InputPairSchema } from './input-pair-schema.js';
import { InputPairEvents } from './input-pair-events.js';

// ---------------------------------------------------------------------------
// Schema: 6-prop API
// ---------------------------------------------------------------------------

describe('InputPairSchema', () => {
  it('has exactly 6 properties', () => {
    const props = (InputPairSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).length).toBe(6);
  });

  it('enforced props are the expected 6', () => {
    const props = (InputPairSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props).sort();
    expect(keys).toEqual([
      'input1',
      'input2',
      'label1',
      'label2',
      'resultComponentId',
      'submitLabel',
    ]);
  });

  it('additionalProperties is false', () => {
    expect(InputPairSchema.additionalProperties).toBe(false);
  });

  it('accepts an empty props object (all fields optional)', () => {
    const result = Value.Check(InputPairSchema, {});
    expect(result).toBe(true);
  });

  it('accepts numeric input1/input2', () => {
    const result = Value.Check(InputPairSchema, { input1: 5, input2: 3 });
    expect(result).toBe(true);
  });

  it('accepts integer and floating-point inputs', () => {
    expect(Value.Check(InputPairSchema, { input1: 5, input2: 3.14 })).toBe(true);
    expect(Value.Check(InputPairSchema, { input1: -7, input2: 0 })).toBe(true);
  });

  it('accepts string labels', () => {
    const result = Value.Check(InputPairSchema, {
      label1: 'First',
      label2: 'Second',
      submitLabel: 'Submit',
    });
    expect(result).toBe(true);
  });

  it('rejects props with extra fields', () => {
    const result = Value.Check(InputPairSchema, { extra: 'nope' });
    expect(result).toBe(false);
  });

  it('rejects non-numeric input1', () => {
    const result = Value.Check(InputPairSchema, { input1: 'five' });
    expect(result).toBe(false);
  });

  it('rejects non-string label', () => {
    const result = Value.Check(InputPairSchema, { label1: 123 });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Submit event payload
// ---------------------------------------------------------------------------

describe('InputPair submit event', () => {
  it('declares a submit event', () => {
    const submit = InputPairEvents.find((e) => e.name === 'submit');
    expect(submit).toBeDefined();
  });

  it('submit payload validates { input1, input2 }', () => {
    const submit = InputPairEvents.find((e) => e.name === 'submit');
    const payload = { input1: 5, input2: 3 };
    const result = Value.Check(submit!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('submit payload rejects missing input2', () => {
    const submit = InputPairEvents.find((e) => e.name === 'submit');
    const payload = { input1: 5 };
    const result = Value.Check(submit!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('submit payload rejects non-numeric input', () => {
    const submit = InputPairEvents.find((e) => e.name === 'submit');
    const payload = { input1: '5', input2: 3 };
    const result = Value.Check(submit!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('submit payload rejects extra fields (additionalProperties: false)', () => {
    const submit = InputPairEvents.find((e) => e.name === 'submit');
    const payload = { input1: 5, input2: 3, extra: true };
    const result = Value.Check(submit!.payloadSchema!, payload);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component entry metadata
// ---------------------------------------------------------------------------

describe('InputPair component entry', () => {
  it('has correct name', () => {
    expect(InputPair.name).toBe('input-pair');
  });

  it('has correct version', () => {
    expect(InputPair.version).toBe('1.0.0');
  });

  it('has correct URI', () => {
    expect(InputPair.uri).toBe('ui://components/input-pair@1.0.0');
  });

  it('has framework identifier', () => {
    expect(InputPair.framework).toBe('primevue@4.2.0');
  });

  it('has tags including form and calculator', () => {
    expect(InputPair.tags).toContain('form');
    expect(InputPair.tags).toContain('calculator');
  });

  it('has 1 event (submit)', () => {
    expect(InputPair.events.length).toBe(1);
    expect(InputPair.events[0]!.name).toBe('submit');
  });

  it('has 2 example configurations', () => {
    expect(InputPair.examples.length).toBe(2);
  });

  it('all examples pass schema validation', () => {
    for (const example of InputPair.examples) {
      const result = Value.Check(InputPairSchema, example);
      expect(result).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

describe('Registry export (InputPair)', () => {
  it('InputPair is in the registry', () => {
    const found = registry.components.find((c) => c.name === 'input-pair');
    expect(found).toBeDefined();
    expect(found).toBe(InputPair);
  });
});

// ---------------------------------------------------------------------------
// Index re-exports smoke test
// ---------------------------------------------------------------------------

describe('Index re-exports (InputPair)', () => {
  it('exports InputPair', async () => {
    const mod = await import('./index.js');
    expect(mod.InputPair).toBeDefined();
    expect(mod.InputPair.name).toBe('input-pair');
  });

  it('exports InputPairSchema', async () => {
    const mod = await import('./index.js');
    expect(mod.InputPairSchema).toBeDefined();
  });

  it('exports InputPairEvents', async () => {
    const mod = await import('./index.js');
    expect(mod.InputPairEvents).toBeDefined();
    expect(mod.InputPairEvents.length).toBe(1);
  });
});
