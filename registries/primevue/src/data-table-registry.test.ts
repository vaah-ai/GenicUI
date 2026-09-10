/**
 * PrimeVue DataTable registry — integration tests.
 *
 * Verifies F40-AC1 through F40-AC4.
 *
 * @module @genicul-primevue/registry/data-table-registry.test
 * @see {F40} — PrimeVue DataTable registry
 */

import { describe, it, expect } from 'bun:test';
import { Value } from '@sinclair/typebox/value';

import { DataTable, registry } from './registry.js';
import { DataTableSchema } from './data-table-schema.js';
import { DataTableEvents } from './data-table-events.js';

// ---------------------------------------------------------------------------
// F40-AC1: Schema enforces exactly 8 top-level props
// ---------------------------------------------------------------------------

describe('F40-AC1: 8 prop API', () => {
  it('schema has exactly 8 properties', () => {
    const props = (DataTableSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props);
    expect(keys.length).toBe(8);
  });

  it('enforced props are the expected 8', () => {
    const props = (DataTableSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const keys = Object.keys(props).sort();
    expect(keys).toEqual([
      'columns',
      'filters',
      'loading',
      'page',
      'pageSize',
      'rows',
      'selection',
      'sort',
    ]);
  });

  it('additionalProperties is false', () => {
    expect(DataTableSchema.additionalProperties).toBe(false);
  });

  it('valid props pass TypeBox validation', () => {
    const validProps = {
      rows: [{ id: '1', name: 'Alice' }],
      columns: [{ key: 'name', label: 'Name' }],
      pageSize: 10,
      page: 0,
    };
    const result = Value.Check(DataTableSchema, validProps);
    expect(result).toBe(true);
  });

  it('props with extra fields fail validation', () => {
    const invalidProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'x', label: 'X' }],
      extraField: 'should-fail',
    };
    const result = Value.Check(DataTableSchema, invalidProps);
    expect(result).toBe(false);
  });

  it('missing required rows fails validation', () => {
    const invalidProps = {
      columns: [{ key: 'x', label: 'X' }],
    };
    const result = Value.Check(DataTableSchema, invalidProps);
    expect(result).toBe(false);
  });

  it('missing required columns fails validation', () => {
    const invalidProps = {
      rows: [{ id: '1' }],
    };
    const result = Value.Check(DataTableSchema, invalidProps);
    expect(result).toBe(false);
  });

  it('DataTable entry has 8-prop schema', () => {
    const props = (DataTable.propsSchema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props).length).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// F40-AC1: Sub-schema edge cases
// ---------------------------------------------------------------------------

describe('F40-AC1: Sub-schema validation', () => {
  // -- RowSchema --

  it('row without id fails validation', () => {
    const props = {
      rows: [{ name: 'Alice' }],
      columns: [{ key: 'name', label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('row with non-string id fails validation', () => {
    const props = {
      rows: [{ id: 123 }],
      columns: [{ key: 'name', label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('row with extra fields passes (additionalProperties: true)', () => {
    const props = {
      rows: [{ id: '1', name: 'Alice', extra: true }],
      columns: [{ key: 'name', label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- ColumnSchema --

  it('column without label fails validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('column without key fails validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('column with extra field fails (additionalProperties: false)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name', extra: true }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('column without sortable/filterable passes (optional)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- Empty arrays --

  it('empty rows array passes validation', () => {
    const props = {
      rows: [],
      columns: [{ key: 'name', label: 'Name' }],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  it('empty columns array passes validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [],
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- SortSchema --

  it('sort with extra field fails (additionalProperties: false)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      sort: { key: 'name', direction: 'asc' as const, extra: true },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('sort missing key fails validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      sort: { direction: 'asc' as const },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('sort missing direction fails validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      sort: { key: 'name' },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  // -- SelectionSchema --

  it('selection with extra field fails (additionalProperties: false)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      selection: { mode: 'single' as const, extra: true },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('selection single mode with dataKey passes', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      selection: { mode: 'single' as const, dataKey: 'id' },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- Filters edge cases --

  it('empty filters object passes validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      filters: {},
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  it('filters with empty string value passes', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      filters: { name: '' },
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- pageSize bounds --

  it('pageSize: 0 fails validation (below minimum)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      pageSize: 0,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('pageSize: 101 fails validation (above maximum)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      pageSize: 101,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('pageSize: 1 passes (boundary)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      pageSize: 1,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  it('pageSize: 100 passes (boundary)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      pageSize: 100,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- page bounds --

  it('page: -1 fails validation (below minimum)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      page: -1,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });

  it('page: 0 passes (boundary)', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      page: 0,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  // -- loading prop --

  it('loading: true passes validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      loading: true,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  it('loading: false passes validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      loading: false,
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(true);
  });

  it('loading with string value fails validation', () => {
    const props = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      loading: 'true',
    };
    const result = Value.Check(DataTableSchema, props);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F40-AC2: Sort emits sort-change event
// ---------------------------------------------------------------------------

describe('F40-AC2: Sort emits sort-change', () => {
  it('DataTable has sort-change event defined', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    expect(sortEvent).toBeDefined();
  });

  it('sort-change payload schema has key and direction', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    expect(sortEvent?.payloadSchema).toBeDefined();
    const schema = sortEvent!.payloadSchema!;
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props)).toContain('key');
    expect(Object.keys(props)).toContain('direction');
  });

  it('sort-change payload validates correct payload', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    const payload = { key: 'name', direction: 'asc' as const };
    const result = Value.Check(sortEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('sort-change payload rejects invalid direction', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    const payload = { key: 'name', direction: 'invalid' };
    const result = Value.Check(sortEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('sort-change payload rejects missing key', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    const payload = { direction: 'asc' as const };
    const result = Value.Check(sortEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('sort-change payload rejects extra fields (additionalProperties: false)', () => {
    const sortEvent = DataTableEvents.find((e) => e.name === 'sort-change');
    const payload = { key: 'name', direction: 'asc' as const, extra: true };
    const result = Value.Check(sortEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('sort prop accepts valid sort configuration', () => {
    const validProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      sort: { key: 'name', direction: 'desc' },
    };
    const result = Value.Check(DataTableSchema, validProps);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F40-AC3: Filter emits filter-change with debounce
// ---------------------------------------------------------------------------

describe('F40-AC3: Filter emits filter-change', () => {
  it('DataTable has filter-change event defined', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    expect(filterEvent).toBeDefined();
  });

  it('filter-change payload schema has key and value', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    expect(filterEvent?.payloadSchema).toBeDefined();
    const schema = filterEvent!.payloadSchema!;
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props)).toContain('key');
    expect(Object.keys(props)).toContain('value');
  });

  it('filter-change payload validates correct payload', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    const payload = { key: 'name', value: 'alice' };
    const result = Value.Check(filterEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('filter-change payload rejects missing value', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    const payload = { key: 'name' } as unknown as Record<string, unknown>;
    const result = Value.Check(filterEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('filter-change payload rejects missing key', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    const payload = { value: 'alice' } as unknown as Record<string, unknown>;
    const result = Value.Check(filterEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('filter-change payload rejects extra fields (additionalProperties: false)', () => {
    const filterEvent = DataTableEvents.find((e) => e.name === 'filter-change');
    const payload = { key: 'name', value: 'alice', extra: true };
    const result = Value.Check(filterEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('filters prop accepts valid filter object', () => {
    const validProps = {
      rows: [{ id: '1', name: 'Alice' }],
      columns: [{ key: 'name', label: 'Name', filterable: true }],
      filters: { name: 'Alice' },
    };
    const result = Value.Check(DataTableSchema, validProps);
    expect(result).toBe(true);
  });

  it('filters prop rejects non-string values', () => {
    const invalidProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      filters: { name: 123 },
    };
    const result = Value.Check(DataTableSchema, invalidProps);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F40-AC4: Selection mode emits selection-change
// ---------------------------------------------------------------------------

describe('F40-AC4: Selection mode', () => {
  it('DataTable has selection-change event defined', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    expect(selEvent).toBeDefined();
  });

  it('selection-change payload schema has rowId and rowIds', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    expect(selEvent?.payloadSchema).toBeDefined();
    const schema = selEvent!.payloadSchema!;
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props)).toContain('rowId');
    expect(Object.keys(props)).toContain('rowIds');
  });

  it('selection-change payload validates single selection', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    const payload = { rowId: '1' };
    const result = Value.Check(selEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('selection-change payload validates multiple selection', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    const payload = { rowIds: ['1', '2', '3'] };
    const result = Value.Check(selEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('selection-change payload validates both rowId and rowIds', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    const payload = { rowId: '1', rowIds: ['1', '2'] };
    const result = Value.Check(selEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('selection-change payload rejects extra fields (additionalProperties: false)', () => {
    const selEvent = DataTableEvents.find((e) => e.name === 'selection-change');
    const payload = { rowId: '1', extra: true };
    const result = Value.Check(selEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('selection prop accepts single mode', () => {
    const validProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      selection: { mode: 'single' as const },
    };
    const result = Value.Check(DataTableSchema, validProps);
    expect(result).toBe(true);
  });

  it('selection prop accepts multiple mode with dataKey', () => {
    const validProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      selection: { mode: 'multiple' as const, dataKey: 'id' },
    };
    const result = Value.Check(DataTableSchema, validProps);
    expect(result).toBe(true);
  });

  it('selection prop rejects invalid mode', () => {
    const invalidProps = {
      rows: [{ id: '1' }],
      columns: [{ key: 'name', label: 'Name' }],
      selection: { mode: 'invalid' },
    };
    const result = Value.Check(DataTableSchema, invalidProps);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Page-change event
// ---------------------------------------------------------------------------

describe('page-change event', () => {
  it('DataTable has page-change event defined', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    expect(pageEvent).toBeDefined();
  });

  it('page-change payload schema has page and pageSize', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    expect(pageEvent?.payloadSchema).toBeDefined();
    const schema = pageEvent!.payloadSchema!;
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props)).toContain('page');
    expect(Object.keys(props)).toContain('pageSize');
  });

  it('page-change payload validates correct payload', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    const payload = { page: 2, pageSize: 10 };
    const result = Value.Check(pageEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('page-change payload rejects negative page', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    const payload = { page: -1, pageSize: 10 };
    const result = Value.Check(pageEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('page-change payload rejects zero pageSize', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    const payload = { page: 0, pageSize: 0 };
    const result = Value.Check(pageEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('page-change payload rejects extra fields', () => {
    const pageEvent = DataTableEvents.find((e) => e.name === 'page-change');
    const payload = { page: 0, pageSize: 10, extra: true };
    const result = Value.Check(pageEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Row-click event
// ---------------------------------------------------------------------------

describe('row-click event', () => {
  it('DataTable has row-click event defined', () => {
    const rowClickEvent = DataTableEvents.find((e) => e.name === 'row-click');
    expect(rowClickEvent).toBeDefined();
  });

  it('row-click payload schema has rowId', () => {
    const rowClickEvent = DataTableEvents.find((e) => e.name === 'row-click');
    expect(rowClickEvent?.payloadSchema).toBeDefined();
    const schema = rowClickEvent!.payloadSchema!;
    const props = (schema as { properties?: Record<string, unknown> }).properties ?? {};
    expect(Object.keys(props)).toContain('rowId');
  });

  it('row-click payload validates correct payload', () => {
    const rowClickEvent = DataTableEvents.find((e) => e.name === 'row-click');
    const payload = { rowId: '1' };
    const result = Value.Check(rowClickEvent!.payloadSchema!, payload);
    expect(result).toBe(true);
  });

  it('row-click payload rejects missing rowId', () => {
    const rowClickEvent = DataTableEvents.find((e) => e.name === 'row-click');
    const payload = {} as unknown as Record<string, unknown>;
    const result = Value.Check(rowClickEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });

  it('row-click payload rejects extra fields', () => {
    const rowClickEvent = DataTableEvents.find((e) => e.name === 'row-click');
    const payload = { rowId: '1', extra: true };
    const result = Value.Check(rowClickEvent!.payloadSchema!, payload);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component entry metadata
// ---------------------------------------------------------------------------

describe('DataTable component entry', () => {
  it('has correct name', () => {
    expect(DataTable.name).toBe('data-table');
  });

  it('has correct version', () => {
    expect(DataTable.version).toBe('1.0.0');
  });

  it('has correct URI', () => {
    expect(DataTable.uri).toBe('ui://components/data-table@1.0.0');
  });

  it('has framework identifier', () => {
    expect(DataTable.framework).toBe('primevue@4.2.0');
  });

  it('has tags for search', () => {
    expect(DataTable.tags).toContain('table');
    expect(DataTable.tags).toContain('data');
  });

  it('has 7 tags', () => {
    expect(DataTable.tags.length).toBe(7);
  });

  it('has 5 event definitions', () => {
    expect(DataTable.events.length).toBe(5);
  });

  it('has 3 example configurations', () => {
    expect(DataTable.examples.length).toBe(3);
  });

  it('examples pass schema validation', () => {
    for (const example of DataTable.examples) {
      const result = Value.Check(DataTableSchema, example);
      expect(result).toBe(true);
    }
  });

  it('at least one example includes sort', () => {
    const hasSort = DataTable.examples.some(
      (ex) => 'sort' in ex && ex.sort !== undefined,
    );
    expect(hasSort).toBe(true);
  });

  it('at least one example includes selection', () => {
    const hasSelection = DataTable.examples.some(
      (ex) => 'selection' in ex && ex.selection !== undefined,
    );
    expect(hasSelection).toBe(true);
  });

  it('at least one example includes filters', () => {
    const hasFilters = DataTable.examples.some(
      (ex) => 'filters' in ex && ex.filters !== undefined,
    );
    expect(hasFilters).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

describe('Registry export', () => {
  it('has correct id', () => {
    expect(registry.id).toBe('@genicul-primevue/registry');
  });

  it('has correct version', () => {
    expect(registry.version).toBe('0.2.0');
  });

  it('has correct framework', () => {
    expect(registry.framework).toBe('primevue');
  });

  it('has exactly 5 components (DataTable + InputPair + ResultCard + CityPicker + WeatherCard)', () => {
    expect(registry.components.length).toBe(5);
  });

  it('first component is the DataTable', () => {
    expect(registry.components[0]!.name).toBe('data-table');
  });
});

// ---------------------------------------------------------------------------
// Index re-exports smoke test
// ---------------------------------------------------------------------------

describe('Index re-exports', () => {
  it('exports DataTable', async () => {
    const mod = await import('./index.js');
    expect(mod.DataTable).toBeDefined();
    expect(mod.DataTable.name).toBe('data-table');
  });

  it('exports DataTableSchema', async () => {
    const mod = await import('./index.js');
    expect(mod.DataTableSchema).toBeDefined();
  });

  it('exports DataTableEvents', async () => {
    const mod = await import('./index.js');
    expect(mod.DataTableEvents).toBeDefined();
    expect(mod.DataTableEvents.length).toBe(5);
  });

  it('exports registry', async () => {
    const mod = await import('./index.js');
    expect(mod.registry).toBeDefined();
  });
});
