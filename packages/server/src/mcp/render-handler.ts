/**
 * Render handler — validates component name, props, and mounts components.
 *
 * @module @genicui/server/mcp/render-handler
 * @see {F16} — render_component tool
 */

import type { TSchema } from '@sinclair/typebox';
import { findComponents, type CatalogEntry } from './catalog.js';
import {
  generateComponentId,
  generateChannel,
  componentStore,
  type MountedComponent,
} from './component-store.js';
import { GENICUI_ERROR_CODES } from './tool-registry.js';
import { validateToolInput } from '../validation/schema-validation.js';
import { unwrapMcpArrayProps } from '../validation/unwrap-mcp-arrays.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a successful render. */
export interface RenderResult {
  /** The unique component identifier. */
  readonly componentId: string;
  /** The channel associated with this component. */
  readonly channel: string;
  /** The component name as the caller requested it (e.g. "DataTable"). */
  readonly name: string;
  /** The component's props schema (JSON Schema). */
  readonly schema: Readonly<Record<string, unknown>>;
  /** The events this component can emit. */
  readonly events: readonly string[];
  /** The initial state of the component. */
  readonly initialState: Readonly<Record<string, unknown>>;
  /** Error information (present only on failure). */
  readonly error?: RenderError;
}

/** Error result when render fails. */
export interface RenderError {
  /** JSON-RPC error code. */
  readonly code: number;
  /** Human-readable error message. */
  readonly message: string;
  /** Field-level validation errors (if applicable). */
  readonly details?: string[];
}

// ---------------------------------------------------------------------------
// Component resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a component name to its catalog entry.
 *
 * @param name — component name (e.g., "DataTable")
 * @returns the catalog entry, or undefined if not found
 */
function resolveComponent(name: string): CatalogEntry | undefined {
  const result = findComponents(name, 1);
  if (result.components.length === 0) {
    return undefined;
  }
  // Check if the top result is an exact name match (case-insensitive)
  const top = result.components[0]!.entry;
  if (top.name.toLowerCase() === name.toLowerCase()) {
    return top;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Props validation
// ---------------------------------------------------------------------------

/**
 * Validate props against the component's TypeBox schema.
 *
 * @param props — the props to validate
 * @param propsSchema — the component's TypeBox schema
 * @returns validation result with errors (if any)
 */
function validateProps(
  props: Record<string, unknown>,
  propsSchema: TSchema,
): { valid: boolean; errors: string[] } {
  const result = validateToolInput(propsSchema, props);
  if (result.valid) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: result.errors };
}

// ---------------------------------------------------------------------------
// Render component
// ---------------------------------------------------------------------------

/**
 * Render a component: validate name, validate props, mount, return metadata.
 *
 * @param input — render input with name, props, and optional idempotency key
 * @returns render result with component metadata
 */
export function renderComponent(
  input: {
    readonly name: string;
    readonly props: Record<string, unknown>;
    readonly idempotencyKey?: string;
  },
): RenderResult {
  // F43: Normalize MCP-wrapped arrays ({ item: [...] }) and numeric
  // strings before the catalog schema validator runs. Direct MCP
  // clients (e.g. Claude Code) sometimes emit array-valued props in
  // the single-key envelope form even when the component schema
  // expects a flat array.
  const props = unwrapMcpArrayProps(input.props);

  // Step 1: Resolve component name
  const entry = resolveComponent(input.name);
  if (!entry) {
    return {
      componentId: '',
      channel: '',
      name: input.name,
      schema: {},
      events: [],
      initialState: {},
      error: {
        code: GENICUI_ERROR_CODES.component_not_found,
        message: `Component "${input.name}" not found in catalog`,
      },
    };
  }

  // Step 2: Validate props against catalog schema
  const { valid, errors: validationErrors } = validateProps(
    props,
    entry.propsSchema,
  );
  if (!valid) {
    return {
      componentId: '',
      channel: '',
      name: input.name,
      schema: {},
      events: [],
      initialState: {},
      error: {
        code: GENICUI_ERROR_CODES.props_invalid,
        message: `Invalid props for component "${input.name}"`,
        details: validationErrors,
      },
    };
  }

  // Step 3: Check idempotency
  if (input.idempotencyKey) {
    const existingComponentId = componentStore.getIdempotencyKey(
      input.idempotencyKey,
    );
    if (existingComponentId) {
      const existing = componentStore.get(existingComponentId);
      if (existing) {
        return {
          componentId: existing.componentId,
          channel: existing.channel,
          name: existing.name,
          schema: entry.propsJsonSchema,
          events: entry.events,
          initialState: props,
        };
      }
    }
  }

  // Step 4: Generate componentId and channel
  const componentId = generateComponentId(input.name);
  const channel = generateChannel(componentId);

  // Step 5: Register the component
  const mountedComponent: MountedComponent = {
    componentId,
    name: input.name,
    channel,
    props,
    mountedAt: new Date().toISOString(),
  };

  componentStore.register(mountedComponent, input.idempotencyKey);

  // Step 6: Build response
  return {
    componentId,
    channel,
    name: input.name,
    schema: entry.propsJsonSchema,
    events: entry.events,
    initialState: props,
  };
}
