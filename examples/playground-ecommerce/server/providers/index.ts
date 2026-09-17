/**
 * Workspace plugin API barrel.
 *
 * Re-exports the 6-function plugin surface + the 3 custom error types.
 * Downstream consumers (M5.2-T5 chat handler, future plugins) import
 * from here, not from `./registry` directly.
 *
 * @module playground-ecommerce/server/providers
 */

export {
  defineProvider,
  registerProvider,
  unregisterProvider,
  getProviderAdaptor,
  listProviderIds,
  discoverWorkspaceProviders,
  __resetRegistryForTests,
  DuplicateProviderError,
  ProviderShapeError,
  BearerScrubMissingError,
} from './registry.js';

export type {
  ProviderAdaptor,
  ProviderConfig,
  ChatEvent,
  ParsedLine,
  ProviderPluginManifest,
  ProviderPluginSpec,
  PluginExtraSurface,
} from './types.js';

export {
  stripProtoKeys,
  hasProtoKeys,
  rejectOpenSchemas,
  RegistryValidationError,
  validateToolInput,
  checkToolInput,
  GENICUI_ERROR_CODES,
} from './validation/index.js';
export type { ValidationResult } from './validation/index.js';
