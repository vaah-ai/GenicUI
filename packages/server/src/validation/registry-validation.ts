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
export class RegistryValidationError extends Error {
  constructor(
    message: string,
    /** The JSON pointer path to the offending schema node. */
    public readonly path: string,
  ) {
    super(message);
    this.name = 'RegistryValidationError';
  }
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
export function rejectOpenSchemas(
  schema: TSchema,
  path: string = '/root',
): void {
  const schemaRecord = schema as Record<string, unknown>;
  const type = schemaRecord.type as string | undefined;

  // Object schemas: check additionalProperties
  if (type === 'object') {
    const additionalProps = schemaRecord.additionalProperties;

    // If additionalProperties is explicitly set to true (boolean), reject.
    if (additionalProps === true) {
      throw new RegistryValidationError(
        `Schema at ${path} has additionalProperties: true — rejected for security`,
        path,
      );
    }

    // If additionalProperties is a schema (not boolean), walk it.
    if (additionalProps && typeof additionalProps === 'object' && 'type' in additionalProps) {
      rejectOpenSchemas(additionalProps as unknown as TSchema, `${path}/additionalProperties`);
    }

    // Walk each property schema
    const properties = schemaRecord.properties;
    if (properties && typeof properties === 'object') {
      for (const [key, propSchema] of Object.entries(properties as Record<string, unknown>)) {
        if (propSchema && typeof propSchema === 'object' && 'type' in propSchema) {
          rejectOpenSchemas(propSchema as unknown as TSchema, `${path}/properties/${key}`);
        }
      }
    }
  }

  // Array schemas: walk the items schema
  if (type === 'array') {
    const items = schemaRecord.items;
    if (items && typeof items === 'object' && 'type' in items) {
      rejectOpenSchemas(items as unknown as TSchema, `${path}/items`);
    }
  }

  // Union schemas: walk anyOf subschemas
  const anyOf = schemaRecord.anyOf;
  if (anyOf && Array.isArray(anyOf)) {
    anyOf.forEach((subSchema: unknown, index: number) => {
      if (subSchema && typeof subSchema === 'object') {
        rejectOpenSchemas(subSchema as unknown as TSchema, `${path}/anyOf/${index}`);
      }
    });
  }

  // AllOf / Intersect schemas: walk allOf subschemas
  const allOf = schemaRecord.allOf;
  if (allOf && Array.isArray(allOf)) {
    allOf.forEach((subSchema: unknown, index: number) => {
      if (subSchema && typeof subSchema === 'object') {
        rejectOpenSchemas(subSchema as unknown as TSchema, `${path}/allOf/${index}`);
      }
    });
  }

  // If/then/else schemas: walk conditional schemas
  const ifSchema = schemaRecord.if;
  if (ifSchema && typeof ifSchema === 'object' && 'type' in ifSchema) {
    rejectOpenSchemas(ifSchema as unknown as TSchema, `${path}/if`);
  }
  const thenSchema = schemaRecord.then;
  if (thenSchema && typeof thenSchema === 'object' && 'type' in thenSchema) {
    rejectOpenSchemas(thenSchema as unknown as TSchema, `${path}/then`);
  }
  const elseSchema = schemaRecord.else;
  if (elseSchema && typeof elseSchema === 'object' && 'type' in elseSchema) {
    rejectOpenSchemas(elseSchema as unknown as TSchema, `${path}/else`);
  }
}
