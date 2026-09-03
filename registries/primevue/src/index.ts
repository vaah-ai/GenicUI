/**
 * @genicul-primevue/registry — PrimeVue DataTable registry adapter.
 *
 * Exports the DataTable component entry with 8-prop schema and 5 events.
 *
 * @module @genicul-primevue/registry
 * @see {F40} — PrimeVue DataTable registry
 */

export { DataTable, registry } from './registry.js';
export { DataTableSchema } from './data-table-schema.js';
export { DataTableEvents } from './data-table-events.js';

// Re-export types
export type {
  Row,
  DataTableColumn,
  DataTableSort,
  DataTableFilters,
  DataTableSelection,
  SortChangePayload,
  FilterChangePayload,
  SelectionChangePayload,
  PageChangePayload,
} from './types.js';
