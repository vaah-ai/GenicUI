/**
 * GenicSchema type definitions.
 *
 * @module @genicui/core/schema/types
 * @see {F2} — GenicSchema<T> abstraction
 */
import type { TSchema, Static } from '@sinclair/typebox';
/**
 * Options for {@link genicSchema}.
 */
export interface GenicSchemaOptions {
    /** Human-readable name for the schema (e.g. 'DataTableProps'). */
    name: string;
    /** Package version embedded as x-genicui-version. Defaults to '0.1.0'. */
    version?: string;
}
/**
 * Result of {@link genicSchema} — JSON Schema 2020-12 with GenicUI metadata.
 */
export interface GenicSchemaResult<T extends TSchema> {
    /** The JSON Schema 2020-12 object. */
    schema: JSONSchema2020_12 & {
        'x-genicui-name': string;
        'x-genicui-version': string;
    };
    /** The inferred TypeScript type from the TypeBox definition. */
    type: Static<T>;
    /** The original TypeBox schema. */
    typebox: T;
}
/**
 * Minimal JSON Schema 2020-12 interface for TypeScript typing.
 * The actual runtime object is the TypeBox schema with injected annotations.
 */
export interface JSONSchema2020_12 {
    $schema?: string;
    $id?: string;
    type?: string | string[];
    properties?: Record<string, JSONSchema2020_12>;
    items?: JSONSchema2020_12;
    additionalProperties?: boolean | JSONSchema2020_12;
    required?: string[];
    deprecated?: boolean;
    description?: string;
    [key: string]: unknown;
}
/**
 * Schema builder that provides a fluent API for deprecated fields.
 */
export interface GenicSchemaBuilder<T extends TSchema> {
    /** The underlying TypeBox schema. */
    schema: T;
    /** Mark a property path as deprecated. Chainable. */
    deprecated(path: string): GenicSchemaBuilder<T>;
    /** Finalize and return the JSON Schema 2020-12 result. */
    build(options: GenicSchemaOptions): GenicSchemaResult<T>;
    /** Deprecated alias for {@link build}. */
    compile(options: GenicSchemaOptions): GenicSchemaResult<T>;
}
/**
 * Internal marker for deprecated property paths.
 */
export interface GenicSchemaMetadata {
    /** Property paths marked as deprecated. */
    deprecatedPaths: Set<string>;
}
//# sourceMappingURL=types.d.ts.map