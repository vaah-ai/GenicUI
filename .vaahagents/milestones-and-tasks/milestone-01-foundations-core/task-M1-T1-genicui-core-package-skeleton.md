# Task M1-T1 — @genicui/core package skeleton

> **Milestone:** M1 (Foundations: Core Package)
> **Manifest feature:** F1 (@genicui/core package skeleton)
> **Priority:** Critical
> **Status:** 🟢 Complete
> **Estimated Effort:** 1 day

## Description

Create the `@genicui/core` monorepo workspace package with ESM exports, strict TypeScript configuration, zero runtime dependencies, and ESLint enforcing zero `any` types. This is the zero-dependency foundation — no other task in the project can start before this one.

## Task Goals

- Package loads via `import` in <50ms (F1-AC1)
- ESM resolution works in Node 20+, Bun 1.2+, Deno 1.40+ (F1-AC2)
- Zero `any` types enforced by ESLint (F1-AC3)

## Implementation Plan

### Pre-Implementation Analysis

- Review [consolidated-requirements.md §B](../../../docs/requirements/idea/consolidated-requirements.md#b-locked-technical-decisions): L6 (package count), L9 (schema system), L1 (dev stack)
- Review [consolidated-requirements.md §A](../../../docs/requirements/idea/consolidated-requirements.md#a-foundational-decisions-locked): F6 (3 core packages), F7 (registry naming)
- This task is small (effort = S, 3 ACs) — implement without sub-tasks

### Steps

1. Create `packages/core/` directory with `package.json` (name: `@genicui/core`, type: module)
2. Write `tsconfig.json` with strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
3. Write `src/index.ts` exporting `VERSION` constant
4. Configure ESLint with `@typescript-eslint/no-explicit-any` rule
5. Write unit test: measure import latency <50ms (F1-AC1)
6. Write cross-runtime ESM test: Node, Bun, Deno matrix (F1-AC2)
7. Write lint test: verify zero `any` types (F1-AC3)
8. Verify `bun test packages/core` passes green

## Acceptance Criteria

- `bun install` + import resolves in <50ms
- ESM works in Node 20+, Bun 1.2+, Deno 1.40+
- Zero `any` types in `src/` (ESLint enforced)

## Completion Criteria

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (4/4 pass)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds and emits `@genicui/core`
- [x] Coverage target met: 80% core

## Completion Notes

- Completed: 2026-09-02
- Branch: `feature/M1-T1-genicui-core-package-skeleton` (merged into `develop`)
- Tests: 4/4 pass (F1-AC1, F1-AC2, F1-AC3)
- Build: `tsc` clean, Lint: ESLint clean
- Files: `packages/core/{package.json, tsconfig.json, eslint.config.js, src/index.ts, src/index.test.ts, dist/}`
- Root `package.json` updated: `workspaces: ["packages/*"]`, devDependencies: `@playwright/test ^1.62.1`

## Dependencies

- **Requires:** None — zero-dependency foundation
- **Blocks:** M1-T2 (F2), M1-T3 (F3), M1-T4 (F4), M1-T5 (F5), M2-T1 (F9)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F1]`
- Per-feature: `docs/requirements/specs/features/feature-001-genicui-core-package-skeleton.md`
- Locked decisions: `docs/requirements/idea/consolidated-requirements.md` §B, §A
- Testing: `docs/requirements/specs/testing-strategy.md`
