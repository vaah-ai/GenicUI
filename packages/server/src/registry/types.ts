/**
 * Registry types — ComponentEntry, RegistryFile, and load error definitions.
 *
 * @module @genicui/server/registry/types
 * @see {F37} — Component registry + manifest loader
 */

import type { TSchema } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Component Entry — the canonical registry record
// ---------------------------------------------------------------------------

/**
 * A single component entry in the registry.
 *
 * Keyed by URI: `ui://components/{name}@{version}`
 *
 * @see {F37-AC1} — Map<uri, entry>
 */
export interface ComponentEntry {
  /** Component name (e.g., "data-table"). */
  readonly name: string;

  /** Semantic version (e.g., "1.0.0"). */
  readonly version: string;

  /**
   * The canonical URI for this component.
   * Format: `ui://components/{name}@{version}`
   */
  readonly uri: string;

  /** TypeBox schema for the component's props. */
  readonly propsSchema: TSchema;

  /** Framework/library identifier (e.g., "primevue@4.2.0"). */
  readonly framework?: string;

  /** Keywords for search matching. */
  readonly tags: readonly string[];

  /** Events this component can emit. */
  readonly events: readonly ComponentEvent[];

  /** Example prop configurations. */
  readonly examples: readonly Readonly<Record<string, unknown>>[];
}

/**
 * A component event definition.
 */
export interface ComponentEvent {
  /** Event name (e.g., "row-click"). */
  readonly name: string;

  /** Optional TypeBox schema for the event payload. */
  readonly payloadSchema?: TSchema;
}

// ---------------------------------------------------------------------------
// Registry File — the JSON format loaded from disk
// ---------------------------------------------------------------------------

/**
 * The shape of a `registry.json` file.
 *
 * @see {F37} — registry.json input format
 */
export interface RegistryFile {
  /** Registry identifier (e.g., "@genicul-primevue/registry"). */
  readonly id: string;

  /** Registry version. */
  readonly version: string;

  /** Framework this registry targets (e.g., "primevue"). */
  readonly framework: string;

  /** Component definitions. */
  readonly components: readonly RegistryComponent[];
}

/**
 * A component definition as it appears in `registry.json`.
 */
export interface RegistryComponent {
  /** Component name. */
  readonly name: string;

  /** Semantic version. */
  readonly version: string;

  /** TypeBox-compatible JSON Schema for props. */
  readonly propsSchema: TSchema;

  /** Keywords for search. */
  readonly tags?: readonly string[];

  /** Event definitions. */
  readonly events?: readonly ComponentEventDefinition[];

  /** Example configurations. */
  readonly examples?: readonly Readonly<Record<string, unknown>>[];
}

/**
 * Event definition as it appears in `registry.json`.
 */
export interface ComponentEventDefinition {
  /** Event name. */
  readonly name: string;

  /** Optional JSON Schema for the event payload. */
  readonly payloadSchema?: TSchema;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Error thrown when the registry fails to load.
 */
export class RegistryLoadError extends Error {
  constructor(
    message: string,
    /** The file path that failed to load. */
    public readonly path: string,
    /** The underlying cause, if any. */
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RegistryLoadError';
  }
}

// ---------------------------------------------------------------------------
// Trust Tiers — F38
// ---------------------------------------------------------------------------

/**
 * Registry trust tier.
 *
 * Priority: project (highest) > user (medium) > remote (lowest).
 * Project tier wins on conflict.
 *
 * @see {F38} — Registry trust tiers
 */
export type RegistryTier = 'project' | 'user' | 'remote';

/**
 * Trust-tier priority (higher = wins on conflict).
 */
export const TIER_PRIORITY: Readonly<Record<RegistryTier, number>> = {
  project: 3,
  user: 2,
  remote: 1,
} as const;

/**
 * A component entry with its trust tier attached.
 *
 * @see {F38} — Registry trust tiers
 */
export interface TieredComponentEntry extends ComponentEntry {
  /** The trust tier this entry belongs to. */
  readonly tier: RegistryTier;
}

/**
 * Options for loading a registry with a trust tier.
 *
 * @see {F38} — Registry trust tiers
 */
export interface LoadRegistryOptions {
  /** Trust tier for entries loaded from this file. Default: 'project'. */
  readonly tier?: RegistryTier;
}

/**
 * Allow-list pattern for remote registries.
 *
 * Supports glob-like patterns: `@official/*`, `@org/*`, etc.
 *
 * @see {F38-AC2} — Remote allow-list enforced
 */
export interface RegistryAllowListEntry {
  /** Glob pattern (e.g., `@official/*`). */
  readonly pattern: string;
}

/**
 * Configuration for remote allow-list.
 *
 * @see {F38-AC2} — Remote allow-list enforced
 */
export interface RemoteAllowList {
  /** List of allow-list patterns. */
  readonly patterns: readonly string[];
}
