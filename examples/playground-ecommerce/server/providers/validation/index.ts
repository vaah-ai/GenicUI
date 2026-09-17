/**
 * Workspace-local F14 trust-boundary validation — barrel export.
 *
 * Shallow-copies of the three primitives in
 * `packages/server/src/validation/`. Honor the "zero edits to packages/"
 * rule by exposing them as workspace-internal symbols only.
 *
 * Consumers:
 *   - `registry.ts` — `registerProvider` invokes `rejectOpenSchemas`
 *     on each plugin's `configSchema` (F14-AC3).
 *   - `vaahstore/runtime/index.ts` — `stripProtoKeys` on inbound payloads
 *     (F14-AC1) and `validateToolInput` on each `callTool` args (F14-AC2).
 *
 * @module playground-ecommerce/server/providers/validation
 */

export { stripProtoKeys, hasProtoKeys } from './strip-proto-keys.js';
export { rejectOpenSchemas, RegistryValidationError } from './registry-validation.js';
export {
  validateToolInput,
  checkToolInput,
  GENICUI_ERROR_CODES,
} from './schema-validation.js';
export type { ValidationResult } from './schema-validation.js';
