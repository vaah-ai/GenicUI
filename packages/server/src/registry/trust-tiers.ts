/**
 * Registry trust tiers — project (highest), user (medium), remote (lowest).
 *
 * Project tier wins on conflict. Remote entries require allow-list.
 * Lookup order: user → project → remote (highest priority first).
 *
 * @module @genicui/server/registry/trust-tiers
 * @see {F38} — Registry trust tiers (project / user / remote)
 */

import { ComponentEntry } from './types.js';
import type { RegistryTier, TieredComponentEntry, RemoteAllowList } from './types.js';
import { TIER_PRIORITY } from './types.js';

// ---------------------------------------------------------------------------
// Glob pattern matching — simple * and ? support
// ---------------------------------------------------------------------------

/**
 * Match a string against a glob pattern.
 *
 * Supports: `*` (any chars), `?` (single char), `**` (any including /).
 *
 * @param str — the string to match
 * @param pattern — the glob pattern
 * @returns true if the string matches
 */
export function globMatch(str: string, pattern: string): boolean {
  // Convert glob to regex
  const regex = patternToRegex(pattern);
  return regex.test(str);
}

/**
 * Convert a glob pattern to a RegExp.
 *
 * @param pattern — glob pattern
 * @returns RegExp
 */
function patternToRegex(pattern: string): RegExp {
  const parts: string[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*') {
      if (i + 1 < pattern.length && pattern[i + 1] === '*') {
        // ** matches any chars including /
        parts.push('.*');
        i += 2;
      } else {
        // * matches any chars except /
        parts.push('[^/]*');
        i += 1;
      }
    } else if (ch === '?') {
      parts.push('[^/]');
      i += 1;
    } else {
      parts.push(escapeRegex(ch ?? ''));
      i += 1;
    }
  }
  return new RegExp('^' + parts.join('') + '$');
}

/**
 * Escape a character for use in a regex.
 */
function escapeRegex(ch: string): string {
  return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Remote allow-list
// ---------------------------------------------------------------------------

/**
 * Default remote allow-list patterns.
 */
const DEFAULT_ALLOWLIST_PATTERNS: readonly string[] = ['@official/*'];

/**
 * Get the remote allow-list from environment or defaults.
 *
 * Reads `GENICUI_REGISTRY_ALLOWLIST` env var (comma-separated patterns).
 * Falls back to `['@official/*']` if not set.
 *
 * @returns the allow-list configuration
 *
 * @see {F38-AC2} — Remote allow-list enforced
 */
export function getRemoteAllowList(): RemoteAllowList {
  const envValue = process.env.GENICUI_REGISTRY_ALLOWLIST;
  if (!envValue) {
    return { patterns: DEFAULT_ALLOWLIST_PATTERNS };
  }
  const patterns = envValue
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    patterns: patterns.length > 0 ? patterns : DEFAULT_ALLOWLIST_PATTERNS,
  };
}

/**
 * Check if a registry ID passes the remote allow-list.
 *
 * @param registryId — the registry's id (e.g., `@official/primevue`)
 * @param allowList — the allow-list configuration
 * @returns true if the registry is allowed
 *
 * @see {F38-AC2} — Remote allow-list enforced
 */
export function isRemoteAllowed(
  registryId: string,
  allowList: RemoteAllowList,
): boolean {
  for (const pattern of allowList.patterns) {
    if (globMatch(registryId, pattern)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Tiered registry
// ---------------------------------------------------------------------------

/**
 * A registry with trust-tier separation.
 *
 * Maintains separate maps per tier, resolves conflicts by tier priority,
 * and enforces remote allow-list.
 *
 * @see {F38} — Registry trust tiers
 */
export class TieredRegistry {
  /** Project-tier entries. */
  #project: Map<string, ComponentEntry> = new Map();

  /** User-tier entries. */
  #user: Map<string, ComponentEntry> = new Map();

  /** Remote-tier entries. */
  #remote: Map<string, ComponentEntry> = new Map();

  /**
   * Add entries to a specific tier.
   *
   * @param entries — the component entries to add
   * @param tier — the trust tier
   * @param options — optional allow-list for remote tier
   * @returns entries that were added (filtered for remote tier)
   */
  addEntries(
    entries: Map<string, ComponentEntry>,
    tier: RegistryTier,
    options: { allowList?: RemoteAllowList } = {},
  ): TieredComponentEntry[] {
    const added: TieredComponentEntry[] = [];

    for (const [uri, entry] of entries) {
      // F38-AC2: Remote allow-list enforcement
      if (tier === 'remote') {
        const allowList = options.allowList ?? getRemoteAllowList();
        const framework = entry.framework;
        if (framework !== undefined && !isRemoteAllowed(framework, allowList)) {
          // Log warning — stdout is MCP transport, so stderr
          console.error(
            `[registry] Dropped remote entry "${entry.name}@${entry.version}" ` +
              `(${framework}) — not in allow-list`,
          );
          continue;
        }
      }

      // Store in the correct tier map
      switch (tier) {
        case 'project':
          this.#project.set(uri, entry);
          break;
        case 'user':
          this.#user.set(uri, entry);
          break;
        case 'remote':
          this.#remote.set(uri, entry);
          break;
      }

      added.push({ ...entry, tier } as TieredComponentEntry);
    }

    return added;
  }

  /**
   * Find a component by name across all tiers.
   *
   * Lookup order: user → project → remote.
   * Project tier wins over remote on conflict.
   *
   * @param name — component name (case-insensitive)
   * @param version — optional semantic version
   * @returns the winning entry or undefined
   *
   * @see {F38-AC1} — Project wins on conflict
   * @see {F38-AC3} — Lookup order: user → project → remote
   */
  find(
    name: string,
    version?: string,
  ): TieredComponentEntry | undefined {
    const lowerName = name.toLowerCase();

    // F38-AC3: Lookup order — user first, then project, then remote
    // Check each tier in priority order (user > project > remote)
    // but project wins over remote on conflict
    // "user" is checked first — it's the "user override" tier

    // Step 1: Check user tier
    {
      const found = this.#findInTier(this.#user, lowerName, version);
      if (found) {
        return { ...found, tier: 'user' as RegistryTier };
      }
    }

    // Step 2: Check project tier
    {
      const found = this.#findInTier(this.#project, lowerName, version);
      if (found) {
        // F38-AC1: Project wins on conflict — if project has it, use it over remote
        return { ...found, tier: 'project' as RegistryTier };
      }
    }

    // Step 3: Check remote tier (only if project doesn't have it)
    {
      const found = this.#findInTier(this.#remote, lowerName, version);
      if (found) {
        return { ...found, tier: 'remote' as RegistryTier };
      }
    }

    return undefined;
  }

  /**
   * Find a component in a specific tier map.
   */
  #findInTier(
    tierMap: Map<string, ComponentEntry>,
    lowerName: string,
    version?: string,
  ): ComponentEntry | undefined {
    // If version is specified, look up by exact URI
    if (version) {
      const uri = `ui://components/${lowerName}@${version}`;
      return tierMap.get(uri);
    }

    // Otherwise find the latest version by name
    let latest: ComponentEntry | undefined;
    for (const entry of tierMap.values()) {
      if (entry.name.toLowerCase() === lowerName) {
        if (
          !latest ||
          compareVersions(entry.version, latest.version) > 0
        ) {
          latest = entry;
        }
      }
    }

    return latest;
  }

  /**
   * Get the total number of entries across all tiers.
   */
  get size(): number {
    return (
      this.#project.size + this.#user.size + this.#remote.size
    );
  }

  /**
   * Check if the registry has any entries.
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * List all unique component names across all tiers.
   *
   * @returns an array of unique component names
   */
  listNames(): string[] {
    const names = new Set<string>();
    for (const entry of [...this.#project.values(), ...this.#user.values(), ...this.#remote.values()]) {
      names.add(entry.name);
    }
    return [...names];
  }

  /**
   * Get the tier maps (for inspection/testing).
   *
   * @returns object with project, user, and remote maps
   */
  getTierMaps(): {
    project: Map<string, ComponentEntry>;
    user: Map<string, ComponentEntry>;
    remote: Map<string, ComponentEntry>;
  } {
    return {
      project: this.#project,
      user: this.#user,
      remote: this.#remote,
    };
  }
}

// ---------------------------------------------------------------------------
// Simple semver comparator
// ---------------------------------------------------------------------------

/**
 * Compare two semver strings.
 *
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Module-level tiered registry instance
// ---------------------------------------------------------------------------

/**
 * The module-level tiered registry instance.
 * Shared across all consumers.
 */
export const tieredRegistry = new TieredRegistry();

/**
 * Get the priority order for a given tier.
 *
 * @param tier — the trust tier
 * @returns the priority (higher = wins)
 */
export function tierPriority(tier: RegistryTier): number {
  return TIER_PRIORITY[tier];
}