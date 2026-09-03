/**
 * PrimeVue DataTable — registry definition.
 *
 * Exports the DataTable component as a GenicUI registry entry
 * with 8-prop schema and 5 events.
 *
 * @module @genicul-primevue/registry/registry
 * @see {F40} — PrimeVue DataTable registry
 */

import type { TSchema } from '@sinclair/typebox';

import { DataTableSchema } from './data-table-schema.js';
import { DataTableEvents } from './data-table-events.js';

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
// Component entry
// ---------------------------------------------------------------------------

/**
 * DataTable component entry for the GenicUI registry.
 *
 * Name: `data-table`
 * Version: `1.0.0`
 * URI: `ui://components/data-table@1.0.0`
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
// Registry export — compatible with server registry loader
// ---------------------------------------------------------------------------

/**
 * The PrimeVue registry object.
 *
 * Exported for the `./registry` subpath:
 *   `import { registry } from '@genicul-primevue/registry/registry'`
 *
 * The server's `loadRegistry()` reads `registry.json`; this programmatic
 * export is used when the package is imported directly (e.g. conformance
 * suite or dev-mode).
 */
export const registry = {
  id: '@genicul-primevue/registry',
  version: '0.1.0',
  framework: 'primevue',
  components: [DataTable],
};
