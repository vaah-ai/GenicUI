/**
 * Render handler unit tests — F16 acceptance criteria.
 *
 * @module @genicui/server/mcp/render-handler.test
 * @see {F16} — render_component tool
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { renderComponent } from './render-handler.js';
import { componentStore } from './component-store.js';
import { GENICUI_ERROR_CODES } from './tool-registry.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('renderComponent', () => {
  beforeEach(() => {
    // Reset component store before each test
    componentStore.clear();
  });

  // -----------------------------------------------------------------------
  // F16-AC1: Happy path — valid props returns componentId, channel, schema,
  // events, initialState
  // -----------------------------------------------------------------------

  describe('F16-AC1: Happy path returns component metadata', () => {
    it('renders DataTable with valid props', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: [
            { id: 'r1', name: 'Alice' },
            { id: 'r2', name: 'Bob' },
          ],
          pageSize: 10,
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.componentId).toBeDefined();
      expect(typeof result.componentId).toBe('string');
      expect(result.componentId.length).toBeGreaterThan(0);
      expect(result.channel).toBe(result.componentId);
      expect(result.schema).toBeDefined();
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.initialState).toEqual({
        rows: [
          { id: 'r1', name: 'Alice' },
          { id: 'r2', name: 'Bob' },
        ],
        pageSize: 10,
      });
    });

    it('componentId follows the correct format', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }] },
      });

      expect(result.error).toBeUndefined();
      // Format: dt-{8-char-hex}-{26-char-base32}
      const parts = result!.componentId.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]!).toBe('da');
      expect(parts[1]!.length).toBe(8);
      expect(parts[2]!.length).toBe(26);
    });

    it('returns correct events for DataTable', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
      });

      expect(result.error).toBeUndefined();
      expect(result.events).toContain('row_selected');
      expect(result.events).toContain('sort_change');
      expect(result.events).toContain('page_change');
      expect(result.events).toContain('filter_change');
    });

    it('returns correct schema for DataTable', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
      });

      expect(result.error).toBeUndefined();
      expect(result.schema.type).toBe('object');
      expect(result.schema.properties).toBeDefined();
      expect((result.schema.properties as Record<string, unknown>).rows).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // F16-AC2: Invalid props — returns props_invalid error
  // -----------------------------------------------------------------------

  describe('F16-AC2: Invalid props returns -32003', () => {
    it('rejects props missing required rows', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {},
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.props_invalid);
      expect(result!.error!.message).toContain('DataTable');
    });

    it('rejects props with invalid rows type', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: 'not-an-array' },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.props_invalid);
    });

    it('rejects props with additionalProperties', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: [{ id: 'r1' }],
          unknownProp: 'value',
        },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.props_invalid);
    });

    it('includes field-level error details', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {},
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.details).toBeDefined();
      expect(result!.error!.details!.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // F43: MCP-array unwrapping — direct render_component accepts the
  // { item: [...] } shape that Claude Code's MCP client emits and the
  // numeric-string scalars it sometimes quotes.
  // -----------------------------------------------------------------------

  describe('F43: MCP-array prop normalization', () => {
    it('unwraps { item: [...] } rows into a flat array', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: { item: [{ id: 'r1', name: 'Alice' }] },
          pageSize: 10,
        },
      });

      expect(result.error).toBeUndefined();
      expect(result.initialState).toEqual({
        rows: [{ id: 'r1', name: 'Alice' }],
        pageSize: 10,
      });
    });

    it('coerces numeric string scalars (pageSize "10" → 10)', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: [{ id: 'r1' }],
          pageSize: '10',
        },
      });

      expect(result.error).toBeUndefined();
      expect((result.initialState as { pageSize: unknown }).pageSize).toBe(10);
    });

    it('leaves long numeric-looking strings alone (e.g. version pins)', () => {
      const longString = '12345678901234567890';
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: [{ id: 'r1', version: longString }],
          pageSize: 10,
        },
      });

      expect(result.error).toBeUndefined();
      const initial = result.initialState as {
        rows: Array<{ id: string; version: string }>;
      };
      expect(initial.rows[0]!.version).toBe(longString);
    });

    it('still rejects genuinely malformed input after unwrapping', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: {
          rows: { item: 'not-an-array' },
        },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.props_invalid);
    });
  });

  // -----------------------------------------------------------------------
  // F16-AC3: Idempotency — same key returns same componentId
  // -----------------------------------------------------------------------

  describe('F16-AC3: Idempotency key reuse', () => {
    it('returns same componentId for same idempotencyKey', () => {
      const idempotencyKey = 'unique-request-id-123';

      const first = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
        idempotencyKey,
      });

      expect(first.error).toBeUndefined();

      const second = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
        idempotencyKey,
      });

      expect(second.error).toBeUndefined();
      expect(second!.componentId).toBe(first!.componentId);
      expect(second!.channel).toBe(first!.channel);
    });

    it('different idempotencyKeys produce different componentIds', () => {
      const first = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
        idempotencyKey: 'key-a',
      });

      const second = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
        idempotencyKey: 'key-b',
      });

      expect(first.error).toBeUndefined();
      expect(second.error).toBeUndefined();
      expect(first!.componentId).not.toBe(second!.componentId);
    });

    it('no idempotencyKey produces different componentIds each time', () => {
      const first = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
      });

      const second = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 10 },
      });

      expect(first.error).toBeUndefined();
      expect(second.error).toBeUndefined();
      expect(first!.componentId).not.toBe(second!.componentId);
    });
  });

  // -----------------------------------------------------------------------
  // F16-AC4: Component not found — returns -32001
  // -----------------------------------------------------------------------

  describe('F16-AC4: Component not found returns -32001', () => {
    it('returns component_not_found for unknown component', () => {
      const result = renderComponent({
        name: 'NonExistentComponent',
        props: { foo: 'bar' },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.component_not_found);
      expect(result!.error!.message).toContain('NonExistentComponent');
    });

    it('returns component_not_found for typo in component name', () => {
      const result = renderComponent({
        name: 'DataTabl',
        props: { rows: [{ id: 'r1' }] },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.component_not_found);
    });

    it('returns component_not_found for empty name', () => {
      const result = renderComponent({
        name: '',
        props: {},
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.component_not_found);
    });
  });

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------

  describe('Edge cases', () => {
    it('renders with minimal valid props', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [] },
      });

      expect(result.error).toBeUndefined();
      expect(result.componentId).toBeDefined();
      expect(result.initialState.rows).toEqual([]);
    });

    it('renders with pageSize in valid range', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 100 },
      });

      expect(result.error).toBeUndefined();
    });

    it('rejects pageSize out of range', () => {
      const result = renderComponent({
        name: 'DataTable',
        props: { rows: [{ id: 'r1' }], pageSize: 0 },
      });

      expect(result.error).toBeDefined();
      expect(result!.error!.code).toBe(GENICUI_ERROR_CODES.props_invalid);
    });
  });
});
