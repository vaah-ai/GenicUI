/**
 * Tests for the workspace plugin registry (M5.2-T2-1).
 *
 * Covers the 5-function public API:
 *   - defineProvider
 *   - registerProvider
 *   - unregisterProvider
 *   - getProviderAdaptor
 *   - listProviderIds
 *
 * F14 wrap-at-registration is exercised separately in
 * `wrap-at-registration.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Type } from '@sinclair/typebox';

import {
  defineProvider,
  registerProvider,
  unregisterProvider,
  getProviderAdaptor,
  listProviderIds,
  __resetRegistryForTests,
  DuplicateProviderError,
  ProviderShapeError,
} from '../registry.js';
import type {
  ProviderAdaptor,
  ProviderPluginSpec,
  PluginExtraSurface,
} from '../types.js';

function fakeAdaptor(id: string): ProviderAdaptor & Partial<PluginExtraSurface> {
  return {
    id,
    label: `Fake ${id}`,
    resolveBinary: () => 'fake',
    buildArgs: () => [],
    parseLine: () => ({ kind: 'drop' }),
  };
}

function makeSpec(id: string, overrides: Partial<ProviderPluginSpec> = {}): ProviderPluginSpec {
  return {
    id,
    label: `Fake ${id}`,
    configSchema: Type.Object({ url: Type.String() }, { additionalProperties: false }),
    factory: () => fakeAdaptor(id),
    ...overrides,
  };
}

describe('registry — defineProvider', () => {
  it('produces a ProviderPluginManifest from a ProviderPluginSpec', () => {
    const spec = makeSpec('alpha');
    const manifest = defineProvider(spec);
    expect(manifest.id).toBe('alpha');
    expect(manifest.label).toBe('Fake alpha');
    expect(manifest.requiresIsolation).toBe(false); // default off
  });

  it('preserves requiresIsolation when explicitly set', () => {
    const manifest = defineProvider(makeSpec('beta', { requiresIsolation: true }));
    expect(manifest.requiresIsolation).toBe(true);
  });
});

describe('registry — registerProvider', () => {
  beforeEach(() => {
    __resetRegistryForTests();
  });

  it('registers a provider and exposes it via getProviderAdaptor', () => {
    registerProvider(makeSpec('gamma'));
    const adaptor = getProviderAdaptor('gamma');
    expect(adaptor).not.toBeNull();
    expect(adaptor?.id).toBe('gamma');
  });

  it('rejects duplicate ids with DuplicateProviderError', () => {
    registerProvider(makeSpec('delta'));
    expect(() => registerProvider(makeSpec('delta'))).toThrow(DuplicateProviderError);
  });

  it('rejects factories that return malformed objects', () => {
    expect(() =>
      registerProvider({
        id: 'epsilon',
        label: 'Epsilon',
        configSchema: Type.Object({ url: Type.String() }, { additionalProperties: false }),
        factory: () => null as unknown as ProviderAdaptor,
      }),
    ).toThrow(ProviderShapeError);
  });
});

describe('registry — unregisterProvider', () => {
  beforeEach(() => {
    __resetRegistryForTests();
  });

  it('removes a registered provider and returns true', () => {
    registerProvider(makeSpec('zeta'));
    expect(unregisterProvider('zeta')).toBe(true);
    expect(getProviderAdaptor('zeta')).toBeNull();
  });

  it('returns false when unregistering a non-registered id', () => {
    expect(unregisterProvider('nonexistent')).toBe(false);
  });
});

describe('registry — listProviderIds', () => {
  beforeEach(() => {
    __resetRegistryForTests();
  });

  it('returns an empty list when no providers are registered', () => {
    expect(listProviderIds()).toEqual([]);
  });

  it('returns registered ids in insertion order', () => {
    registerProvider(makeSpec('one'));
    registerProvider(makeSpec('two'));
    registerProvider(makeSpec('three'));
    expect(listProviderIds()).toEqual(['one', 'two', 'three']);
  });
});

describe('registry — getProviderAdaptor', () => {
  beforeEach(() => {
    __resetRegistryForTests();
  });

  it('returns null for unknown ids', () => {
    expect(getProviderAdaptor('unknown')).toBeNull();
  });

  it('caches the factory output across calls', () => {
    let calls = 0;
    registerProvider({
      ...makeSpec('eta'),
      factory: () => {
        calls++;
        return fakeAdaptor('eta');
      },
    });
    const a = getProviderAdaptor('eta');
    const b = getProviderAdaptor('eta');
    expect(a).toBe(b); // same reference
    expect(calls).toBe(1); // factory ran once
  });
});
