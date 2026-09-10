/**
 * PrimeVue DataTable — TypeBox schema.
 *
 * Enforces exactly 8 top-level props (F40-AC1):
 *   rows, columns, pageSize, page, sort, filters, selection, loading
 *
 * @module @genicul-primevue/registry/data-table-schema
 * @see {F40-AC1} — 8 prop API
 */

import { Type } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

/** Row: arbitrary object with at least an `id` field. */
const RowSchema = Type.Object({
  id: Type.String(),
}, { additionalProperties: true });

/** Column definition (F40-AC1). */
const ColumnSchema = Type.Object({
  key: Type.String(),
  label: Type.String(),
  sortable: Type.Optional(Type.Boolean()),
  filterable: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

/** Sort configuration (F40-AC2). */
const SortSchema = Type.Object({
  key: Type.String(),
  direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
}, { additionalProperties: false });

/** Selection configuration (F40-AC4). */
const SelectionSchema = Type.Object({
  mode: Type.Union([Type.Literal('single'), Type.Literal('multiple')]),
  dataKey: Type.Optional(Type.String()),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Main DataTable schema — exactly 8 props (F40-AC1)
// ---------------------------------------------------------------------------

/**
 * PrimeVue DataTable props schema.
 *
 * Enforces exactly 8 top-level properties. `additionalProperties: false`
 * ensures the server rejects any extra props at the trust boundary.
 */
export const DataTableSchema = Type.Object({
  /** Array of data rows. */
  rows: Type.Array(RowSchema),

  /** Column definitions. */
  columns: Type.Array(ColumnSchema),

  /** Number of rows per page. Default: 10. */
  pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),

  /** Current page index (0-based). Default: 0. */
  page: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),

  /** Sort state. */
  sort: Type.Optional(SortSchema),

  /** Filter state keyed by column key. */
  filters: Type.Optional(Type.Record(Type.String(), Type.String())),

  /** Selection mode and data key. */
  selection: Type.Optional(SelectionSchema),

  /** Loading indicator. Default: false. */
  loading: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Prop count assertion (F40-AC1)
// ---------------------------------------------------------------------------

/**
 * Assert that the schema defines exactly 8 properties.
 * Throws at module-load time if the count changes.
 */
const propCount = Object.keys(
  (DataTableSchema as { properties?: Record<string, unknown> }).properties ?? {},
).length;

if (propCount !== 8) {
  throw new Error(
    `DataTableSchema must have exactly 8 props, found ${propCount} (F40-AC1)`,
  );
}
