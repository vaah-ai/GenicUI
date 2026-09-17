/**
 * Provider registry — factory for the chat handler to look up a
 * provider adaptor by its wire id.
 *
 * Each adaptor is a singleton instantiated once at module load; the
 * registry is just a thin lookup map.
 *
 * @module @genicui/server/chat/providers/registry
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 */

import type { ProviderAdaptor } from './types.js';
import { ClaudeCodeAdaptor } from './claude-code.js';
import { CodexAdaptor } from './codex.js';
import { createVaahstoreProvider, VaahstoreProviderAdaptor } from './vaahstore.js';

/**
 * The set of registered providers. Add new adaptors here as they're
 * implemented.
 *
 * NOTE: `VaahstoreProviderAdaptor` is built lazily via the factory so
 * the bearer token is read on first lookup, not at module load —
 * matches the `genicul-cli`-style "env at use, not at boot" rule.
 */
let vaahstoreSingleton: VaahstoreProviderAdaptor | null = null;

function vaahstoreAdaptor(): ProviderAdaptor {
  if (!vaahstoreSingleton) vaahstoreSingleton = createVaahstoreProvider();
  return vaahstoreSingleton;
}

const REGISTRY: ReadonlyMap<string, ProviderAdaptor> = new Map<string, ProviderAdaptor>([
  ['claude-code', new ClaudeCodeAdaptor()],
  ['codex', new CodexAdaptor()],
  ['vaahstore', vaahstoreAdaptor()],
]);

/**
 * Look up an adaptor by id.
 *
 * @param id — provider id from the client's `ProviderWirePayload.id`.
 * @returns The adaptor, or `null` if no adaptor is registered for that id.
 */
export function getProviderAdaptor(id: string): ProviderAdaptor | null {
  return REGISTRY.get(id) ?? null;
}

/**
 * List the ids of every registered provider. Useful for tests and
 * server startup logs.
 */
export function listProviderIds(): readonly string[] {
  return [...REGISTRY.keys()];
}
