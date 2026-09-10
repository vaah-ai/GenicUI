/**
 * PrimeVue ResultCard — TypeBox schema.
 *
 * Display-only card that surfaces a computed value. Used as the answer
 * component in the calculator test scenario: after InputPair.submit fires,
 * the agent renders a ResultCard with the sum.
 *
 * Props:
 *   - input1: First operand (echoed back so the user can see what was summed)
 *   - input2: Second operand
 *   - sum: Computed result
 *   - operation: Label of the operation performed (default 'add')
 *   - title: Optional card title (default 'Result')
 *
 * @module @genicul-primevue/registry/result-card-schema
 */

import { Type } from '@sinclair/typebox';

/**
 * ResultCard props schema.
 *
 * Exactly 5 top-level properties. `additionalProperties: false` ensures
 * the server rejects any extra props at the trust boundary.
 */
export const ResultCardSchema = Type.Object({
  /** First operand. */
  input1: Type.Optional(Type.Number()),

  /** Second operand. */
  input2: Type.Optional(Type.Number()),

  /** Computed result. */
  sum: Type.Number(),

  /** Operation label. Default: 'add'. */
  operation: Type.Optional(
    Type.Union([
      Type.Literal('add'),
      Type.Literal('subtract'),
      Type.Literal('multiply'),
      Type.Literal('divide'),
    ]),
  ),

  /** Card title. Default: 'Result'. */
  title: Type.Optional(Type.String()),
}, { additionalProperties: false });

// ---------------------------------------------------------------------------
// Prop count assertion
// ---------------------------------------------------------------------------

const propCount = Object.keys(
  (ResultCardSchema as { properties?: Record<string, unknown> }).properties ?? {},
).length;

if (propCount !== 5) {
  throw new Error(
    `ResultCardSchema must have exactly 5 props, found ${propCount}`,
  );
}
