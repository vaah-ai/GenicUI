/**
 * PrimeVue registry — DataTable + InputPair + ResultCard + CityPicker + WeatherCard.
 *
 * Exports five component entries:
 *   - DataTable (F40): table with 8 props, 5 events
 *   - InputPair (F43): two numeric inputs + Submit, fires `submit` event
 *   - ResultCard (F43): display-only card with a computed result
 *   - CityPicker (F47): city dropdown + Submit, fires `submit` event
 *   - WeatherCard (F47): display-only card with weather details
 *
 * @module @genicul-primevue/registry/registry
 * @see {F40} — PrimeVue DataTable registry
 * @see {F43} — Chat as the sole render surface (interactive components)
 * @see {F47} — Component-event interactivity (CityPicker → WeatherCard)
 */

import type { TSchema } from '@sinclair/typebox';

import { CityPickerSchema } from './city-picker-schema.js';
import { CityPickerEvents } from './city-picker-events.js';
import { DataTableSchema } from './data-table-schema.js';
import { DataTableEvents } from './data-table-events.js';
import { InputPairSchema } from './input-pair-schema.js';
import { InputPairEvents } from './input-pair-events.js';
import { ResultCardSchema } from './result-card-schema.js';
import { WeatherCardSchema } from './weather-card-schema.js';

// ---------------------------------------------------------------------------
// Component entry — matches ComponentEntry from @genicui/server
// Registry packages define their own types to avoid server dependency.
// ---------------------------------------------------------------------------

/** A component event definition with optional payload schema. */
interface ComponentEvent {
  readonly name: string;
  readonly payloadSchema?: TSchema;
}

/** A single component entry matching the server's ComponentEntry type. */
interface ComponentEntry {
  readonly name: string;
  readonly version: string;
  readonly uri: string;
  readonly propsSchema: TSchema;
  readonly framework?: string;
  readonly tags: readonly string[];
  readonly events: readonly ComponentEvent[];
  readonly examples: readonly Readonly<Record<string, unknown>>[];
}

// ---------------------------------------------------------------------------
// DataTable entry
// ---------------------------------------------------------------------------

/**
 * DataTable component entry for the GenicUI registry.
 *
 * @see {F40} — PrimeVue DataTable registry
 */
export const DataTable: ComponentEntry = {
  name: 'data-table',
  version: '1.0.0',
  uri: 'ui://components/data-table@1.0.0',
  propsSchema: DataTableSchema,
  framework: 'primevue@4.2.0',
  tags: ['table', 'data', 'grid', 'rows', 'pagination', 'sort', 'filter'],
  events: DataTableEvents,
  examples: [
    {
      rows: [
        { id: '1', name: 'Alice', status: 'active' },
        { id: '2', name: 'Bob', status: 'inactive' },
      ],
      columns: [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status', label: 'Status', sortable: true, filterable: true },
      ],
      pageSize: 10,
      page: 0,
    },
    {
      rows: [
        { id: 'ORD-001', product: 'Widget A', quantity: 5, price: 9.99 },
        { id: 'ORD-002', product: 'Widget B', quantity: 3, price: 19.99 },
      ],
      columns: [
        { key: 'product', label: 'Product', sortable: true },
        { key: 'quantity', label: 'Qty', sortable: true },
        { key: 'price', label: 'Price', sortable: true },
      ],
      pageSize: 25,
      sort: { key: 'price', direction: 'desc' },
      selection: { mode: 'single' },
    },
    {
      rows: [
        { id: '1', name: 'Alice', role: 'admin' },
        { id: '2', name: 'Bob', role: 'user' },
        { id: '3', name: 'Carol', role: 'user' },
      ],
      columns: [
        { key: 'name', label: 'Name', sortable: true, filterable: true },
        { key: 'role', label: 'Role', sortable: true, filterable: true },
      ],
      pageSize: 10,
      selection: { mode: 'multiple', dataKey: 'id' },
      filters: { name: '' },
    },
  ],
};

// ---------------------------------------------------------------------------
// InputPair entry (F43)
// ---------------------------------------------------------------------------

/**
 * InputPair component entry.
 *
 * Two numeric inputs + Submit. Clicking Submit fires a `submit` component
 * event back to the chat bridge, which the server turns into a synthetic
 * follow-up prompt to the agent.
 */
export const InputPair: ComponentEntry = {
  name: 'input-pair',
  version: '1.0.0',
  uri: 'ui://components/input-pair@1.0.0',
  propsSchema: InputPairSchema,
  framework: 'primevue@4.2.0',
  tags: ['form', 'input', 'numeric', 'submit', 'calculator'],
  events: InputPairEvents,
  examples: [
    {
      input1: 5,
      input2: 3,
      label1: 'First number',
      label2: 'Second number',
      submitLabel: 'Add them',
    },
    {
      input1: 0,
      input2: 0,
      label1: 'a',
      label2: 'b',
      submitLabel: 'Submit',
    },
  ],
};

// ---------------------------------------------------------------------------
// ResultCard entry (F43)
// ---------------------------------------------------------------------------

/**
 * ResultCard component entry.
 *
 * Display-only card surfacing a computed value. Used as the answer
 * component after an InputPair.submit event — the agent renders this
 * with the sum of the two inputs.
 */
export const ResultCard: ComponentEntry = {
  name: 'result-card',
  version: '1.0.0',
  uri: 'ui://components/result-card@1.0.0',
  propsSchema: ResultCardSchema,
  framework: 'primevue@4.2.0',
  tags: ['card', 'result', 'display', 'calculator'],
  // Display-only — no events.
  events: [],
  examples: [
    {
      input1: 5,
      input2: 3,
      sum: 8,
      operation: 'add',
      title: 'Sum',
    },
    {
      sum: 42,
      title: 'Answer',
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry export — compatible with server registry loader
// ---------------------------------------------------------------------------

/**
 * The PrimeVue registry object.
 *
 * Exported for the `./registry` subpath:
 *   `import { registry } from '@genicul-primevue/registry/registry'`
 */
// ---------------------------------------------------------------------------
// CityPicker entry (F47)
// ---------------------------------------------------------------------------

/**
 * CityPicker component entry.
 *
 * City dropdown + Submit button. Clicking Submit fires a `submit` component
 * event back to the chat bridge, which the server turns into a synthetic
 * follow-up prompt. The agent then renders a WeatherCard for the chosen city.
 */
export const CityPicker: ComponentEntry = {
  name: 'city-picker',
  version: '1.0.0',
  uri: 'ui://components/city-picker@1.0.0',
  propsSchema: CityPickerSchema,
  framework: 'primevue@4.2.0',
  tags: ['form', 'input', 'dropdown', 'city', 'weather', 'interactive'],
  events: CityPickerEvents,
  examples: [
    {
      cityOptions: ['Paris', 'London', 'Tokyo', 'New York', 'Sydney'],
      label: 'Pick a city',
    },
    {
      initialCity: 'London',
      cityOptions: ['London', 'Paris', 'Berlin'],
    },
  ],
};

// ---------------------------------------------------------------------------
// WeatherCard entry (F47)
// ---------------------------------------------------------------------------

/**
 * WeatherCard component entry.
 *
 * Display-only card showing current weather for a city. Fetches from
 * the Open-Meteo API (free, no API key) client-side in onMounted.
 */
export const WeatherCard: ComponentEntry = {
  name: 'weather-card',
  version: '1.0.0',
  uri: 'ui://components/weather-card@1.0.0',
  propsSchema: WeatherCardSchema,
  framework: 'primevue@4.2.0',
  tags: ['card', 'weather', 'display', 'interactive'],
  // Display-only — no events (weather is fetched client-side).
  events: [],
  examples: [
    {
      city: 'Paris',
      units: 'metric',
    },
    {
      city: 'London',
      units: 'imperial',
    },
  ],
};

// ---------------------------------------------------------------------------
// Registry export — compatible with server registry loader
// ---------------------------------------------------------------------------

/**
 * The PrimeVue registry object.
 *
 * Exported for the `./registry` subpath:
 *   `import { registry } from '@genicul-primevue/registry/registry'`
 */
export const registry = {
  id: '@genicul-primevue/registry',
  version: '0.2.0',
  framework: 'primevue',
  components: [DataTable, InputPair, ResultCard, CityPicker, WeatherCard],
};
