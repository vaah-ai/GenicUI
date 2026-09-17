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
 *
 * NOTE: As of M5.2-T2-1 the `vaahstore` entry was removed — it now
 * lives as a workspace-resident plugin at
 * `examples/playground-ecommerce/server/providers/`. Workspace callers
 * route through their own `getProviderAdaptor` instead of this core
 * map. This file no longer imports `./vaahstore.js`.
 */

import type { ProviderAdaptor } from './types.js';
import { ClaudeCodeAdaptor } from './claude-code.js';
import { CodexAdaptor } from './codex.js';

const REGISTRY: ReadonlyMap<string, ProviderAdaptor> = new Map<string, ProviderAdaptor>([
  ['claude-code', new ClaudeCodeAdaptor()],
  ['codex', new CodexAdaptor()],
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
