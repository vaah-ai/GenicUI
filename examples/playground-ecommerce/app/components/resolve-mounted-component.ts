/**
 * Workspace resolver — looks up an ECOMMERCE_REGISTRY entry by name and
 * returns the matching lazy `import()` thunk.
 *
 * Mirrors the shape of `examples/playground/app/components/resolve-mounted-component.ts`
 * but specialized for the workspace-local registry. The playground's
 * resolver handles the 18 entries registered at F37 / M5-T1; this one
 * handles the 19 entries from the journey spec.
 *
 * Used by the workspace's `RenderedComponent.vue` (landed alongside T4)
 * and by the future T5 agent journey state machine.
 *
 * @module playground-ecommerce/app/components/resolve-mounted-component
 *
 * @see {M5.2-T3} — workspace registry landing
 */

import { ECOMMERCE_REGISTRY } from './ecommerce/registry/components.js';
import type { EcommerceComponentEntry } from './ecommerce/registry/types.js';

/**
 * The single registry this workspace resolves mounted components from.
 * Order matches the journey spec §4 file list.
 */
export const REGISTRIES: readonly EcommerceComponentEntry[] = ECOMMERCE_REGISTRY;

/**
 * Resolve a mounted-component entry by name. Returns `undefined` when
 * the agent asks for a component that isn't registered — the caller
 * renders an "unknown component" placeholder.
 */
export function resolveMountedComponent(name: string): EcommerceComponentEntry | undefined {
  return ECOMMERCE_REGISTRY.find((entry) => entry.name === name);
}

/**
 * List every registered component name. Useful for the playground's
 * `RegistrySelector.vue` debug surface and for test assertions.
 */
export function listRegisteredNames(): readonly string[] {
  return ECOMMERCE_REGISTRY.map((entry) => entry.name);
}