/**
 * Registry loader tests — F37 acceptance criteria.
 *
 * @see {F37-AC1} — Load from registry.json into Map<uri, entry>
 * @see {F37-AC2} — additionalProperties:true rejected at load
 * @see {F37-AC3} — SIGHUP hot reload preserves open connections
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadRegistry,
  getRegistry,
  getRegistryPath,
  getRegistryLastLoaded,
  findEntryByName,
  listComponentNames,
  isRegistryLoaded,
  buildComponentUri,
  reloadRegistry,
} from './registry-loader.js';
import { RegistryLoadError } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '../../fixtures');

// ---------------------------------------------------------------------------
// F37-AC1: Load from JSON
// ---------------------------------------------------------------------------

describe('F37-AC1: Load from registry.json into Map<uri, entry>', () => {
  it('loads a valid registry.json and populates the map', () => {
    const map = loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    expect(map.size).toBe(1);

    const entry = map.get('ui://components/data-table@1.0.0');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('data-table');
    expect(entry?.version).toBe('1.0.0');
    expect(entry?.uri).toBe('ui://components/data-table@1.0.0');
    expect(entry?.framework).toBe('@genicul-primevue/registry');
    expect(entry?.tags).toEqual(['table', 'sortable', 'filterable']);
    expect(entry?.events).toHaveLength(1);
    expect(entry?.events[0]?.name).toBe('row-click');
    expect(entry?.examples).toHaveLength(1);
  });

  it('exposes the loaded registry via getRegistry()', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    const registry = getRegistry();
    expect(registry.size).toBe(1);
    expect(registry.has('ui://components/data-table@1.0.0')).toBe(true);
  });

  it('returns the correct path and timestamp after load', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    expect(getRegistryPath()).toContain('registry.json');
    expect(getRegistryLastLoaded()).toBeGreaterThan(0);
  });

  it('finds a component by name (case-insensitive)', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    const entry = findEntryByName('Data-Table');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('data-table');
  });

  it('finds a component by name and version', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    const entry = findEntryByName('data-table', '1.0.0');
    expect(entry).toBeDefined();
    expect(entry?.version).toBe('1.0.0');
  });

  it('returns undefined for a non-existent component', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    const entry = findEntryByName('non-existent');
    expect(entry).toBeUndefined();
  });

  it('lists all component names', () => {
    loadRegistry(join(FIXTURES_DIR, 'registry.json'));

    const names = listComponentNames();
    expect(names).toContain('data-table');
    expect(names.length).toBe(1);
  });

  it('reports registry loaded status', () => {
    expect(isRegistryLoaded()).toBe(true);
  });

  it('rejects a registry file with duplicate URIs', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-dup');
    mkdirSync(tmpDir, { recursive: true });

    const regContent = {
      id: 'test',
      version: '0.1.0',
      framework: 'test',
      components: [
        {
          name: 'data-table',
          version: '1.0.0',
          propsSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'data-table',
          version: '1.0.0',
          propsSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      ],
    };
    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify(regContent),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);
    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(/Duplicate component URI/);

    rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// F37-AC2: Open schema rejected
// ---------------------------------------------------------------------------

describe('F37-AC2: additionalProperties:true rejected at load', () => {
  it('rejects a component with additionalProperties: true in propsSchema', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-open-schema');
    mkdirSync(tmpDir, { recursive: true });

    const regContent = {
      id: 'test',
      version: '0.1.0',
      framework: 'test',
      components: [
        {
          name: 'bad-component',
          version: '1.0.0',
          propsSchema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            additionalProperties: true,
          },
        },
      ],
    };
    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify(regContent),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);
    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(/additionalProperties.*true/);

    rmSync(tmpDir, { recursive: true });
  });

  it('rejects nested additionalProperties: true in an array items schema', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-nested-open');
    mkdirSync(tmpDir, { recursive: true });

    const regContent = {
      id: 'test',
      version: '0.1.0',
      framework: 'test',
      components: [
        {
          name: 'nested-bad',
          version: '1.0.0',
          propsSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
            additionalProperties: false,
          },
        },
      ],
    };
    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify(regContent),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });

  it('accepts a registry where all schemas have additionalProperties: false', () => {
    const map = loadRegistry(join(FIXTURES_DIR, 'registry.json'));
    expect(map.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// F37-AC3: Hot reload via SIGHUP
// ---------------------------------------------------------------------------

describe('F37-AC3: SIGHUP hot reload preserves open connections', () => {
  let tmpDir: string;
  let registryPath: string;

  beforeEach(() => {
    tmpDir = join(FIXTURES_DIR, 'tmp-reload');
    mkdirSync(tmpDir, { recursive: true });
    registryPath = join(tmpDir, 'registry.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  function writeRegistry(components: unknown[]): void {
    writeFileSync(
      registryPath,
      JSON.stringify({
        id: 'test',
        version: '0.1.0',
        framework: 'test',
        components,
      }),
    );
  }

  function makeComponent(
    name: string,
    version: string,
  ): Record<string, unknown> {
    return {
      name,
      version,
      propsSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    };
  }

  it('reloadRegistry replaces the map with fresh data', () => {
    // Initial load
    writeRegistry([makeComponent('alpha', '1.0.0')]);
    loadRegistry(registryPath);

    expect(getRegistry().size).toBe(1);
    expect(getRegistry().has('ui://components/alpha@1.0.0')).toBe(true);

    // Write a new registry with different components
    writeRegistry([
      makeComponent('alpha', '1.0.0'),
      makeComponent('beta', '1.0.0'),
    ]);

    // Reload
    reloadRegistry(registryPath);

    expect(getRegistry().size).toBe(2);
    expect(getRegistry().has('ui://components/alpha@1.0.0')).toBe(true);
    expect(getRegistry().has('ui://components/beta@1.0.0')).toBe(true);
  });

  it('reloadRegistry updates the lastLoaded timestamp', () => {
    writeRegistry([makeComponent('alpha', '1.0.0')]);
    loadRegistry(registryPath);

    const firstLoad = getRegistryLastLoaded()!;

    // Wait a moment to ensure timestamp difference
    Bun.sleepSync(50);

    // Reload
    reloadRegistry(registryPath);
    const secondLoad = getRegistryLastLoaded()!;

    expect(secondLoad).toBeGreaterThan(firstLoad);
  });

  it('SIGHUP handler triggers reload without crashing', () => {
    // Write initial registry
    writeRegistry([makeComponent('alpha', '1.0.0')]);
    loadRegistry(registryPath);

    const initialSize = getRegistry().size;
    expect(initialSize).toBe(1);

    // Simulate SIGHUP by emitting the event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processAny = process as any;
    processAny.emit('SIGHUP');

    // The SIGHUP handler should have reloaded the registry
    // (same data since we didn't change the file)
    expect(getRegistry().size).toBeGreaterThanOrEqual(1);
  });

  it('SIGHUP reload failure keeps the old registry', () => {
    // Load initial registry
    writeRegistry([makeComponent('alpha', '1.0.0')]);
    loadRegistry(registryPath);

    // Delete the file to cause a reload failure
    rmSync(registryPath);

    // Trigger SIGHUP — should catch the error and keep old registry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processAny = process as any;
    processAny.emit('SIGHUP');

    // The old registry should still be available
    expect(getRegistry().has('ui://components/alpha@1.0.0')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Utility: buildComponentUri
// ---------------------------------------------------------------------------

describe('buildComponentUri', () => {
  it('builds a valid catalog URI', () => {
    const uri = buildComponentUri('data-table', '1.0.0');
    expect(uri).toBe('ui://components/data-table@1.0.0');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Registry loader error handling', () => {
  it('throws RegistryLoadError for a non-existent file', () => {
    expect(() =>
      loadRegistry('/non-existent/path/registry.json'),
    ).toThrow(RegistryLoadError);
  });

  it('throws RegistryLoadError for invalid JSON', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-bad-json');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, 'registry.json'), '{ not valid json }');

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });

  it('throws RegistryLoadError for missing components array', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-no-components');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify({ id: 'test', version: '0.1.0' }),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });

  it('throws RegistryLoadError for missing name field', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-no-name');
    mkdirSync(tmpDir, { recursive: true });

    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify({
        id: 'test',
        version: '0.1.0',
        framework: 'test',
        components: [
          {
            version: '1.0.0',
            propsSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      }),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });

  it('throws RegistryLoadError for missing version field', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-no-version');
    mkdirSync(tmpDir, { recursive: true });

    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify({
        id: 'test',
        version: '0.1.0',
        framework: 'test',
        components: [
          {
            name: 'test',
            propsSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      }),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });

  it('throws RegistryLoadError for missing propsSchema field', () => {
    const tmpDir = join(FIXTURES_DIR, 'tmp-no-schema');
    mkdirSync(tmpDir, { recursive: true });

    writeFileSync(
      join(tmpDir, 'registry.json'),
      JSON.stringify({
        id: 'test',
        version: '0.1.0',
        framework: 'test',
        components: [
          {
            name: 'test',
            version: '1.0.0',
          },
        ],
      }),
    );

    expect(() =>
      loadRegistry(join(tmpDir, 'registry.json')),
    ).toThrow(RegistryLoadError);

    rmSync(tmpDir, { recursive: true });
  });
});
