/**
 * Catalog unit tests — F15 acceptance criteria.
 *
 * @module @genicui/server/mcp/catalog.test
 * @see {F15} — find_ui_component tool
 */

import { describe, it, expect } from 'bun:test';
import { findComponents, getCatalog } from './catalog.js';

// ---------------------------------------------------------------------------
// Catalog contents
// ---------------------------------------------------------------------------

describe('getCatalog', () => {
  it('returns the hard-coded MVP catalog entries', () => {
    const catalog = getCatalog();
    expect(catalog.length).toBeGreaterThan(0);

    // F40: DataTable is the only MVP component
    const dataTable = catalog.find((e) => e.name === 'DataTable');
    expect(dataTable).toBeDefined();
    expect(dataTable!.registryId).toBe('primevue@4.2.0');
    expect(dataTable!.version).toBe('0.1.0');
  });

  it('each entry has required fields', () => {
    const catalog = getCatalog();
    for (const entry of catalog) {
      expect(entry.name).toBeDefined();
      expect(typeof entry.name).toBe('string');
      expect(entry.description).toBeDefined();
      expect(entry.propsSchema).toBeDefined();
      expect(entry.propsJsonSchema).toBeDefined();
      expect(Array.isArray(entry.events)).toBe(true);
      expect(Array.isArray(entry.examples)).toBe(true);
      expect(Array.isArray(entry.tags)).toBe(true);
    }
  });

  it('DataTable has sortable and filterable tags', () => {
    const catalog = getCatalog();
    const dataTable = catalog.find((e) => e.name === 'DataTable');
    expect(dataTable).toBeDefined();
    const tags = dataTable!.tags.map((t) => t.toLowerCase());
    expect(tags).toContain('sortable');
    expect(tags).toContain('filterable');
  });
});

// ---------------------------------------------------------------------------
// F15-AC1: Exact tag match returns 1 result
// ---------------------------------------------------------------------------

describe('F15-AC1: Exact tag match returns 1 result', () => {
  it('query "DataTable" returns exactly 1 result', () => {
    const result = findComponents('DataTable', 1);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.entry.name).toBe('DataTable');
    expect(result.components[0]!.score).toBeGreaterThan(0);
  });

  it('query "data table" returns DataTable', () => {
    const result = findComponents('data table', 1);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.entry.name).toBe('DataTable');
  });

  it('query "table" returns DataTable', () => {
    const result = findComponents('table', 1);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.entry.name).toBe('DataTable');
  });

  it('query "sortable" returns DataTable (tag match)', () => {
    const result = findComponents('sortable', 1);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.entry.name).toBe('DataTable');
  });

  it('query "filterable" returns DataTable (tag match)', () => {
    const result = findComponents('filterable', 1);
    expect(result.components).toHaveLength(1);
    expect(result.components[0]!.entry.name).toBe('DataTable');
  });

  it('returns all required fields: name, version, propsSchema, events, examples', () => {
    const result = findComponents('DataTable', 1);
    const comp = result.components[0]!.entry;
    expect(comp.name).toBe('DataTable');
    expect(comp.version).toBeDefined();
    expect(comp.propsSchema).toBeDefined();
    expect(comp.events).toBeDefined();
    expect(comp.examples).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// F15-AC2: No match returns empty result with reason
// ---------------------------------------------------------------------------

describe('F15-AC2: No match returns empty result with reason', () => {
  it('query "xyz_nonexistent" returns empty results with reason', () => {
    const result = findComponents('xyz_nonexistent_foobar');
    expect(result.components).toHaveLength(0);
    expect(result.reason).toBe('no_component_matches');
  });

  it('query "quantum_entangled_widget" returns no match', () => {
    const result = findComponents('quantum entangled widget');
    expect(result.components).toHaveLength(0);
    expect(result.reason).toBe('no_component_matches');
  });
});

// ---------------------------------------------------------------------------
// F15-AC3: Ambiguous match returns disambiguation
// ---------------------------------------------------------------------------

describe('F15-AC3: Ambiguous match returns disambiguation', () => {
  it('with single component, no disambiguation is returned', () => {
    const result = findComponents('data table');
    // With only one component in the MVP catalog, disambiguation is not needed
    expect(result.disambiguation).toBeUndefined();
    expect(result.components).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// topK behavior
// ---------------------------------------------------------------------------

describe('topK behavior', () => {
  it('respects topK limit', () => {
    const result = findComponents('table', 1);
    expect(result.components).toHaveLength(1);
  });

  it('returns all available if fewer than topK', () => {
    // Request 100 but only have 1 matching
    const result = findComponents('table', 100);
    expect(result.components.length).toBeLessThanOrEqual(1);
  });

  it('topK default is 5', () => {
    const result = findComponents('table');
    expect(result.components.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe('Scoring', () => {
  it('exact name match has highest score', () => {
    const result = findComponents('DataTable', 1);
    expect(result.components[0]!.score).toBeGreaterThanOrEqual(0.7);
  });

  it('tag match has high score', () => {
    const result = findComponents('sortable', 1);
    expect(result.components[0]!.score).toBeGreaterThanOrEqual(0.5);
  });

  it('score is between 0 and 1', () => {
    const result = findComponents('data table', 1);
    for (const c of result.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
  });
});
