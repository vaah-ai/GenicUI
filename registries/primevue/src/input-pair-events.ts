/**
 * PrimeVue InputPair — event definitions.
 *
 * Declares the events this component can emit, each with a TypeBox
 * payload schema for trust-boundary validation.
 *
 * - submit: user clicked Submit (carries both inputs)
 *
 * @module @genicul-primevue/registry/input-pair-events
 */

import { Type } from '@sinclair/typebox';
import type { TSchema } from '@sinclair/typebox';

/** A component event definition with optional payload schema. */
interface ComponentEvent {
  readonly name: string;
  readonly payloadSchema?: TSchema;
}

// ---------------------------------------------------------------------------
// Submit event payload
// ---------------------------------------------------------------------------

const SubmitPayload = Type.Object({
  input1: Type.Number(),
  input2: Type.Number(),
}, { additionalProperties: false });

/**
 * InputPair events.
 *
 * - submit: user clicked Submit; payload is both numeric inputs
 */
export const InputPairEvents: readonly ComponentEvent[] = [
  {
    name: 'submit',
    payloadSchema: SubmitPayload,
  },
];
