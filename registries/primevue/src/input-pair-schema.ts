/**
 * PrimeVue InputPair — TypeBox schema.
 *
 * Two numeric inputs plus a Submit button. When the user clicks Submit,
 * the chat bridge fires a `submit` component event with the two values.
 *
 * Props:
 *   - input1: First number input (default 0)
 *   - input2: Second number input (default 0)
 *   - label1: Optional label for the first input
 *   - label2: Optional label for the second input
 *   - submitLabel: Optional label for the Submit button
 *   - resultComponentId: Optional hint — the id of the component the agent
 *     previously mounted as the "answer" surface. Used by the agent to
 *     scope follow-up renders to the same Result card if needed.
 *
 * @module @genicul-primevue/registry/input-pair-schema
 */

import { Type } from '@sinclair/typebox';

/**
 * InputPair props schema.
 *
 * Exactly 6 top-level properties. `additionalProperties: false` ensures
 * the server rejects any extra props at the trust boundary.
 */
export const InputPairSchema = Type.Object({
  /** First number input. Default: 0. */
  input1: Type.Optional(Type.Number()),

  /** Second number input. Default: 0. */
  input2: Type.Optional(Type.Number()),

  /** Optional label for the first input. */
  label1: Type.Optional(Type.String()),

  /** Optional label for the second input. */
  label2: Type.Optional(Type.String()),

  /** Optional label for the Submit button. */
  submitLabel: Type.Optional(Type.String()),

  /** Optional componentId of a previously rendered Result card. */
  resultComponentId: Type.Optional(Type.String()),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Prop count assertion
// ---------------------------------------------------------------------------

/**
 * Assert that the schema defines exactly 6 properties.
 * Throws at module-load time if the count changes.
 */
const propCount = Object.keys(
  (InputPairSchema as { properties?: Record<string, unknown> }).properties ?? {},
).length;

if (propCount !== 6) {
  throw new Error(
    `InputPairSchema must have exactly 6 props, found ${propCount}`,
  );
}
