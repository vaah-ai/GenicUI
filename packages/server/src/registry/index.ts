/**
 * Registry module — barrel export for F37 component registry and F38 trust tiers.
 *
 * @module @genicui/server/registry
 * @see {F37} — Component registry + manifest loader
 * @see {F38} — Registry trust tiers (project / user / remote)
 */

export type {
  ComponentEntry,
  ComponentEvent,
  RegistryFile,
  RegistryComponent,
  ComponentEventDefinition,
  RegistryTier,
  TieredComponentEntry,
  LoadRegistryOptions,
  RegistryAllowListEntry,
  RemoteAllowList,
} from './types.js';

export { RegistryLoadError, TIER_PRIORITY } from './types.js';

export {
  loadRegistry,
  initRegistry,
  reloadRegistry,
  getRegistry,
  getRegistryPath,
  getRegistryLastLoaded,
  findEntryByName,
  listComponentNames,
  isRegistryLoaded,
  buildComponentUri,
} from './registry-loader.js';

export {
  TieredRegistry,
  tieredRegistry,
  globMatch,
  isRemoteAllowed,
  getRemoteAllowList,
  tierPriority,
} from './trust-tiers.js';
