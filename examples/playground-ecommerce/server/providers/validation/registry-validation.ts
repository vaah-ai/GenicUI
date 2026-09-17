/**
 * Registry schema validation — workspace-local copy.
 *
 * Shallow-copied from `packages/server/src/validation/registry-validation.ts`
 * to honor the "zero edits to packages/" rule. The function is pure
 * logic with no runtime dependencies; behaviour is identical.
 *
 * @module playground-ecommerce/server/providers/validation/registry-validation
 * @see {F14-AC3} — additionalProperties:true rejected at registry load
 */

import type { TSchema } from '@sinclair/typebox';

/**
 * Error thrown when a schema contains `additionalProperties: true`.
 *
 * Workspace-local — the chat handler doesn't see this directly, but
 * `registerProvider(...)` catches it and re-throws with a
 * workspace-local error code.
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
 * @see {F14-AC3} — open schema rejected at load time
 */
export function rejectOpenSchemas(
  schema: TSchema,
  path: string = '/root',
): void {
  const schemaRecord = schema as Record<string, unknown>;
  const type = schemaRecord.type as string | undefined;

  if (type === 'object') {
    const additionalProps = schemaRecord.additionalProperties;

    if (additionalProps === true) {
      throw new RegistryValidationError(
        `Schema at ${path} has additionalProperties: true — rejected for security`,
        path,
      );
    }

    if (additionalProps && typeof additionalProps === 'object' && 'type' in additionalProps) {
      rejectOpenSchemas(additionalProps as unknown as TSchema, `${path}/additionalProperties`);
    }

    const properties = schemaRecord.properties;
    if (properties && typeof properties === 'object') {
      for (const [key, propSchema] of Object.entries(properties as Record<string, unknown>)) {
        if (propSchema && typeof propSchema === 'object' && 'type' in propSchema) {
          rejectOpenSchemas(propSchema as unknown as TSchema, `${path}/properties/${key}`);
        }
      }
    }
  }

  if (type === 'array') {
    const items = schemaRecord.items;
    if (items && typeof items === 'object' && 'type' in items) {
      rejectOpenSchemas(items as unknown as TSchema, `${path}/items`);
    }
  }

  const anyOf = schemaRecord.anyOf;
  if (anyOf && Array.isArray(anyOf)) {
    anyOf.forEach((subSchema: unknown, index: number) => {
      if (subSchema && typeof subSchema === 'object') {
        rejectOpenSchemas(subSchema as unknown as TSchema, `${path}/anyOf/${index}`);
      }
    });
  }

  const allOf = schemaRecord.allOf;
  if (allOf && Array.isArray(allOf)) {
    allOf.forEach((subSchema: unknown, index: number) => {
      if (subSchema && typeof subSchema === 'object') {
        rejectOpenSchemas(subSchema as unknown as TSchema, `${path}/allOf/${index}`);
      }
    });
  }

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
