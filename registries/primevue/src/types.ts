/**
 * PrimeVue DataTable registry — TypeScript interfaces.
 *
 * Defines the 8-prop API surface and event types for the
 * GenicUI DataTable component adapter.
 *
 * @module @genicul-primevue/registry/types
 * @see {F40} — PrimeVue DataTable registry
 */

// ---------------------------------------------------------------------------
// Row — generic data row
// ---------------------------------------------------------------------------

/**
 * A single data row. The registry does not enforce row shape —
 * the consumer's schema determines the fields. Each row must
 * contain the field specified by the {@link dataKey} in selection
 * (default: `"id"`).
 */
export interface Row extends Record<string, unknown> {
  /** Unique row identifier (default key: `"id"`). */
  readonly id: string;
}

// ---------------------------------------------------------------------------
// Column — defines a table column
// ---------------------------------------------------------------------------

/**
 * A column definition for the DataTable.
 *
 * @see {F40-AC1} — columns prop
 */
export interface DataTableColumn {
  /** The key (field name) on the row object. */
  readonly key: string;

  /** Display label shown in the header. */
  readonly label: string;

  /** Whether this column can be sorted. Default: true. */
  readonly sortable?: boolean;

  /** Whether this column has a filter input. Default: false. */
  readonly filterable?: boolean;
}

// ---------------------------------------------------------------------------
// Sort — sort state
// ---------------------------------------------------------------------------

/**
 * Sort configuration.
 *
 * @see {F40-AC2} — sort emits sort-change
 */
export interface DataTableSort {
  /** The column key to sort by. */
  readonly key: string;

  /** Sort direction. */
  readonly direction: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Filters — column-level filter state
// ---------------------------------------------------------------------------

/**
 * Filter state keyed by column key.
 *
 * @see {F40-AC3} — filter emits filter-change
 */
export type DataTableFilters = Record<string, string>;

// ---------------------------------------------------------------------------
// Selection — row selection mode
// ---------------------------------------------------------------------------

/**
 * Selection configuration.
 *
 * @see {F40-AC4} — selection emits selection-change
 */
export interface DataTableSelection {
  /** Selection mode. */
  readonly mode: 'single' | 'multiple';

  /**
   * The field on each row used as a unique identifier.
   * Default: `"id"`.
   */
  readonly dataKey?: string;
}

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

/** Payload emitted on {@link sort-change}. */
export interface SortChangePayload {
  /** The column key that was sorted. */
  readonly key: string;
  /** The sort direction. */
  readonly direction: 'asc' | 'desc';
}

/** Payload emitted on {@link filter-change}. */
export interface FilterChangePayload {
  /** The column key that was filtered. */
  readonly key: string;
  /** The filter value. */
  readonly value: string;
}

/** Payload emitted on {@link selection-change}. */
export interface SelectionChangePayload {
  /** Selected row IDs (multiple mode). */
  readonly rowIds?: readonly string[];
  /** Selected row ID (single mode). */
  readonly rowId?: string;
}

/** Payload emitted on {@link page-change}. */
export interface PageChangePayload {
  /** The current page index (0-based). */
  readonly page: number;
  /** The number of rows per page. */
  readonly pageSize: number;
}
