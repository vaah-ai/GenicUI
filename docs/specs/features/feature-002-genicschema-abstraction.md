---
feature_id: F2
title: "GenicSchema<T> abstraction"
phase: Foundations
priority: Critical
effort: S
dependencies: [F1]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F2 — `GenicSchema<T>` abstraction

Wrapper that normalizes TypeBox/Zod to JSON Schema Draft 2020-12 with `additionalProperties: false`, deprecated field metadata, and Standard Schema interop.

## Inputs / Outputs

**Input:**
```ts
import { Type } from '@sinclair/typebox';
import { genicSchema } from '@genicui/core';

const T = Type.Object({
  rows: Type.Array(Type.Object({ id: Type.String(), name: Type.String() })),
  pageSize: Type.Integer({ minimum: 1, maximum: 100, default: 10 }),
});
const schema = genicSchema(T, { name: 'DataTableProps' });
```

**Output:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "rows": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } }, "required": ["id", "name"], "additionalProperties": false } },
    "pageSize": { "type": "integer", "minimum": 1, "maximum": 100, "default": 10 }
  },
  "required": ["rows"],
  "additionalProperties": false,
  "x-genicui-name": "DataTableProps",
  "x-genicui-version": "0.1.0"
}
```

## Acceptance Criteria (Gherkin)

### F2-AC1: TypeBox → JSON Schema 2020-12
- **Given** a TypeBox schema
- **When** `genicSchema()` is called
- **Then** JSON Schema Draft 2020-12 is emitted with `additionalProperties: false`

### F2-AC2: Zod interop via Standard Schema
- **Given** a Zod schema
- **When** passed to `genicSchema()`
- **Then** it compiles equivalently via Standard Schema interop

### F2-AC3: Deprecated fields
- **Given** a schema with `.deprecated(...)` on a field
- **When** emitted as JSON Schema
- **Then** the field has `deprecated: true`

## Test Plan

| AC | Test |
|---|---|
| F2-AC1 | `tests/unit/core/schema.test.ts:F2-AC1` snapshot test against known TypeBox object |
| F2-AC2 | `tests/unit/core/schema.test.ts:F2-AC2` cross-library test (TypeBox + Zod produce equivalent JSON Schema) |
| F2-AC3 | `tests/unit/core/schema.test.ts:F2-AC3` deprecated field round-trip |

## Cross-References

- Locked by: [consolidated-requirements.md §L9 Schema system](../../idea/consolidated-requirements.md#b-locked-technical-decisions)
- Used by: F14 (trust boundary validation), F37 (registry), F40 (PrimeVue registry)
