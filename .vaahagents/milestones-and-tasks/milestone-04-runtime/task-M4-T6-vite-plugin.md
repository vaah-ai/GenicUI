# Task M4-T6 — Vite plugin + component auto-registration

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F30 (Vite plugin + component auto-registration)
> **Priority:** Medium
> **Status:** ✅ Completed
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

- [x] All acceptance criteria above pass
- [x] `bun run test` exits green (36 tests, 0 failures)
- [x] `bun run lint` reports zero errors
- [x] `bun run build` succeeds

## Summary

Delivered `@genicui/vite-plugin` package with 5 source files and 36 tests.
- **F30-AC1**: AST scanner auto-discovers GenicElement subclasses, customElements.define tags, static propsSchema/events metadata
- **F30-AC2**: HMR via virtual module `\0genicui:components` with handleHotUpdate hook
- **F30-AC3**: `genui-registry.json` emitted on closeBundle with version, component metadata, and registry entries

## Dependencies

- **Requires:** M4-T4 (F21)
- **Blocks:** None directly

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F30]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-030-vite-plugin.md`
