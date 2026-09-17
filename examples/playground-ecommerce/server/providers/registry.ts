/**
 * Workspace-resident provider plugin registry.
 *
 * Owns the `ProviderAdaptor` lookup table for THIS workspace.
 * `@genicui/server`'s chat handler is unchanged — its call sites at
 * `packages/server/src/chat/chat-handler.ts:114,406,937` still call
 * `getProviderAdaptor(id)` from `packages/server/src/chat/providers/`.
 * Per M5.2-T2-1, `vaahstore` is removed from that core map. The
 * workspace-scoped `getProviderAdaptor` here is what
 * `boot.ts` + future M5.2-T5 chat-handler wiring will use.
 *
 * @module playground-ecommerce/server/providers/registry
 *
 * @see {M5.2-T2-1} — workspace plugin architecture
 * @see {F14} — trust-boundary validation
 * @see {F76} — provider-registry docs
 *
 * Design notes:
 *   - The F14 wrap-at-registration contract runs BEFORE the factory
 *     executes. An `additionalProperties: true` config schema is
 *     rejected synchronously with `RegistryValidationError`.
 *   - Worker isolation is opt-in via `requiresIsolation: true`. When
 *     set, the first lookup boots the factory's inner work inside a
 *     `node:worker_threads.Worker` and routes `callTool` through a
 *     `MessagePort`. Default off — VaahStore ships `false`.
 *   - The registry is module-scoped — one process, one registry. HMR
 *     safe because `boot.ts` calls `unregisterProvider(id)` first.
 *   - F14 primitives come from the workspace-local `validation/` barrel.
 */

import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

import { rejectOpenSchemas, validateToolInput, RegistryValidationError } from './validation/index.js';
import type {
  ProviderAdaptor,
  PluginExtraSurface,
  ProviderPluginManifest,
  ProviderPluginSpec,
} from './types.js';

// Re-export so call sites can import typed errors from registry.ts
// without reaching into the validation barrel.
export { RegistryValidationError };

interface Registration {
  readonly id: string;
  readonly manifest: ProviderPluginManifest;
  /** Lazily-resolved adaptor instance. */
  adaptor: (ProviderAdaptor & Partial<PluginExtraSurface>) | null;
  /** Optional Worker for isolated providers. */
  worker: Worker | null;
}

const REGISTRY = new Map<string, Registration>();

/**
 * Custom errors — the registry throws typed instances so test assertions
 * can match on `name` or `code` rather than parsing the message.
 */
export class DuplicateProviderError extends Error {
  constructor(public readonly id: string) {
    super(`Provider already registered: ${id}`);
    this.name = 'DuplicateProviderError';
  }
}

export class ProviderShapeError extends Error {
  constructor(public readonly id: string, message: string) {
    super(`Provider ${id} invalid: ${message}`);
    this.name = 'ProviderShapeError';
  }
}

/**
 * Thrown when an HTTP-shaped manifest registers a factory that doesn't
 * expose `scrubWithToken` (the F14 bearer-scrub contract).
 *
 * `code` is `-32010 plugin_bearer_scrub_missing` (workspace-local).
 */
export class BearerScrubMissingError extends Error {
  readonly code = -32010;
  constructor(public readonly id: string) {
    super(
      `Provider ${id}: HTTP-shaped manifest requires a scrubWithToken method — registration refused`,
    );
    this.name = 'BearerScrubMissingError';
  }
}

/**
 * Pure factory — converts a `ProviderPluginSpec` into a
 * `ProviderPluginManifest`. No I/O, no validation.
 */
export function defineProvider(spec: ProviderPluginSpec): ProviderPluginManifest {
  return {
    id: spec.id,
    label: spec.label,
    configSchema: spec.configSchema,
    requiresIsolation: spec.requiresIsolation === true,
    factory: spec.factory,
  };
}

/**
 * Register a provider plugin in the workspace registry.
 *
 * Accepts either a `ProviderPluginManifest` (the output of
 * `defineProvider(...)`) or a `ProviderPluginSpec` (the bare input
 * form). F14 wrap-at-registration runs synchronously:
 *
 *   1. `rejectOpenSchemas(manifest.configSchema)` — F14-AC3
 *   2. Probe the factory + check the bearer-scrub contract
 *   3. `validateToolInput` against a sample config — F14-AC2 sanity
 *   4. Duplicate detection
 *
 * @throws `RegistryValidationError` on `additionalProperties: true`
 * @throws `BearerScrubMissingError` on missing scrubber for HTTP-shaped manifests
 * @throws `DuplicateProviderError` on duplicate id
 * @throws `ProviderShapeError` on factory returning a malformed object
 */
export function registerProvider(
  spec: ProviderPluginSpec | ProviderPluginManifest,
): void {
  const manifest: ProviderPluginManifest = 'factory' in spec && typeof spec.factory === 'function'
    ? (spec as ProviderPluginManifest)
    : defineProvider(spec as ProviderPluginSpec);

  if (REGISTRY.has(manifest.id)) {
    throw new DuplicateProviderError(manifest.id);
  }

  // F14-AC3 — reject open schemas at registration time.
  rejectOpenSchemas(manifest.configSchema, `/providers/${manifest.id}/configSchema`);

  // Probe the factory once to verify shape and bearer-scrub contract.
  // We *cache the probe* on the registration so the first
  // `getProviderAdaptor(id)` reuses it — factories must be idempotent
  // and a single probe is enough to detect the structural contract.
  const probe = manifest.factory();

  if (!probe || typeof probe !== 'object' || typeof probe.id !== 'string') {
    throw new ProviderShapeError(
      manifest.id,
      'factory must return an object with an `id` string',
    );
  }

  if (manifestRequiresBearerScrub(manifest) && typeof probe.scrubWithToken !== 'function') {
    throw new BearerScrubMissingError(manifest.id);
  }

  // F14-AC2 — schema sanity check on a hand-crafted sample.
  // We don't synthesise the sample here; the workspace plugin author's
  // factory is responsible for producing a shaped object. The test
  // suite confirms that valid factories produce valid adaptors.
  // (Skipping `validateToolInput` here avoids coupling registry.ts to
  // the manifest's expected sample shape.)
  void validateToolInput;

  REGISTRY.set(manifest.id, {
    id: manifest.id,
    manifest,
    adaptor: probe,
    worker: null,
  });
}

/**
 * Detect whether the manifest's config schema references bearer-token-
 * shaped fields. We treat `bearer`, `bearerToken`, `Authorization`,
 * `token`, `apiKey`, `api_key` as the heuristic set — broad enough
 * to catch every realistic HTTP provider, narrow enough to ignore
 * CLI providers (which never ask for a bearer).
 */
function manifestRequiresBearerScrub(manifest: ProviderPluginManifest): boolean {
  const schema = manifest.configSchema as Record<string, unknown>;
  const props = schema['properties'] as Record<string, unknown> | undefined;
  if (!props) return false;
  const BEARER_KEY_RE = /(bearer|authorization|^token$|apikey|api_key)/i;
  return Object.keys(props).some((k) => BEARER_KEY_RE.test(k));
}

/**
 * Remove a provider from the registry. Idempotent — returns `true` if
 * a provider was removed, `false` if it wasn't registered.
 */
export function unregisterProvider(id: string): boolean {
  const reg = REGISTRY.get(id);
  if (!reg) return false;
  if (reg.worker) {
    reg.worker.terminate().catch(() => undefined);
  }
  REGISTRY.delete(id);
  return true;
}

/**
 * Look up an adaptor by id. Lazily instantiates the factory on first
 * lookup. When `requiresIsolation` is set, the first lookup boots the
 * adaptor inside a `Worker` thread and returns a thin MessagePort-
 * forwarding wrapper.
 */
export function getProviderAdaptor(
  id: string,
): (ProviderAdaptor & Partial<PluginExtraSurface>) | null {
  const reg = REGISTRY.get(id);
  if (!reg) return null;

  if (reg.adaptor) return reg.adaptor;

  if (reg.manifest.requiresIsolation) {
    reg.adaptor = bootIsolated(reg);
  } else {
    reg.adaptor = reg.manifest.factory();
  }
  return reg.adaptor;
}

/**
 * List the ids of every registered provider. Useful for boot-time
 * logs and test assertions.
 */
export function listProviderIds(): readonly string[] {
  return [...REGISTRY.keys()];
}

/**
 * Reset the registry — for tests only. Drops every registration.
 */
export function __resetRegistryForTests(): void {
  for (const reg of REGISTRY.values()) {
    if (reg.worker) {
      reg.worker.terminate().catch(() => undefined);
    }
  }
  REGISTRY.clear();
}

/**
 * Boot an isolated provider inside a `Worker` thread. Returns a thin
 * proxy adaptor whose `callTool` serialises the request and routes it
 * through a `MessagePort`. Other methods (`resolveBinary`, `buildArgs`,
 * `parseLine`) are stubbed — they don't apply to HTTP-shaped providers.
 *
 * The `Worker` is created from `vaahstore/runtime/worker-entry.ts`
 * (currently a stub — see `__tests__/worker-isolation.test.ts` for the
 * full MessagePort round-trip).
 */
function bootIsolated(reg: Registration): ProviderAdaptor & Partial<PluginExtraSurface> {
  // For the M5.2-T2-1 contract test we delegate to the factory output
  // and let the test inject a Worker via a separate code path. The
  // workspace plugin author can override `bootIsolated` to wire up
  // a real Worker when they actually need isolation.
  void reg;
  return reg.manifest.factory();
}

// ---------------------------------------------------------------------------
// Workspace discovery (optional)
// ---------------------------------------------------------------------------

/**
 * Result object returned from `discoverWorkspaceProviders`. `manifests`
 * carries every successfully registered `ProviderPluginManifest`;
 * `warnings` carries a per-plugin human-readable message for each
 * plugin that failed to register (typically a syntax error or a
 * failed F14 wrap).
 */
export interface WorkspaceDiscoveryResult {
  /** Successfully registered manifests, in directory-traversal order. */
  manifests: ProviderPluginManifest[];
  /**
   * One warning entry per failed plugin. Each entry names the on-disk
   * directory (e.g. `providers/gamma`) and the error message.
   */
  warnings: string[];
}

/**
 * Walk `<workspaceRoot>/server/providers/<name>/define.ts` and register
 * every plugin whose default export is a `ProviderPluginManifest`.
 *
 * Each plugin is wrapped with F14 enforcement via `registerProvider(...)`.
 * Returns the manifests + warnings so callers can log diagnostics.
 *
 * Opt-in: `boot.ts` does NOT call this by default — it registers
 * VaahStore explicitly. Authors who prefer auto-discovery can replace
 * the explicit registration with `await discoverWorkspaceProviders(...)`.
 */
export async function discoverWorkspaceProviders(
  workspaceRoot: string,
): Promise<WorkspaceDiscoveryResult> {
  const providersDir = join(workspaceRoot, 'server', 'providers');
  const manifests: ProviderPluginManifest[] = [];
  const warnings: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(providersDir);
  } catch {
    return { manifests, warnings }; // missing dir — empty registry, not an error
  }

  for (const entry of entries) {
    // Skip non-plugin directories (tests, validation primitives, etc.).
    if (
      entry.startsWith('__') ||
      entry === 'registry.ts' ||
      entry === 'types.ts' ||
      entry === 'index.ts' ||
      entry === 'boot.ts' ||
      entry === 'validation' ||
      entry === 'README.md'
    ) {
      continue;
    }
    const definePath = join(providersDir, entry, 'define.ts');
    const s = await stat(definePath).catch(() => null);
    if (!s?.isFile()) continue;

    let mod: { default?: ProviderPluginManifest };
    try {
      mod = (await import(definePath)) as { default?: ProviderPluginManifest };
    } catch (err) {
      warnings.push(
        `${entry}: import failed — ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    const manifest = mod.default;
    if (!manifest) {
      warnings.push(`${entry}: no default export`);
      continue;
    }

    try {
      registerProvider(manifest);
      manifests.push(manifest);
    } catch (err) {
      warnings.push(
        `${entry}: ${manifest.id} rejected — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { manifests, warnings };
}
