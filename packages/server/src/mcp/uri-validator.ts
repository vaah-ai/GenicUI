/**
 * URI grammar — validates and parses `ui://` resource URIs.
 *
 * Catalog URIs  : `ui://components/{name}@{version}`
 * Instance URIs : `ui://instances/{componentId}`
 *
 * @module @genicui/server/mcp/uri-validator
 * @see {F28} — ui:// URI grammar (catalog + instance)
 */

// ---------------------------------------------------------------------------
// Regex patterns (F28-AC1, F28-AC2)
// ---------------------------------------------------------------------------

/**
 * Catalog URI pattern.
 *
 * Format: `ui://components/{name}@{version}`
 * - `{name}`  : lowercase ASCII, starts with [a-z], allows [a-z0-9-]
 * - `{version}`: semantic version X.Y.Z (digits only, no pre-release)
 *
 * Examples:
 *   ui://components/data-table@1.0.0
 *   ui://components/select@0.5.0
 */
export const CATALOG_URI_PATTERN =
  /^ui:\/\/components\/[a-z][a-z0-9-]*@\d+\.\d+\.\d+$/;

/**
 * Instance URI pattern.
 *
 * Format: `ui://instances/{componentId}`
 * - `{componentId}`: lowercase ASCII [a-z0-9-], 1-32 chars
 *
 * Examples:
 *   ui://instances/dt-7f3a9b2c
 */
export const INSTANCE_URI_PATTERN = /^ui:\/\/instances\/[a-z0-9-]{1,32}$/;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a string is a valid catalog URI (F28-AC1).
 *
 * @param uri — the URI string to validate
 * @returns `true` if the URI matches the catalog pattern
 */
export function isCatalogUri(uri: string): boolean {
  return CATALOG_URI_PATTERN.test(uri);
}

/**
 * Check whether a string is a valid instance URI (F28-AC2).
 *
 * @param uri — the URI string to validate
 * @returns `true` if the URI matches the instance pattern
 */
export function isInstanceUri(uri: string): boolean {
  return INSTANCE_URI_PATTERN.test(uri);
}

/**
 * Check whether a string is any valid ui:// URI.
 *
 * @param uri — the URI string to validate
 * @returns `true` if the URI is either a catalog or instance URI
 */
export function isValidUri(uri: string): boolean {
  return isCatalogUri(uri) || isInstanceUri(uri);
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

/**
 * Parsed catalog URI — component name and version.
 */
export interface ParsedCatalogUri {
  /** Component name (e.g., "data-table"). */
  readonly name: string;
  /** Semantic version (e.g., "1.0.0"). */
  readonly version: string;
}

/**
 * Parsed instance URI — component identifier.
 */
export interface ParsedInstanceUri {
  /** The component ID (e.g., "dt-7f3a9b2c"). */
  readonly componentId: string;
}

/**
 * Parse a catalog URI into its name and version components.
 *
 * @param uri — a catalog URI (must pass `isCatalogUri` first)
 * @returns parsed name and version, or `null` if the URI does not match
 */
export function parseCatalogUri(
  uri: string,
): ParsedCatalogUri | null {
  if (!isCatalogUri(uri)) {
    return null;
  }
  const match = CATALOG_URI_PATTERN.exec(uri);
  if (!match) {
    return null;
  }
  const withoutPrefix = uri.slice('ui://components/'.length);
  const atIndex = withoutPrefix.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }
  return {
    name: withoutPrefix.slice(0, atIndex),
    version: withoutPrefix.slice(atIndex + 1),
  };
}

/**
 * Parse an instance URI into its component ID.
 *
 * @param uri — an instance URI (must pass `isInstanceUri` first)
 * @returns parsed component ID, or `null` if the URI does not match
 */
export function parseInstanceUri(
  uri: string,
): ParsedInstanceUri | null {
  if (!isInstanceUri(uri)) {
    return null;
  }
  const componentId = uri.slice('ui://instances/'.length);
  return { componentId };
}
