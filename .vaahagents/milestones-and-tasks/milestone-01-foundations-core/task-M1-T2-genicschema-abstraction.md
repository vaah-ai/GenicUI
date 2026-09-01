# Task M1-T2 — GenicSchema<T> abstraction

> **Milestone:** M1 (Foundations: Core Package)
> **Manifest feature:** F2 (GenicSchema<T> abstraction)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 1 day

## Description

Build the `GenicSchema<T>` abstraction layer wrapping TypeBox, producing JSON Schema 2020-12 with `additionalProperties: false` enforced, and providing Standard Schema interop for Zod compatibility. This schema system is the validation backbone for every inbound tool call and registry component.

## Task Goals

- TypeBox → JSON Schema 2020-12 with `additionalProperties: false` (F2-AC1)
- Zod via Standard Schema interop (F2-AC2)
- Deprecated field → `deprecated: true` in JSON Schema (F2-AC3)

## Implementation Plan

### Pre-Implementation Analysis

- This depends on M1-T1 (F1) — the core package must exist first
- TypeBox locked per [consolidated-requirements.md §L9](../../../docs/requirements/idea/consolidated-requirements.md#b-locked-technical-decisions)
- Property-based test required: all TypeBox types round-trip to JSON Schema 2020-12 and back (testing-strategy.md)

### Steps

1. Implement `genicSchema<T>(typeboxDef)` wrapper around TypeBox
2. Generate JSON Schema 2020-12 from TypeBox, always setting `additionalProperties: false`
3. Implement Standard Schema interop layer for Zod compatibility
4. Add `.deprecated(...)` support → JSON Schema `deprecated: true`
5. Write unit test: schema generation with `additionalProperties: false` (F2-AC1)
6. Write unit test: Zod interop via Standard Schema (F2-AC2)
7. Write unit test: deprecated field mapping (F2-AC3)
8. Write property test: fast-check round-trip TypeBox → JSON Schema → TypeBox (testing-strategy.md)

## Acceptance Criteria

- TypeBox → JSON Schema 2020-12 with `additionalProperties: false`
- Zod via Standard Schema interop
- Deprecated field → JSON Schema `deprecated: true`

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green (full suite)
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 80% core

## Completion Summary

**Delivered:** GenicSchema<T> abstraction with TypeBox wrapper, recursive `additionalProperties: false` injection, GenicUI metadata annotations, and deprecated field support.

**Files delivered:**
- `packages/core/src/schema/types.ts` — Type definitions (GenicSchemaOptions, GenicSchemaResult, GenicSchemaBuilder)
- `packages/core/src/schema/genic-schema.ts` — Core implementation (genicSchema, createGenicSchema)
- `packages/core/src/schema/index.ts` — Barrel exports
- `packages/core/src/schema/genic-schema.test.ts` — 17 tests covering all ACs
- `packages/core/src/index.ts` — Updated with schema re-exports
- `packages/core/package.json` — Added @sinclair/typebox + fast-check dependencies

**Test results:** 21 pass (17 F2 + 4 F1 regression), 0 fail. TypeScript strict mode clean.

## Dependencies

- **Requires:** M1-T1 (F1)
- **Blocks:** M3-T2 (F14), M3-T3 (F15), M3-T4 (F16), M5-T1 (F37)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F2]`
- Per-feature: `docs/requirements/specs/features/feature-002-genicschema-abstraction.md`
- Locked decisions: `docs/requirements/idea/consolidated-requirements.md` §B (L9)
