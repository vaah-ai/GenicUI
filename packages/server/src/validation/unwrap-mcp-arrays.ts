/**
 * MCP-array sanitizer — normalizes inbound props before schema validation.
 *
 * Some MCP clients (notably Claude Code) encode array-valued properties
 * as `{ item: [...] }` instead of a bare JSON array. Component schemas
 * like `DataTable.rows` expect a flat array, so a `render_component`
 * call whose client used that wrapping style would otherwise fail with
 * `props_invalid (-32003)` even though the data is structurally fine.
 *
 * This module unwraps the `{ item: [...] }` envelope one level deep and
 * also coerces numeric strings (e.g. `pageSize: "10"`) back to numbers
 * when the value parses as a finite number. Both transforms are
 * intentionally conservative:
 *
 *  - We only unwrap when the shape is unambiguously the MCP-array
 *    envelope: a single-key object whose sole key is `item` and whose
 *    value is an array. Anything else falls through untouched so the
 *    schema validator can still reject genuinely malformed input.
 *  - We only coerce strings whose trimmed content is a finite number
 *    ≤ 16 characters. Version-like strings and long prose are passed
 *    through verbatim.
 *
 * Originally added for the chat-bridge (F43) — extracted here so the
 * direct `render_component` MCP tool can apply the same normalization
 * before the catalog schema validator runs.
 *
 * @module @genicui/server/validation/unwrap-mcp-arrays
 * @see {F43} — MCP Permissions + Prop Shape
 */

const MAX_NUMERIC_STRING_LEN = 16;

/**
 * Recursively normalize a value: unwrap `{ item: [...] }` arrays,
 * coerce numeric strings to numbers, recurse into nested objects.
 *
 * Returns a new value — the input is not mutated.
 */
export function unwrapMcpArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => unwrapMcpArrays(item));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    // MCP-wrapped array: { item: [...] } → unwrap to the inner array.
    if (keys.length === 1 && keys[0] === 'item' && Array.isArray(obj['item'])) {
      return (obj['item'] as unknown[]).map((item) => unwrapMcpArrays(item));
    }
    // Nested object: recurse into each value.
    const nested: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      nested[k] = unwrapMcpArrays(v);
    }
    return nested;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_NUMERIC_STRING_LEN) {
      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        return asNumber;
      }
    }
    return value;
  }
  return value;
}

/**
 * Normalize a props record before schema validation. Returns a new
 * object — the input is not mutated.
 */
export function unwrapMcpArrayProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = unwrapMcpArrays(v);
  }
  return out;
}
