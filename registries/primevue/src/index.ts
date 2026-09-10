/**
 * @genicul-primevue/registry — PrimeVue registry adapter.
 *
 * Exports five component entries with their schemas and events:
 *   - DataTable (F40): table with 8 props, 5 events
 *   - InputPair (F43): two numeric inputs + Submit, fires `submit` event
 *   - ResultCard (F43): display-only card with a computed result
 *   - CityPicker (F47): city dropdown + Submit, fires `submit` event
 *   - WeatherCard (F47): display-only card with weather details
 *
 * @module @genicul-primevue/registry
 * @see {F40} — PrimeVue DataTable registry
 * @see {F43} — Chat as the sole render surface (interactive components)
 * @see {F47} — Component-event interactivity (CityPicker → WeatherCard)
 */

export { DataTable, InputPair, ResultCard, CityPicker, WeatherCard, registry } from './registry.js';
export { DataTableSchema } from './data-table-schema.js';
export { DataTableEvents } from './data-table-events.js';
export { InputPairSchema } from './input-pair-schema.js';
export { InputPairEvents } from './input-pair-events.js';
export { ResultCardSchema } from './result-card-schema.js';
export { CityPickerSchema } from './city-picker-schema.js';
export { CityPickerEvents } from './city-picker-events.js';
export { WeatherCardSchema } from './weather-card-schema.js';

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
