/**
 * URI grammar tests — F28 acceptance criteria.
 *
 * @module @genicui/server/mcp/uri-validator.test
 * @see {F28} — ui:// URI grammar (catalog + instance)
 */

import { describe, it, expect } from 'bun:test';
import {
  CATALOG_URI_PATTERN,
  INSTANCE_URI_PATTERN,
  isCatalogUri,
  isInstanceUri,
  isValidUri,
  parseCatalogUri,
  parseInstanceUri,
} from './uri-validator.js';

// ---------------------------------------------------------------------------
// F28-AC1: Catalog URI matches pattern
// ---------------------------------------------------------------------------

describe('F28-AC1: Catalog URI pattern', () => {
  // Valid catalog URIs
  const validCatalogUris = [
    'ui://components/data-table@1.0.0',
    'ui://components/select@0.5.0',
    'ui://components/a@1.0.0',
    'ui://components/data-table@999.999.999',
    'ui://components/abc@0.0.0',
    'ui://components/a1b2c3@1.2.3',
    'ui://components/component-name@1.0.0',
    'ui://components/long-component-name@2.1.0',
    'ui://components/a-z@0.0.1',
    'ui://components/test-component@10.20.30',
    'ui://components/very-long-name-with-many-hyphens@1.0.0',
    'ui://components/z@9.9.9',
  ];

  for (const uri of validCatalogUris) {
    it(`accepts "${uri}"`, () => {
      expect(isCatalogUri(uri)).toBeTrue();
      expect(CATALOG_URI_PATTERN.test(uri)).toBeTrue();
    });
  }

  // Invalid catalog URIs
  const invalidCatalogUris = [
    // Wrong scheme
    'http://components/data-table@1.0.0',
    'file://components/data-table@1.0.0',
    // Wrong path segment
    'ui://component/data-table@1.0.0',
    'ui://componentsx/data-table@1.0.0',
    'ui://components /data-table@1.0.0',
    // Missing version
    'ui://components/data-table',
    'ui://components/data-table@',
    // Bad version format
    'ui://components/data-table@1.0',
    'ui://components/data-table@1',
    'ui://components/data-table@1.0.0.0',
    'ui://components/data-table@1.0.beta',
    'ui://components/data-table@v1.0.0',
    'ui://components/data-table@latest',
    // Bad component name — uppercase
    'ui://components/DataTable@1.0.0',
    'ui://components/Data@1.0.0',
    // Bad component name — starts with digit
    'ui://components/1table@1.0.0',
    // Bad component name — starts with hyphen
    'ui://components/-table@1.0.0',
    // Empty name
    'ui://components/@1.0.0',
    // Spaces
    'ui://components/data table@1.0.0',
    // Extra trailing slash
    'ui://components/data-table@1.0.0/',
    // Extra path
    'ui://components/data-table@1.0.0/extra',
    // Wrong protocol prefix
    'ui:components/data-table@1.0.0',
    'ui:///components/data-table@1.0.0',
    // Underscores not allowed in name
    'ui://components/data_table@1.0.0',
    'ui://components/data.table@1.0.0',
  ];

  for (const uri of invalidCatalogUris) {
    it(`rejects "${uri}"`, () => {
      expect(isCatalogUri(uri)).toBeFalse();
      expect(CATALOG_URI_PATTERN.test(uri)).toBeFalse();
    });
  }

  // Parse valid catalog URIs
  describe('parseCatalogUri', () => {
    it('parses simple catalog URI', () => {
      const result = parseCatalogUri('ui://components/data-table@1.0.0');
      expect(result).toEqual({ name: 'data-table', version: '1.0.0' });
    });

    it('parses single-char component name', () => {
      const result = parseCatalogUri('ui://components/a@0.0.1');
      expect(result).toEqual({ name: 'a', version: '0.0.1' });
    });

    it('parses high version numbers', () => {
      const result = parseCatalogUri('ui://components/abc@999.999.999');
      expect(result).toEqual({ name: 'abc', version: '999.999.999' });
    });

    it('returns null for invalid URI', () => {
      expect(parseCatalogUri('not-a-uri')).toBeNull();
      expect(parseCatalogUri('ui://instances/abc123')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// F28-AC2: Instance URI matches pattern
// ---------------------------------------------------------------------------

describe('F28-AC2: Instance URI pattern', () => {
  // Valid instance URIs
  const validInstanceUris = [
    'ui://instances/dt-7f3a9b2c',
    'ui://instances/a',
    'ui://instances/123',
    'ui://instances/abc-def-ghi',
    'ui://instances/component-001',
    'ui://instances/abcdefghijklmnopqrstuvwxyz012345',
    'ui://instances/a-b-c-d-e-f',
    'ui://instances/999',
    'ui://instances/component-123-abc',
  ];

  for (const uri of validInstanceUris) {
    it(`accepts "${uri}"`, () => {
      expect(isInstanceUri(uri)).toBeTrue();
      expect(INSTANCE_URI_PATTERN.test(uri)).toBeTrue();
    });
  }

  // Invalid instance URIs
  const invalidInstanceUris = [
    // Wrong path segment
    'ui://instance/dt-7f3a9b2c',
    'ui://instancesx/dt-7f3a9b2c',
    // Uppercase
    'ui://instances/DT-7f3a9b2c',
    'ui://instances/DataTable',
    // Too long (33+ chars)
    'ui://instances/abcdefghijklmnopqrstuvwxyz0123456',
    // Empty component ID
    'ui://instances/',
    'ui://instances/',
    // Spaces
    'ui://instances/dt 7f3a9b2c',
    // Special characters
    'ui://instances/dt_7f3a9b2c',
    'ui://instances/dt.7f3a9b2c',
    'ui://instances/dt/7f3a9b2c',
    'ui://instances/dt?7f3a9b2c',
    // Wrong scheme
    'http://instances/dt-7f3a9b2c',
    // Trailing slash
    'ui://instances/dt-7f3a9b2c/',
    // Extra path
    'ui://instances/dt-7f3a9b2c/extra',
    // Catalog URI (should not match instance pattern)
    'ui://components/data-table@1.0.0',
  ];

  for (const uri of invalidInstanceUris) {
    it(`rejects "${uri}"`, () => {
      expect(isInstanceUri(uri)).toBeFalse();
      expect(INSTANCE_URI_PATTERN.test(uri)).toBeFalse();
    });
  }

  // Parse valid instance URIs
  describe('parseInstanceUri', () => {
    it('parses simple instance URI', () => {
      const result = parseInstanceUri('ui://instances/dt-7f3a9b2c');
      expect(result).toEqual({ componentId: 'dt-7f3a9b2c' });
    });

    it('parses single-char ID', () => {
      const result = parseInstanceUri('ui://instances/a');
      expect(result).toEqual({ componentId: 'a' });
    });

    it('returns null for invalid URI', () => {
      expect(parseInstanceUri('not-a-uri')).toBeNull();
      expect(parseInstanceUri('ui://components/data-table@1.0.0')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// isValidUri helper
// ---------------------------------------------------------------------------

describe('isValidUri', () => {
  it('returns true for catalog URIs', () => {
    expect(isValidUri('ui://components/data-table@1.0.0')).toBeTrue();
  });

  it('returns true for instance URIs', () => {
    expect(isValidUri('ui://instances/dt-7f3a9b2c')).toBeTrue();
  });

  it('returns false for non-UI URIs', () => {
    expect(isValidUri('http://example.com')).toBeFalse();
    expect(isValidUri('not-a-uri')).toBeFalse();
    expect(isValidUri('DataTable')).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// F28-AC3: Catalog URI rejected for render_component (integration)
// ---------------------------------------------------------------------------

describe('F28-AC3: Catalog URI rejected for render_component', () => {
  it('isCatalogUri returns true for catalog URIs (prerequisite for AC3)', () => {
    // The render_component handler uses isCatalogUri to reject catalog URIs.
    // This test verifies the guard condition.
    expect(isCatalogUri('ui://components/data-table@1.0.0')).toBeTrue();
    expect(isCatalogUri('ui://components/select@0.5.0')).toBeTrue();
  });

  it('isCatalogUri returns false for instance URIs', () => {
    // Instance URIs should NOT be rejected by the catalog URI check.
    expect(isCatalogUri('ui://instances/dt-7f3a9b2c')).toBeFalse();
  });

  it('isCatalogUri returns false for plain component names', () => {
    // Plain names like "DataTable" should not be rejected.
    expect(isCatalogUri('DataTable')).toBeFalse();
    expect(isCatalogUri('Counter')).toBeFalse();
  });
});
