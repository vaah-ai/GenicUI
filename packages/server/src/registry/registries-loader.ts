/**
 * Registries loader — discovers and loads all `registry.json` files
 * from a registries directory.
 *
 * Used by `GET /api/registries` to return available registries
 * to the playground frontend.
 *
 * @module @genicui/server/registry/registries-loader
 * @see {F43} — Suggestive prompts + registry selector
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

/**
 * A registry loaded from disk for API consumption.
 */
export interface RegistryMetadata {
  /** Registry ID (e.g., "@genicul-primevue/registry"). */
  id: string;
  /** Registry version. */
  version: string;
  /** Framework name (e.g., "primevue"). */
  framework: string;
  /** Component names in this registry. */
  components: RegistryComponentInfo[];
}

/**
 * Component info for API listing.
 */
export interface RegistryComponentInfo {
  /** Component name. */
  name: string;
  /** Semantic version. */
  version: string;
  /** Tags for search. */
  tags: string[];
  /** Suggestive prompts for this component. */
  examplePrompts: string[] | undefined;
}

/**
 * Module-level state for loaded registries.
 */
const registries: RegistryMetadata[] = [];
let registriesPath: string | null = null;

/**
 * Discover and load all registry.json files from a directory.
 *
 * Each subdirectory in the registries directory should contain a `registry.json`
 * file. This function loads them all and caches the result.
 *
 * @param directoryPath — path to a directory containing registry subdirectories
 * @returns an array of RegistryMetadata
 */
export function loadRegistries(directoryPath: string): RegistryMetadata[] {
  if (!existsSync(directoryPath)) {
    console.error(`[registries] Directory not found: ${directoryPath}`);
    return [];
  }

  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const loaded: RegistryMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const regFile = join(directoryPath, entry.name, 'registry.json');
    if (!existsSync(regFile)) continue;

    try {
      const raw = readFileSync(regFile, 'utf-8');
      const data = JSON.parse(raw) as {
        id: string;
        version: string;
        framework: string;
        components: Array<{
          name: string;
          version: string;
          tags?: string[];
          examplePrompts?: string[];
        }>;
      };

      loaded.push({
        id: data.id,
        version: data.version,
        framework: data.framework,
        components: data.components.map((comp) => ({
          name: comp.name,
          version: comp.version,
          tags: comp.tags ?? [],
          examplePrompts: comp.examplePrompts,
        })),
      });
    } catch (err) {
      console.error(
        `[registries] Failed to load registry from ${regFile}: ${err}`,
      );
    }
  }

  registries.length = 0;
  registries.push(...loaded);
  registriesPath = directoryPath;

  console.error(
    `[registries] Loaded ${loaded.length} registry(ies) from ${directoryPath}`,
  );

  return loaded;
}

/**
 * Reload registries from the same directory.
 *
 * @returns an array of RegistryMetadata
 */
export function reloadRegistries(): RegistryMetadata[] {
  if (!registriesPath) {
    return [];
  }
  return loadRegistries(registriesPath);
}

/**
 * Get the currently loaded registries.
 *
 * @returns an array of RegistryMetadata
 */
export function getRegistries(): RegistryMetadata[] {
  return registries;
}

/**
 * Clear the loaded registries. Useful for tests.
 */
export function clearRegistries(): void {
  registries.length = 0;
  registriesPath = null;
}
