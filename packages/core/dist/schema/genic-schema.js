/**
 * GenicSchema — TypeBox wrapper that produces JSON Schema 2020-12 with
 * `additionalProperties: false` enforced on every object type, and
 * GenicUI metadata annotations.
 *
 * @module @genicui/core/schema/genic-schema
 * @see {F2} — GenicSchema<T> abstraction
 */
/**
 * JSON Schema 2020-12 meta-schema URI.
 */
const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';
/**
 * Recursively injects `additionalProperties: false` into every object-type
 * node within a TypeBox schema. This walks nested objects (properties, items,
 * unevaluated properties, etc.) to ensure the constraint is enforced at every
 * level — matching the spec example where even nested object arrays carry
 * `additionalProperties: false`.
 *
 * Returns a **new** schema object; never mutates the input.
 */
function injectAdditionalPropertiesFalse(schema) {
    if (schema === null || typeof schema !== 'object') {
        return schema;
    }
    if (Array.isArray(schema)) {
        return schema.map(injectAdditionalPropertiesFalse);
    }
    const obj = schema;
    // Only inject on object-type schemas
    if (obj.type === 'object') {
        const result = { ...obj, additionalProperties: false };
        // Recurse into properties
        if (result.properties && typeof result.properties === 'object') {
            result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, value]) => [key, injectAdditionalPropertiesFalse(value)]));
        }
        // Recurse into unevaluatedProperties, additionalProperties (if schema)
        for (const key of ['unevaluatedProperties', 'if', 'then', 'else', 'contains', 'not']) {
            if (key in result) {
                result[key] = injectAdditionalPropertiesFalse(result[key]);
            }
        }
        return result;
    }
    // Recurse into array items
    if (obj.type === 'array' && obj.items) {
        return { ...obj, items: injectAdditionalPropertiesFalse(obj.items) };
    }
    // Recurse into all-nested JSON Schema keywords that may contain schemas
    const schemaKeywords = [
        'allOf',
        'anyOf',
        'oneOf',
        'contains',
        'not',
        'if',
        'then',
        'else',
        'unevaluatedItems',
        'unevaluatedProperties',
        'propertyNames',
        'additionalItems',
    ];
    let modified = false;
    const result = { ...obj };
    for (const key of schemaKeywords) {
        if (key in result) {
            result[key] = injectAdditionalPropertiesFalse(result[key]);
            modified = true;
        }
    }
    // Handle patternProperties (object with schema values)
    if ('patternProperties' in result && typeof result.patternProperties === 'object') {
        result.patternProperties = Object.fromEntries(Object.entries(result.patternProperties).map(([key, value]) => [key, injectAdditionalPropertiesFalse(value)]));
        modified = true;
    }
    return modified ? result : obj;
}
/**
 * Injects `deprecated: true` at the specified property paths.
 *
 * @param schema - The schema to modify.
 * @param paths - Dot-separated property paths (e.g. 'rows.id').
 */
function injectDeprecated(schema, paths) {
    if (!paths.size) {
        return schema;
    }
    const result = { ...schema };
    if (result.type !== 'object' || !result.properties || typeof result.properties !== 'object') {
        return result;
    }
    const props = result.properties;
    for (const path of paths) {
        const parts = path.split('.');
        const head = parts[0];
        const rest = parts.slice(1);
        if (head === undefined || !(head in props)) {
            continue;
        }
        if (rest.length === 0) {
            // Direct property
            const prop = props[head];
            if (prop && typeof prop === 'object') {
                props[head] = { ...prop, deprecated: true };
            }
        }
        else {
            // Nested path — recurse
            const prop = props[head];
            if (prop && typeof prop === 'object') {
                props[head] = injectDeprecated(prop, new Set([rest.join('.')]));
            }
        }
    }
    return result;
}
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
export function genicSchema(typeboxDef) {
    const deprecatedPaths = new Set();
    const builder = {
        schema: typeboxDef,
        deprecated(path) {
            deprecatedPaths.add(path);
            return builder;
        },
        build(options) {
            // Step 1: Inject additionalProperties: false into all object types
            let result = injectAdditionalPropertiesFalse(typeboxDef);
            // Step 2: Inject deprecated markers
            result = injectDeprecated(result, deprecatedPaths);
            // Step 3: Add GenicUI metadata
            const finalSchema = {
                ...result,
                $schema: JSON_SCHEMA_2020_12,
                'x-genicui-name': options.name,
                'x-genicui-version': options.version ?? '0.1.0',
            };
            return {
                schema: finalSchema,
                type: undefined,
                typebox: result,
            };
        },
        compile(options) {
            return this.build(options);
        },
    };
    return builder;
}
/**
 * Convenience function that builds a GenicSchema without deprecated fields.
 * Equivalent to `genicSchema(def).build(options)`.
 */
export function createGenicSchema(typeboxDef, options) {
    return genicSchema(typeboxDef).build(options);
}
//# sourceMappingURL=genic-schema.js.map