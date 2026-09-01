/**
 * GenicUI Core — shared types and constants.
 *
 * @module @genicui/core
 */

/**
 * Package version string.
 * Updated automatically by release tooling; manually synced for now.
 *
 * @see {F1-AC2} — ESM resolution test
 */
export const VERSION: string = "0.1.0";

// F2 — GenicSchema abstraction exports
export { genicSchema, createGenicSchema } from './schema/genic-schema.js';
export type {
  GenicSchemaOptions,
  GenicSchemaResult,
  GenicSchemaBuilder,
  JSONSchema2020_12,
} from './schema/types.js';
