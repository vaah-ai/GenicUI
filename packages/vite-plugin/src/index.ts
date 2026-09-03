/**
 * GenicUI Vite Plugin — barrel exports.
 *
 * @module @genicui/vite-plugin
 * @see {F30} — Vite plugin + component auto-registration
 */

export { viteGenicUI } from './plugin.js';
export { scanComponentFile } from './scanner.js';
export type {
  ComponentMeta,
  GenicUIPluginOptions,
  GenicUIRegistry,
  RegistryEntry,
} from './types.js';
