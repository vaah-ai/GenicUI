/**
 * PrimeVue CityPicker registry — tests.
 *
 * F47 — Component-event interactivity (CityPicker → WeatherCard).
 *
 * @see {F47} — CityPicker + WeatherCard test scenario
 */

import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';

import { CityPicker, registry } from './registry.js';
import { CityPickerSchema } from './city-picker-schema.js';
import { CityPickerEvents } from './city-picker-events.js';

// ---------------------------------------------------------------------------
// Schema: 3-prop API
// ---------------------------------------------------------------------------

describe('CityPickerSchema', () => {
  it('has exactly 3 properties', () => {
    const props = (CityPickerSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).length).toBe(3);
  });

  it('enforced props are the expected 3', () => {
    const props = (CityPickerSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props).sort();
    expect(keys).toEqual(['cityOptions', 'initialCity', 'label']);
  });

  it('additionalProperties is false', () => {
    expect(CityPickerSchema.additionalProperties).toBe(false);
  });

  it('accepts cityOptions array with 2+ items', () => {
    const result = Value.Check(CityPickerSchema, { cityOptions: ['Paris', 'London'] });
    expect(result).toBe(true);
  });

  it('accepts optional initialCity and label', () => {
    const result = Value.Check(CityPickerSchema, {
      cityOptions: ['Tokyo', 'Osaka'],
      initialCity: 'Tokyo',
      label: 'Pick a city',
    });
    expect(result).toBe(true);
  });

  it('rejects cityOptions with fewer than 2 items', () => {
    const result = Value.Check(CityPickerSchema, { cityOptions: ['Paris'] });
    expect(result).toBe(false);
  });

  it('rejects empty cityOptions array', () => {
    const result = Value.Check(CityPickerSchema, { cityOptions: [] });
    expect(result).toBe(false);
  });

  it('rejects missing cityOptions', () => {
    const result = Value.Check(CityPickerSchema, {});
    expect(result).toBe(false);
  });

  it('rejects non-string cityOptions items', () => {
    const result = Value.Check(CityPickerSchema, { cityOptions: [1, 2] });
    expect(result).toBe(false);
  });

  it('rejects props with extra fields', () => {
    const result = Value.Check(CityPickerSchema, {
      cityOptions: ['A', 'B'],
      extra: 'nope',
    });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Submit event payload
// ---------------------------------------------------------------------------

describe('CityPicker submit event', () => {
  it('declares a submit event', () => {
    const submit = CityPickerEvents.find((e) => e.name === 'submit');
    expect(submit).toBeDefined();
  });

  it('submit payload validates { city: string }', () => {
    const submit = CityPickerEvents.find((e) => e.name === 'submit');
    const result = Value.Check(submit!.payloadSchema!, { city: 'Paris' });
    expect(result).toBe(true);
  });

  it('submit payload rejects missing city', () => {
    const submit = CityPickerEvents.find((e) => e.name === 'submit');
    const result = Value.Check(submit!.payloadSchema!, {});
    expect(result).toBe(false);
  });

  it('submit payload rejects non-string city', () => {
    const submit = CityPickerEvents.find((e) => e.name === 'submit');
    const result = Value.Check(submit!.payloadSchema!, { city: 123 });
    expect(result).toBe(false);
  });

  it('submit payload rejects extra fields (additionalProperties: false)', () => {
    const submit = CityPickerEvents.find((e) => e.name === 'submit');
    const result = Value.Check(submit!.payloadSchema!, { city: 'Paris', extra: true });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component entry metadata
// ---------------------------------------------------------------------------

describe('CityPicker component entry', () => {
  it('has correct name', () => {
    expect(CityPicker.name).toBe('city-picker');
  });

  it('has correct version', () => {
    expect(CityPicker.version).toBe('1.0.0');
  });

  it('has correct URI', () => {
    expect(CityPicker.uri).toBe('ui://components/city-picker@1.0.0');
  });

  it('has framework identifier', () => {
    expect(CityPicker.framework).toBe('primevue@4.2.0');
  });

  it('has tags including weather and interactive', () => {
    expect(CityPicker.tags).toContain('weather');
    expect(CityPicker.tags).toContain('interactive');
  });

  it('has 1 event (submit)', () => {
    expect(CityPicker.events.length).toBe(1);
    expect(CityPicker.events[0]!.name).toBe('submit');
  });

  it('has 2 example configurations', () => {
    expect(CityPicker.examples.length).toBe(2);
  });

  it('all examples pass schema validation', () => {
    for (const example of CityPicker.examples) {
      const result = Value.Check(CityPickerSchema, example);
      expect(result).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

describe('Registry export (CityPicker)', () => {
  it('CityPicker is in the registry', () => {
    const found = registry.components.find((c) => c.name === 'city-picker');
    expect(found).toBeDefined();
    expect(found).toBe(CityPicker);
  });
});

// ---------------------------------------------------------------------------
// Index re-exports smoke test
// ---------------------------------------------------------------------------

describe('Index re-exports (CityPicker)', () => {
  it('exports CityPicker', async () => {
    const mod = await import('./index.js');
    expect(mod.CityPicker).toBeDefined();
    expect(mod.CityPicker.name).toBe('city-picker');
  });

  it('exports CityPickerSchema', async () => {
    const mod = await import('./index.js');
    expect(mod.CityPickerSchema).toBeDefined();
  });

  it('exports CityPickerEvents', async () => {
    const mod = await import('./index.js');
    expect(mod.CityPickerEvents).toBeDefined();
    expect(mod.CityPickerEvents.length).toBe(1);
  });
});
