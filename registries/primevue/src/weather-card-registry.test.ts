/**
 * PrimeVue WeatherCard registry — tests.
 *
 * F47 — Component-event interactivity (CityPicker → WeatherCard).
 *
 * @see {F47} — CityPicker + WeatherCard test scenario
 */

import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';

import { WeatherCard, registry } from './registry.js';
import { WeatherCardSchema } from './weather-card-schema.js';

// ---------------------------------------------------------------------------
// Schema: 2-prop API
// ---------------------------------------------------------------------------

describe('WeatherCardSchema', () => {
  it('has exactly 2 properties', () => {
    const props = (WeatherCardSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).length).toBe(2);
  });

  it('enforced props are the expected 2', () => {
    const props = (WeatherCardSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props).sort();
    expect(keys).toEqual(['city', 'units']);
  });

  it('additionalProperties is false', () => {
    expect(WeatherCardSchema.additionalProperties).toBe(false);
  });

  it('accepts city string (required)', () => {
    const result = Value.Check(WeatherCardSchema, { city: 'Paris' });
    expect(result).toBe(true);
  });

  it('accepts optional units metric', () => {
    const result = Value.Check(WeatherCardSchema, { city: 'Paris', units: 'metric' });
    expect(result).toBe(true);
  });

  it('accepts optional units imperial', () => {
    const result = Value.Check(WeatherCardSchema, { city: 'Paris', units: 'imperial' });
    expect(result).toBe(true);
  });

  it('rejects missing city', () => {
    const result = Value.Check(WeatherCardSchema, {});
    expect(result).toBe(false);
  });

  it('rejects non-string city', () => {
    const result = Value.Check(WeatherCardSchema, { city: 123 });
    expect(result).toBe(false);
  });

  it('rejects invalid units value', () => {
    const result = Value.Check(WeatherCardSchema, { city: 'Paris', units: 'celsius' });
    expect(result).toBe(false);
  });

  it('rejects props with extra fields', () => {
    const result = Value.Check(WeatherCardSchema, {
      city: 'Paris',
      extra: 'nope',
    });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component entry metadata
// ---------------------------------------------------------------------------

describe('WeatherCard component entry', () => {
  it('has correct name', () => {
    expect(WeatherCard.name).toBe('weather-card');
  });

  it('has correct version', () => {
    expect(WeatherCard.version).toBe('1.0.0');
  });

  it('has correct URI', () => {
    expect(WeatherCard.uri).toBe('ui://components/weather-card@1.0.0');
  });

  it('has framework identifier', () => {
    expect(WeatherCard.framework).toBe('primevue@4.2.0');
  });

  it('has tags including weather and display', () => {
    expect(WeatherCard.tags).toContain('weather');
    expect(WeatherCard.tags).toContain('display');
  });

  it('has 0 events (display-only)', () => {
    expect(WeatherCard.events.length).toBe(0);
  });

  it('has 2 example configurations', () => {
    expect(WeatherCard.examples.length).toBe(2);
  });

  it('all examples pass schema validation', () => {
    for (const example of WeatherCard.examples) {
      const result = Value.Check(WeatherCardSchema, example);
      expect(result).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

describe('Registry export (WeatherCard)', () => {
  it('WeatherCard is in the registry', () => {
    const found = registry.components.find((c) => c.name === 'weather-card');
    expect(found).toBeDefined();
    expect(found).toBe(WeatherCard);
  });
});

// ---------------------------------------------------------------------------
// Index re-exports smoke test
// ---------------------------------------------------------------------------

describe('Index re-exports (WeatherCard)', () => {
  it('exports WeatherCard', async () => {
    const mod = await import('./index.js');
    expect(mod.WeatherCard).toBeDefined();
    expect(mod.WeatherCard.name).toBe('weather-card');
  });

  it('exports WeatherCardSchema', async () => {
    const mod = await import('./index.js');
    expect(mod.WeatherCardSchema).toBeDefined();
  });
});
