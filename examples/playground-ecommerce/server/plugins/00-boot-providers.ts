/**
 * Nuxt server plugin — runs once at workspace server start.
 *
 * Triggers the workspace's provider plugin boot. Nuxt auto-loads
 * every `server/plugins/*.ts` file at server start, so dropping this
 * one file in place is enough to make `boot.ts` run.
 *
 * @module playground-ecommerce/server/plugins/00-boot-providers
 *
 * @see {M5.2-T2-1} — workspace plugin architecture
 */

import { defineNitroPlugin } from 'nitropack/runtime';
import { registerProvider, listProviderIds } from '../providers/index.js';
import '../providers/boot.js';

export default defineNitroPlugin(() => {
  // `boot.ts` runs on import and registers `vaahstore`. We re-import
  // here defensively in case Nuxt's auto-load misses the transitive
  // side-effect import. `registerProvider` is idempotent (idempotency
  // is the boot file's job).
  void registerProvider;
  console.error('[providers] nitro-plugin: active providers =', listProviderIds());
});
