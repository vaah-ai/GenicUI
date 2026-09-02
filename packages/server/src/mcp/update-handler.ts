/**
 * Update handler — implements update_component (F17) with JSON-Patch primary
 * and merge fallback modes.
 *
 * @module @genicui/server/mcp/update-handler
 * @see {F17} — update_component tool
 */

import type { TSchema } from '@sinclair/typebox';
import { JsonPatchEngine } from '@genicui/core';
import type { JsonPatchOperation } from '@genicui/core';
import type { Operation } from 'fast-json-patch';

import { componentStore } from './component-store.js';
import { GENICUI_ERROR_CODES } from './tool-registry.js';
import { validatePatchOperations } from '../validation/patch-validation.js';
import { validateToolInput } from '../validation/schema-validation.js';
import { findComponents } from './catalog.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The result of a successful component update. */
export interface UpdateResult {
  /** The component identifier. */
  readonly componentId: string;
  /** The channel associated with this component. */
  readonly channel: string;
  /** The type of update that was applied. */
  readonly type: 'STATE_DELTA' | 'STATE_SNAPSHOT';
  /** The patch operations applied (for STATE_DELTA). */
  readonly patch?: JsonPatchOperation[];
  /** The full state snapshot (for STATE_SNAPSHOT). */
  readonly snapshot?: Record<string, unknown>;
}

/** Error result when an update fails. */
export interface UpdateError {
  /** JSON-RPC error code. */
  readonly code: number;
  /** Human-readable error message. */
  readonly message: string;
  /** Field-level details (if applicable). */
  readonly details?: string[];
}

/**
 * A discriminated union representing the update input.
 * Either `patch` (JSON-Patch) or `merge` (shallow merge), never both.
 */
export type UpdateInput =
  | { componentId: string; patch: JsonPatchOperation[] }
  | { componentId: string; merge: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Update Component
// ---------------------------------------------------------------------------

/**
 * Update a mounted component's state.
 *
 * Supports two modes:
 * - **Patch (primary):** Apply JSON-Patch operations to the current props.
 *   On success, emits STATE_DELTA. On failure, falls back to STATE_SNAPSHOT.
 * - **Merge (fallback):** Merge new props into current state, validate,
 *   and emit STATE_SNAPSHOT.
 *
 * Concurrent updates on the same componentId are serialized via
 * ComponentStore's per-componentId locks (F17-AC4).
 *
 * @param input — the update input (patch or merge mode)
 * @returns the update result or error
 *
 * @see {F17-AC1} — valid patches → STATE_DELTA
 * @see {F17-AC2} — patch reject → STATE_SNAPSHOT
 * @see {F17-AC3} — merge mode → STATE_SNAPSHOT
 * @see {F17-AC4} — concurrent updates serialized
 * @see {F17-AC5} — invalid patch path → -32004
 */
export async function updateComponent(
  input: UpdateInput,
): Promise<UpdateResult | { error: UpdateError }> {
  const { componentId } = input;

  // Check that the component exists
  const component = componentStore.get(componentId);
  if (!component) {
    return {
      error: {
        code: GENICUI_ERROR_CODES.component_not_found,
        message: `Component "${componentId}" not found`,
      },
    };
  }

  if ('patch' in input && !('merge' in input)) {
    return handlePatchMode(input.patch, component!);
  }

  if ('merge' in input && !('patch' in input)) {
    return handleMergeMode(input.merge, component!);
  }

  // Both patch and merge provided — invalid (discriminated union)
  return {
    error: {
      code: GENICUI_ERROR_CODES.props_invalid,
      message: 'Either patch or merge must be provided, not both',
    },
  };
}

// ---------------------------------------------------------------------------
// Patch Mode — F17-AC1, F17-AC2, F17-AC4, F17-AC5
// ---------------------------------------------------------------------------

/**
 * Handle patch mode: validate paths, apply JSON-Patch, emit STATE_DELTA.
 * On failure, fall back to STATE_SNAPSHOT.
 *
 * @param patch — the JSON-Patch operations
 * @param component — the current mounted component
 * @returns the update result or error
 */
async function handlePatchMode(
  patch: JsonPatchOperation[],
  component: NonNullable<ReturnType<typeof componentStore.get>>,
): Promise<UpdateResult | { error: UpdateError }> {
  // F17-AC5: Validate all patch paths against current state
  const validation = validatePatchOperations(patch, component.props);
  if (!validation.valid) {
    return {
      error: {
        code: validation.code,
        message: `Invalid patch path: ${validation.invalidPath}`,
        details: [validation.invalidPath ?? ''],
      },
    };
  }

  // F17-AC4: Concurrent updates are serialized by ComponentStore's locks
  // when we call update(). This try-catch handles patch application failures.
  const engine = new JsonPatchEngine();

  try {
    // Apply the patch to the current props
    const newProps = engine.apply(patch as unknown as Operation[], component.props);
    const newPropsRecord = newProps as Record<string, unknown>;

    // Update the component in the store (lock-acquired here)
    await componentStore.update(component.componentId, newPropsRecord);

    // F17-AC1: Valid patches → STATE_DELTA
    return {
      componentId: component.componentId,
      channel: component.channel,
      type: 'STATE_DELTA',
      patch,
    };
  } catch {
    // F17-AC2: Patch application failed → fall back to STATE_SNAPSHOT
    // Return the current state as a snapshot
    return {
      componentId: component.componentId,
      channel: component.channel,
      type: 'STATE_SNAPSHOT',
      snapshot: component.props as Record<string, unknown>,
    };
  }
}

// ---------------------------------------------------------------------------
// Merge Mode — F17-AC3
// ---------------------------------------------------------------------------

/**
 * Handle merge mode: deep merge new props into current state, validate,
 * and emit STATE_SNAPSHOT.
 *
 * @param merge — the props to merge
 * @param component — the current mounted component
 * @returns the update result or error
 */
async function handleMergeMode(
  merge: Record<string, unknown>,
  component: NonNullable<ReturnType<typeof componentStore.get>>,
): Promise<UpdateResult | { error: UpdateError }> {
  // Deep merge the new props into current state
  const mergedProps = deepMerge(component.props as Record<string, unknown>, merge);

  // Resolve the component's catalog entry for schema validation
  const catalogEntry = findComponentCatalogEntry(component.name);
  if (catalogEntry) {
    const validation = validateToolInput(catalogEntry.propsSchema, mergedProps);
    if (!validation.valid) {
      return {
        error: {
          code: GENICUI_ERROR_CODES.props_invalid,
          message: `Invalid props after merge for component "${component.name}"`,
          details: validation.errors,
        },
      };
    }
  }

  // F17-AC4: Update is serialized by ComponentStore's locks
  await componentStore.update(component.componentId, mergedProps);

  // F17-AC3: Merge mode → STATE_SNAPSHOT
  return {
    componentId: component.componentId,
    channel: component.channel,
    type: 'STATE_SNAPSHOT',
    snapshot: mergedProps,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the catalog entry for a given component name.
 */
function findComponentCatalogEntry(name: string):
  | ReturnType<typeof findComponents>['components'][number]['entry']
  | undefined {
  const result = findComponents(name, 1);
  if (result.components.length === 0) {
    return undefined;
  }
  const top = result.components[0]!.entry;
  if (top.name.toLowerCase() === name.toLowerCase()) {
    return top;
  }
  return undefined;
}

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced (not concatenated), nested objects are merged recursively.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Both are plain objects — recurse
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      // Override (arrays, primitives, null)
      result[key] = sourceValue;
    }
  }

  return result;
}
