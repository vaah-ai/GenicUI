/**
 * PrimeVue DataTable — event definitions.
 *
 * Declares the events this component can emit, each with a
 * TypeBox payload schema for trust-boundary validation.
 *
 * @module @genicul-primevue/registry/data-table-events
 * @see {F40-AC2} — sort-change
 * @see {F40-AC3} — filter-change
 * @see {F40-AC4} — selection-change
 */

import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';

/** A component event definition with optional payload schema. */
interface ComponentEvent {
  readonly name: string;
  readonly payloadSchema?: TSchema;
}

// ---------------------------------------------------------------------------
// Sort change event (F40-AC2)
// ---------------------------------------------------------------------------

const SortChangePayload = Type.Object({
  key: Type.String(),
  direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Filter change event (F40-AC3)
// ---------------------------------------------------------------------------

const FilterChangePayload = Type.Object({
  key: Type.String(),
  value: Type.String(),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Selection change event (F40-AC4)
// ---------------------------------------------------------------------------

const SelectionChangePayload = Type.Object({
  rowIds: Type.Optional(Type.Array(Type.String())),
  rowId: Type.Optional(Type.String()),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Page change event
// ---------------------------------------------------------------------------

const PageChangePayload = Type.Object({
  page: Type.Integer({ minimum: 0 }),
  pageSize: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Event array — order matches the spec
// ---------------------------------------------------------------------------

/**
 * DataTable events.
 *
 * - sort-change (F40-AC2): user clicks a sortable column header
 * - filter-change (F40-AC3): user types in a filter input (300ms debounce)
 * - selection-change (F40-AC4): user selects/deselects rows
 * - page-change: user navigates to a different page
 * - row-click: user clicks a row body
 */
export const DataTableEvents: readonly ComponentEvent[] = [
  {
    name: 'sort-change',
    payloadSchema: SortChangePayload,
  },
  {
    name: 'filter-change',
    payloadSchema: FilterChangePayload,
  },
  {
    name: 'selection-change',
    payloadSchema: SelectionChangePayload,
  },
  {
    name: 'page-change',
    payloadSchema: PageChangePayload,
  },
  {
    name: 'row-click',
    payloadSchema: Type.Object({
      rowId: Type.String(),
    }, { additionalProperties: false }),
  },
];
