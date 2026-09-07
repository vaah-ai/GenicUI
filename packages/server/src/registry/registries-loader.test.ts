// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for registries loader — F43.
 *
 * @see {F43} — Suggestive prompts + registry selector
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadRegistries,
  reloadRegistries,
  getRegistries,
  clearRegistries,
} from './registries-loader.js';

describe('registries-loader', () => {
  let tmpDir: string;
  let registriesDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'genicui-registries-test-'));
    registriesDir = join(tmpDir, 'registries');
    clearRegistries();
  });

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    clearRegistries();
  });

  describe('loadRegistries', () => {
    it('returns empty array for non-existent directory', () => {
      const result = loadRegistries('/nonexistent/path/xyz123');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty directory', () => {
      mkdirSync(registriesDir, { recursive: true });
      const result = loadRegistries(registriesDir);
      expect(result).toEqual([]);
    });

    it('loads a single registry', () => {
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });

      const registryJson = {
        id: '@genicul-primevue/registry',
        version: '0.1.0',
        framework: 'primevue',
        components: [
          {
            name: 'data-table',
            version: '1.0.0',
            tags: ['table', 'data'],
            examplePrompts: ['Show me a data table with orders'],
          },
        ],
      };

      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify(registryJson),
        'utf-8',
      );

      const result = loadRegistries(registriesDir);

      expect(result).toHaveLength(1);
      const reg = result[0]!;
      expect(reg.id).toBe('@genicul-primevue/registry');
      expect(reg.version).toBe('0.1.0');
      expect(reg.framework).toBe('primevue');
      expect(reg.components).toHaveLength(1);
      const comp = reg.components[0]!;
      expect(comp.name).toBe('data-table');
      expect(comp.examplePrompts).toEqual([
        'Show me a data table with orders',
      ]);
    });

    it('loads multiple registries', () => {
      // Create two registry directories
      const primevueDir = join(registriesDir, 'primevue');
      const muiDir = join(registriesDir, 'mui');
      mkdirSync(primevueDir, { recursive: true });
      mkdirSync(muiDir, { recursive: true });

      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.1.0',
          framework: 'primevue',
          components: [
            { name: 'data-table', version: '1.0.0', tags: ['table'] },
          ],
        }),
        'utf-8',
      );

      writeFileSync(
        join(muiDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-mui/registry',
          version: '0.2.0',
          framework: 'mui',
          components: [
            { name: 'table', version: '1.0.0', tags: ['table', 'mui'] },
          ],
        }),
        'utf-8',
      );

      const result = loadRegistries(registriesDir);

      expect(result).toHaveLength(2);
      expect(result[0].framework).toBe('primevue');
      expect(result[1].framework).toBe('mui');
    });

    it('skips directories without registry.json', () => {
      // Create a directory without a registry.json
      const emptyDir = join(registriesDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });

      // Create a valid registry
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });
      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.1.0',
          framework: 'primevue',
          components: [],
        }),
        'utf-8',
      );

      const result = loadRegistries(registriesDir);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('@genicul-primevue/registry');
    });

    it('handles invalid JSON gracefully', () => {
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });

      // Write invalid JSON
      writeFileSync(
        join(primevueDir, 'registry.json'),
        '{ invalid json }',
        'utf-8',
      );

      const result = loadRegistries(registriesDir);

      // Should return empty (the invalid registry is skipped)
      expect(result).toEqual([]);
    });

    it('loads components without examplePrompts as undefined', () => {
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });

      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.1.0',
          framework: 'primevue',
          components: [
            { name: 'data-table', version: '1.0.0', tags: ['table'] },
          ],
        }),
        'utf-8',
      );

      const result = loadRegistries(registriesDir);

      expect(result[0].components[0].examplePrompts).toBeUndefined();
    });

    it('ignores non-directory entries', () => {
      mkdirSync(registriesDir, { recursive: true });

      // Create a file in the registries directory (should be ignored)
      writeFileSync(join(registriesDir, 'README.md'), 'Hello', 'utf-8');

      const result = loadRegistries(registriesDir);
      expect(result).toEqual([]);
    });
  });

  describe('getRegistries', () => {
    it('returns loaded registries', () => {
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });
      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.1.0',
          framework: 'primevue',
          components: [],
        }),
        'utf-8',
      );

      loadRegistries(registriesDir);

      const result = getRegistries();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('@genicul-primevue/registry');
    });

    it('returns empty array when no registries loaded', () => {
      // Don't load any registries
      const result = getRegistries();
      expect(result).toEqual([]);
    });
  });

  describe('reloadRegistries', () => {
    it('reloads from the same directory', () => {
      const primevueDir = join(registriesDir, 'primevue');
      mkdirSync(primevueDir, { recursive: true });
      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.1.0',
          framework: 'primevue',
          components: [
            { name: 'data-table', version: '1.0.0', tags: ['table'] },
          ],
        }),
        'utf-8',
      );

      loadRegistries(registriesDir);

      // Modify the registry file
      writeFileSync(
        join(primevueDir, 'registry.json'),
        JSON.stringify({
          id: '@genicul-primevue/registry',
          version: '0.2.0',
          framework: 'primevue',
          components: [
            { name: 'data-table', version: '1.0.0', tags: ['table'] },
            { name: 'card', version: '1.0.0', tags: ['card'] },
          ],
        }),
        'utf-8',
      );

      reloadRegistries();

      const result = getRegistries();
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe('0.2.0');
      expect(result[0].components).toHaveLength(2);
    });

    it('returns empty when no registries were loaded', () => {
      const result = reloadRegistries();
      expect(result).toEqual([]);
    });
  });
});
