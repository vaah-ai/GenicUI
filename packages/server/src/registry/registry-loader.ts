/**
 * Registry loader — loads `registry.json` into `Map<uri, ComponentEntry>`.
 *
 * Validates each entry's `propsSchema` for `additionalProperties: false`
 * at load time. Supports SIGHUP hot reload without dropping connections.
 *
 * @module @genicui/server/registry/registry-loader
 * @see {F37} — Component registry + manifest loader
 */

import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rejectOpenSchemas, RegistryValidationError } from '../validation/registry-validation.js';

import type {
  ComponentEntry,
  RegistryFile,
  RegistryComponent,
} from './types.js';
import { RegistryLoadError } from './types.js';

// ---------------------------------------------------------------------------
// URI construction
// ---------------------------------------------------------------------------

/**
 * Build the canonical URI for a component entry.
 *
 * Format: `ui://components/{name}@{version}`
 *
 * @param name — component name
 * @param version — semantic version
 * @returns the canonical URI
 *
 * @see {F28} — ui:// URI grammar
 */
export function buildComponentUri(name: string, version: string): string {
  return `ui://components/${name}@${version}`;
}

// ---------------------------------------------------------------------------
// Component entry transformation
// ---------------------------------------------------------------------------

/**
 * Transform a raw `registry.json` component entry into a `ComponentEntry`.
 *
 * @param raw — the raw component from registry.json
 * @param registryId — the registry's id field
 * @returns the validated ComponentEntry
 * @throws {RegistryLoadError} if the entry is invalid
 */
function transformEntry(
  raw: RegistryComponent,
  registryId: string,
): ComponentEntry {
  const uri = buildComponentUri(raw.name, raw.version);

  // F37-AC2: Reject schemas with additionalProperties: true
  try {
    rejectOpenSchemas(raw.propsSchema, `/components/${raw.name}/propsSchema`);
  } catch (err) {
    if (err instanceof RegistryValidationError) {
      throw new RegistryLoadError(
        `Component "${raw.name}" rejected: ${err.message}`,
        '',
        err,
      );
    }
    throw err;
  }

  return {
    name: raw.name,
    version: raw.version,
    uri,
    propsSchema: raw.propsSchema,
    framework: registryId,
    tags: raw.tags ?? [],
    events: raw.events ?? [],
    examples: raw.examples ?? [],
  };
}

// ---------------------------------------------------------------------------
// Registry loader
// ---------------------------------------------------------------------------

/**
 * The state held by the registry loader.
 */
interface RegistryState {
  /** The registry map: uri → ComponentEntry. */
  map: Map<string, ComponentEntry>;
  /** The path to the registry.json file currently loaded. */
  path: string | null;
  /** Timestamp of the last load. */
  lastLoaded: number | null;
}

/**
 * Module-level state.
 * SIGHUP handler reloads into this same state object.
 */
const state: RegistryState = {
  map: new Map(),
  path: null,
  lastLoaded: null,
};

/**
 * Load a `registry.json` file and return a `Map<uri, ComponentEntry>`.
 *
 * This is the core loading function used by `initRegistry()`, `reloadRegistry()`,
 * and the SIGHUP handler.
 *
 * @param filePath — absolute or relative path to `registry.json`
 * @returns a map keyed by component URI
 *
 * @see {F37-AC1} — Load from registry.json into Map<uri, entry>
 * @see {F37-AC2} — additionalProperties:true rejected at load
 */
export function loadRegistry(filePath: string): Map<string, ComponentEntry> {
  // Read and parse the file
  let rawJson: string;
  try {
    rawJson = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new RegistryLoadError(
      `Failed to read registry file: ${filePath}`,
      filePath,
      err,
    );
  }

  let registry: RegistryFile;
  try {
    registry = JSON.parse(rawJson) as RegistryFile;
  } catch (err) {
    throw new RegistryLoadError(
      `Invalid JSON in registry file: ${filePath}`,
      filePath,
      err,
    );
  }

  // Validate structure
  if (!registry.components || !Array.isArray(registry.components)) {
    throw new RegistryLoadError(
      `Registry file must have a "components" array: ${filePath}`,
      filePath,
    );
  }

  // Build the map
  const map = new Map<string, ComponentEntry>();

  for (const component of registry.components) {
    // Validate required fields
    if (!component.name) {
      throw new RegistryLoadError(
        `Component missing "name" in ${filePath}`,
        filePath,
      );
    }
    if (!component.version) {
      throw new RegistryLoadError(
        `Component "${component.name}" missing "version" in ${filePath}`,
        filePath,
      );
    }
    if (!component.propsSchema) {
      throw new RegistryLoadError(
        `Component "${component.name}" missing "propsSchema" in ${filePath}`,
        filePath,
      );
    }

    // Transform and validate (F37-AC2)
    const entry = transformEntry(component, registry.id);

    // Check for duplicate URIs
    if (map.has(entry.uri)) {
      throw new RegistryLoadError(
        `Duplicate component URI "${entry.uri}" in ${filePath}`,
        filePath,
      );
    }

    map.set(entry.uri, entry);
  }

  // Update module state
  state.map = map;
  state.path = filePath;
  state.lastLoaded = Date.now();

  // Log to stderr (stdout is MCP transport)
  console.error(
    `[registry] Loaded ${map.size} components from ${filePath}`,
  );

  return map;
}

/**
 * Initialize the registry from a `registry.json` file.
 *
 * Called once at server boot. Also registers the SIGHUP handler
 * for hot reload (F37-AC3).
 *
 * @param filePath — path to `registry.json`
 * @returns the loaded registry map
 *
 * @see {F37-AC1} — Load at server boot
 * @see {F37-AC3} — SIGHUP hot reload
 */
export function initRegistry(filePath: string): Map<string, ComponentEntry> {
  // Load the initial registry
  const registryMap = loadRegistry(filePath);

  // F37-AC3: Register SIGHUP handler for hot reload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processAny = process as any; // Bun process type lacks on('SIGHUP')
  processAny.on('SIGHUP', () => {
    console.error('[registry] SIGHUP received — reloading registry');
    try {
      reloadRegistry(filePath);
    } catch (err) {
      console.error(`[registry] SIGHUP reload failed: ${err}`);
      // Keep the old registry map — connections stay alive
    }
  });

  return registryMap;
}

/**
 * Reload the registry from the same file, replacing the current map.
 *
 * Preserves open WebSocket connections — only the registry data changes.
 *
 * @param filePath — path to `registry.json`
 * @returns the new registry map
 *
 * @see {F37-AC3} — SIGHUP hot reload preserves open connections
 */
export function reloadRegistry(filePath: string): Map<string, ComponentEntry> {
  return loadRegistry(filePath);
}

/**
 * Get the current registry map.
 *
 * @returns the module-level registry map
 */
export function getRegistry(): Map<string, ComponentEntry> {
  return state.map;
}

/**
 * Get the path of the currently loaded registry file.
 *
 * @returns the file path or null if no registry is loaded
 */
export function getRegistryPath(): string | null {
  return state.path;
}

/**
 * Get the timestamp of the last successful load.
 *
 * @returns the timestamp or null if no registry is loaded
 */
export function getRegistryLastLoaded(): number | null {
  return state.lastLoaded;
}

/**
 * Find a component entry by name (case-insensitive) and optional version.
 *
 * @param name — component name
 * @param version — optional semantic version
 * @returns the component entry or undefined
 */
export function findEntryByName(
  name: string,
  version?: string,
): ComponentEntry | undefined {
  const lowerName = name.toLowerCase();

  // If version is specified, look up by exact URI
  if (version) {
    const uri = buildComponentUri(lowerName, version);
    return state.map.get(uri);
  }

  // Otherwise find the latest version by name
  let latest: ComponentEntry | undefined;

  for (const entry of state.map.values()) {
    if (entry.name.toLowerCase() === lowerName) {
      if (!latest || compareVersions(entry.version, latest.version) > 0) {
        latest = entry;
      }
    }
  }

  return latest;
}

/**
 * Simple semver comparator (major.minor.patch).
 *
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

/**
 * List all component names in the registry.
 *
 * @returns an array of unique component names
 */
export function listComponentNames(): string[] {
  const names = new Set<string>();
  for (const entry of state.map.values()) {
    names.add(entry.name);
  }
  return [...names];
}

/**
 * Check if a registry is loaded.
 *
 * @returns true if a registry has been loaded
 */
export function isRegistryLoaded(): boolean {
  return state.map.size > 0;
}
