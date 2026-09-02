/**
 * Registry schema validation — rejects `additionalProperties: true` at load time.
 *
 * @module @genicui/server/validation/registry-validation
 * @see {F14-AC3} — additionalProperties:true rejected at registry load
 */
import type { TSchema } from '@sinclair/typebox';
/**
 * Error thrown when a schema contains `additionalProperties: true`.
 *
 * Registry schemas must enforce `additionalProperties: false` to
 * prevent open schemas that accept arbitrary properties.
 *
 * @see {F14-AC3} — open schema rejected at load time
 */
export declare class RegistryValidationError extends Error {
    /** The JSON pointer path to the offending schema node. */
    readonly path: string;
    constructor(message: string, 
    /** The JSON pointer path to the offending schema node. */
    path: string);
}
/**
 * Recursively walks a TypeBox schema tree and rejects any node
 * that has `additionalProperties: true`.
 *
 * Throws `RegistryValidationError` on the first violation found.
 *
 * @param schema — the schema to validate
 * @param path — the current JSON pointer path (for error reporting)
 *
 * @see {F14-AC3} — additionalProperties:true rejected at load
 */
export declare function rejectOpenSchemas(schema: TSchema, path?: string): void;
//# sourceMappingURL=registry-validation.d.ts.map