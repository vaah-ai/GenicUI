/**
 * Schema validation — workspace-local copy.
 *
 * Shallow-adapted from `packages/server/src/validation/schema-validation.ts`
 * to honor the "zero edits to packages/" rule. The core version imports
 * `GENICUI_ERROR_CODES` from `@genicui/server/.../tool-registry.js`;
 * here we use a workspace-local `GENICUI_ERROR_CODES` constant.
 *
 * @module playground-ecommerce/server/providers/validation/schema-validation
 * @see {F14-AC2} — Invalid props -> -32003 with field details
 */

import type { TSchema } from '@sinclair/typebox';
import { Errors, type ValueErrorIterator } from '@sinclair/typebox/errors';

/**
 * Workspace-local JSON-RPC error codes. The MCP namespace
 * `-32001..-32010` is reserved for the framework; the workspace adds
 * `-32010 plugin_bearer_scrub_missing` for the F14 wrap-at-registration
 * contract (see registry.ts).
 *
 * The first four codes mirror the framework's `props_invalid`
 * namespace so plugin-side validation matches the chat handler's
 * `-32003 props_invalid` exactly.
 */
export const GENICUI_ERROR_CODES = {
  /** -32001 — component_not_found (framework) */
  component_not_found: -32001,
  /** -32003 — props_invalid (framework) */
  props_invalid: -32003,
  /** -32010 — workspace-local: HTTP-shaped plugin missing makeBearerScrubber */
  plugin_bearer_scrub_missing: -32010,
} as const;

/**
 * Result of a schema validation check.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  /** JSON-RPC error code (only when `valid` is `false`). */
  readonly code: number;
  /** Error message name (only when `valid` is `false`). */
  readonly message: string;
}

/**
 * Validate a payload against a TypeBox schema.
 *
 * Uses `Value.Errors()` to collect all field-level errors.
 * Returns a result object with validation status and error details.
 *
 * @see {F14-AC2} — invalid props -> -32003 with field details
 */
export function validateToolInput(
  schema: TSchema,
  payload: unknown,
): ValidationResult {
  const errors: ValueErrorIterator = Errors(schema, payload);
  const errorIterator = errors[Symbol.iterator]();

  const errorDetails: string[] = [];
  let done = false;

  while (!done) {
    const result = errorIterator.next();
    if (result.done) {
      done = true;
      break;
    }

    const error = result.value;
    errorDetails.push(`${error.path ?? '/root'}: ${error.message}`);
  }

  if (errorDetails.length === 0) {
    return { valid: true, errors: [], code: 0, message: '' };
  }

  return {
    valid: false,
    errors: errorDetails,
    code: GENICUI_ERROR_CODES.props_invalid,
    message: 'props_invalid',
  };
}

/**
 * Boolean shortcut.
 */
export function checkToolInput(schema: TSchema, payload: unknown): boolean {
  return validateToolInput(schema, payload).valid;
}
