/**
 * @genicul-primevue/registry — PrimeVue registry adapter.
 *
 * Exports three component entries with their schemas and events:
 *   - DataTable (F40): table with 8 props, 5 events
 *   - InputPair (F43): two numeric inputs + Submit, fires `submit` event
 *   - ResultCard (F43): display-only card with a computed result
 *
 * @module @genicul-primevue/registry
 * @see {F40} — PrimeVue DataTable registry
 * @see {F43} — Chat as the sole render surface (interactive components)
 */

export { DataTable, InputPair, ResultCard, registry } from './registry.js';
export { DataTableSchema } from './data-table-schema.js';
export { DataTableEvents } from './data-table-events.js';
export { InputPairSchema } from './input-pair-schema.js';
export { InputPairEvents } from './input-pair-events.js';
export { ResultCardSchema } from './result-card-schema.js';

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
