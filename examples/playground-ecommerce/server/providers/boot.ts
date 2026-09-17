/**
 * Workspace boot file — registers every provider plugin the workspace
 * ships. Imported once at server start by
 * `server/plugins/00-boot-providers.ts` (Nuxt server-plugin auto-load).
 *
 * Idempotent — `unregisterProvider(id)` runs first so HMR / repeated
 * boot calls don't double-register.
 *
 * @module playground-ecommerce/server/providers/boot
 *
 * @see {M5.2-T2-1} — workspace plugin architecture
 */

import { registerProvider, unregisterProvider } from './registry.js';
import { createVaahstoreProvider } from './vaahstore/runtime/index.js';

/**
 * VaahStore — workspace plugin (M5.2-T2-1 extraction).
 *
 * - `id`: 'vaahstore' — matches `examples/playground/app/providers/registry.ts`'s
 *   existing `vaahstore` entry so the playground dropdown stays the same.
 * - `requiresIsolation`: `false` — VaahStore's pure-Node fetch path
 *   doesn't need a Worker boundary.
 */
unregisterProvider('vaahstore');
registerProvider({
  id: 'vaahstore',
  label: 'VaahStore',
  configSchema: {
    type: 'object',
    properties: {
      baseUrl: { type: 'string' },
      storeId: { type: 'string' },
      bearerToken: { type: 'string' },
      liveSwitch: { type: 'string' },
    },
    additionalProperties: false,
  } as never,
  requiresIsolation: false,
  factory: () => createVaahstoreProvider(process.env) as never,
});

console.error('[providers] boot: registered', 'vaahstore');
