/**
 * F14 wrap-at-registration contract tests (M5.2-T2-1).
 *
 * Covers AC4 + AC5:
 *   - `additionalProperties: true` → rejected before factory runs.
 *   - HTTP-shaped manifest + factory missing `scrubWithToken` →
 *     BearerScrubMissingError (-32010 plugin_bearer_scrub_missing).
 *   - Duplicate ids → DuplicateProviderError.
 *
 * Plus a 10K fast-check property run on random schemas (AC4).
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import fc from 'fast-check';
import { Type, type TSchema } from '@sinclair/typebox';

import {
  defineProvider,
  registerProvider,
  __resetRegistryForTests,
  BearerScrubMissingError,
  DuplicateProviderError,
  RegistryValidationError,
} from '../registry.js';
import type {
  ProviderAdaptor,
  ProviderPluginSpec,
  PluginExtraSurface,
} from '../types.js';

function fakeAdaptor(id: string): ProviderAdaptor & Partial<PluginExtraSurface> {
  return {
    id,
    label: id,
    resolveBinary: () => '',
    buildArgs: () => [],
    parseLine: () => ({ kind: 'drop' }),
  };
}

function httpAdaptor(id: string): ProviderAdaptor & Partial<PluginExtraSurface> {
  return {
    id,
    label: id,
    resolveBinary: () => '',
    buildArgs: () => [],
    parseLine: () => ({ kind: 'drop' }),
    scrubWithToken: (v: unknown) => v,
  };
}

beforeEach(() => {
  __resetRegistryForTests();
});

describe('F14-AC3 — additionalProperties: true rejected at registration', () => {
  it('rejects an open schema synchronously, before factory runs', () => {
    let factoryCalled = false;
    expect(() =>
      registerProvider({
        id: 'open',
        label: 'Open',
        configSchema: Type.Object(
          { url: Type.String() },
          { additionalProperties: true }, // INTENTIONALLY OPEN
        ),
        factory: () => {
          factoryCalled = true;
          return fakeAdaptor('open');
        },
      }),
    ).toThrow(RegistryValidationError);
    expect(factoryCalled).toBe(false); // contract: factory never runs
  });

  it('rejects nested additionalProperties: true', () => {
    expect(() =>
      registerProvider({
        id: 'nested-open',
        label: 'Nested Open',
        configSchema: Type.Object({
          outer: Type.Object(
            { inner: Type.String() },
            { additionalProperties: true },
          ),
        }),
        configSchema_extra: undefined as never, // satisfy TS
      } as ProviderPluginSpec),
    ).toThrow();
  });

  it('accepts a closed schema (additionalProperties: false)', () => {
    expect(() =>
      registerProvider({
        id: 'closed',
        label: 'Closed',
        configSchema: Type.Object({ url: Type.String() }, { additionalProperties: false }),
        factory: () => fakeAdaptor('closed'),
      }),
    ).not.toThrow();
  });
});

describe('AC4 — fast-check 10K random schemas', () => {
  it('every additionalProperties: true is rejected', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (withOpen) => {
          __resetRegistryForTests();
          const schema: TSchema = withOpen
            ? Type.Object({ url: Type.String() }, { additionalProperties: true })
            : Type.Object({ url: Type.String() }, { additionalProperties: false });
          const id = `prop-${Math.random().toString(36).slice(2, 8)}`;
          const register = () =>
            registerProvider({
              id,
              label: id,
              configSchema: schema,
              factory: () => fakeAdaptor(id),
            });
          if (withOpen) {
            expect(register).toThrow(RegistryValidationError);
          } else {
            expect(register).not.toThrow();
          }
        },
      ),
      { numRuns: 10000 },
    );
  });
});

describe('AC5 — bearer-scrub contract', () => {
  it('rejects HTTP-shaped manifest without scrubWithToken', () => {
    expect(() =>
      registerProvider({
        id: 'http',
        label: 'HTTP',
        configSchema: Type.Object(
          { bearerToken: Type.String() },
          { additionalProperties: false },
        ),
        factory: () => fakeAdaptor('http'), // NO scrubWithToken
      }),
    ).toThrow(BearerScrubMissingError);
  });

  it('accepts HTTP-shaped manifest with scrubWithToken', () => {
    expect(() =>
      registerProvider({
        id: 'http-ok',
        label: 'HTTP OK',
        configSchema: Type.Object(
          { bearerToken: Type.String() },
          { additionalProperties: false },
        ),
        factory: () => httpAdaptor('http-ok'),
      }),
    ).not.toThrow();
  });

  it('matches Authorization, apiKey, token, api_key in addition to bearerToken', () => {
    for (const key of ['Authorization', 'apiKey', 'token', 'api_key']) {
      __resetRegistryForTests();
      expect(() =>
        registerProvider({
          id: `key-${key}`,
          label: key,
          configSchema: Type.Object(
            { [key]: Type.String() },
            { additionalProperties: false },
          ),
          factory: () => fakeAdaptor(`key-${key}`),
        }),
      ).toThrow(BearerScrubMissingError);
    }
  });

  it('does NOT require scrubWithToken for non-HTTP-shaped manifests', () => {
    expect(() =>
      registerProvider({
        id: 'cli',
        label: 'CLI',
        configSchema: Type.Object(
          { cliPath: Type.String() },
          { additionalProperties: false },
        ),
        factory: () => fakeAdaptor('cli'),
      }),
    ).not.toThrow();
  });
});

describe('Duplicate detection', () => {
  it('throws DuplicateProviderError on second registration with the same id', () => {
    const spec = {
      id: 'dupe',
      label: 'Dupe',
      configSchema: Type.Object({ url: Type.String() }, { additionalProperties: false }),
      factory: () => fakeAdaptor('dupe'),
    };
    registerProvider(spec);
    expect(() => registerProvider(spec)).toThrow(DuplicateProviderError);
  });
});

describe('defineProvider → registerProvider round-trip', () => {
  it('manifest produced by defineProvider passes through registerProvider', () => {
    const manifest = defineProvider({
      id: 'roundtrip',
      label: 'Roundtrip',
      configSchema: Type.Object({ url: Type.String() }, { additionalProperties: false }),
      factory: () => fakeAdaptor('roundtrip'),
    });
    expect(() => registerProvider(manifest)).not.toThrow();
  });
});
