# Task M4-T6 — Vite plugin + component auto-registration

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F30 (Vite plugin + component auto-registration)
> **Priority:** Medium
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement the Vite plugin for GenicUI: auto-discovery of `GenicElement` subclasses, HMR on file save, and `genui-registry.json` emission on build. Enables rapid development of component libraries.

## Task Goals

- Auto-discovery of GenicElement subclasses (F30-AC1)
- HMR on file save (F30-AC2)
- `genui-registry.json` emitted on build (F30-AC3)

## Implementation Plan

### Steps

1. Implement Vite plugin: `viteGenicUI()`
2. Auto-discover `GenicElement` subclasses via AST scan
3. Implement HMR: re-register component on file save
4. Emit `genui-registry.json` on build
5. Write integration test: auto-discovery (F30-AC1)
6. Write integration test: HMR (F30-AC2)
7. Write integration test: registry.json emission (F30-AC3)

## Acceptance Criteria

- Auto-discovery of GenicElement subclasses
- HMR on file save
- `genui-registry.json` emitted on build

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M4-T3 (F21)
- **Blocks:** None directly

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F30]`
- Per-feature: `docs/requirements/specs/features/feature-030-vite-plugin.md`
