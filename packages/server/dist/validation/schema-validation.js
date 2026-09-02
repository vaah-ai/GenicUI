/**
 * Schema validation — TypeBox Value.Errors() wrapper for tool input validation.
 *
 * @module @genicui/server/validation/schema-validation
 * @see {F14-AC2} — Invalid props -> -32003 with field details
 */
import { Errors } from '@sinclair/typebox/errors';
import { GENICUI_ERROR_CODES } from '../mcp/tool-registry.js';
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
export function validateToolInput(schema, payload) {
    const errors = Errors(schema, payload);
    const errorIterator = errors[Symbol.iterator]();
    const errorDetails = [];
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
        return {
            valid: true,
            errors: [],
            code: 0,
            message: '',
        };
    }
    return {
        valid: false,
        errors: errorDetails,
        code: GENICUI_ERROR_CODES.props_invalid,
        message: 'props_invalid',
    };
}
/**
 * Check if a payload passes schema validation (boolean shortcut).
 *
 * @param schema — the TypeBox schema to validate against
 * @param payload — the inbound payload to validate
 * @returns `true` if the payload passes validation
 */
export function checkToolInput(schema, payload) {
    return validateToolInput(schema, payload).valid;
}
//# sourceMappingURL=schema-validation.js.map