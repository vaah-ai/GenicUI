/**
 * Schema validation — TypeBox Value.Errors() wrapper for tool input validation.
 *
 * @module @genicui/server/validation/schema-validation
 * @see {F14-AC2} — Invalid props -> -32003 with field details
 */
import type { TSchema } from '@sinclair/typebox';
/**
 * Result of a schema validation check.
 */
export interface ValidationResult {
    /** `true` if the payload passed validation. */
    readonly valid: boolean;
    /** Field-level error details (empty if valid). */
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
 * @param schema — the TypeBox schema to validate against
 * @param payload — the inbound payload to validate
 * @returns validation result with errors (if any)
 *
 * @see {F14-AC2} — invalid props -> -32003 with field details
 */
export declare function validateToolInput(schema: TSchema, payload: unknown): ValidationResult;
/**
 * Check if a payload passes schema validation (boolean shortcut).
 *
 * @param schema — the TypeBox schema to validate against
 * @param payload — the inbound payload to validate
 * @returns `true` if the payload passes validation
 */
export declare function checkToolInput(schema: TSchema, payload: unknown): boolean;
//# sourceMappingURL=schema-validation.d.ts.map