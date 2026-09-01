/**
 * GenicSchema — TypeBox wrapper that produces JSON Schema 2020-12 with
 * `additionalProperties: false` enforced on every object type, and
 * GenicUI metadata annotations.
 *
 * @module @genicui/core/schema/genic-schema
 * @see {F2} — GenicSchema<T> abstraction
 */
import { type TSchema } from '@sinclair/typebox';
import type { GenicSchemaOptions, GenicSchemaResult, GenicSchemaBuilder } from './types.js';
/**
 * Creates a `GenicSchema<T>` from a TypeBox schema definition.
 *
 * Produces JSON Schema 2020-12 with:
 * - `additionalProperties: false` on every object type
 * - `$schema` meta-schema URI
 * - `x-genicui-name` and `x-genicui-version` annotations
 * - `deprecated: true` on fields marked via `.deprecated(path)`
 *
 * @param typeboxDef - A TypeBox schema (Type.Object, Type.Array, etc.)
 * @returns A builder that can mark deprecated fields and finalize.
 *
 * @example
 * ```ts
 * import { Type } from '@sinclair/typebox';
 * import { genicSchema } from '@genicui/core';
 *
 * const T = Type.Object({
 *   rows: Type.Array(Type.Object({
 *     id: Type.String(),
 *     name: Type.String(),
 *   })),
 *   pageSize: Type.Integer({ default: 10 }),
 * });
 *
 * const { schema } = genicSchema(T).build({ name: 'DataTableProps' });
 * // schema.additonalProperties === false
 * // schema.properties.rows.items.additonalProperties === false
 * ```
 */
export declare function genicSchema<T extends TSchema>(typeboxDef: T): GenicSchemaBuilder<T>;
/**
 * Convenience function that builds a GenicSchema without deprecated fields.
 * Equivalent to `genicSchema(def).build(options)`.
 */
export declare function createGenicSchema<T extends TSchema>(typeboxDef: T, options: GenicSchemaOptions): GenicSchemaResult<T>;
//# sourceMappingURL=genic-schema.d.ts.map