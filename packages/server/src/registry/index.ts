/**
 * Registry module — barrel export for F37 component registry.
 *
 * @module @genicui/server/registry
 * @see {F37} — Component registry + manifest loader
 */

export type {
  ComponentEntry,
  ComponentEvent,
  RegistryFile,
  RegistryComponent,
  ComponentEventDefinition,
} from './types.js';

export { RegistryLoadError } from './types.js';

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
