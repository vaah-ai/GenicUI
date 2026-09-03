# Task M4-T4 — GenicElement Web Component base class

> **Milestone:** M4 (Runtime: Events, Web Components, Runtime Engine)
> **Manifest feature:** F21 (Web Component base class)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 3-5 days

## Description

Implement `GenicElement` — the Web Component base class with closed Shadow DOM, JSON-Patch re-rendering, `composed: true` event forwarding, and lifecycle cleanup. This is the bridge between the framework-agnostic core and browser-rendered UI.

## Task Goals

- Closed Shadow DOM via `attachShadow({mode:'closed'})` (F21-AC1)
- JSON-Patch re-renders shadow DOM (F21-AC2)
- `composed: true` event bubbles to runtime (F21-AC3)
- `disconnectedCallback` → channel cleanup (F21-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Effort = L (3-5 days) — circular dependency with F29 (runtime engine)
- F21 depends on F4 (JSON-Patch) and F29 (runtime). Build F21 with stub runtime, then wire F29.
- Property test: fast-check 10K error code validation (testing-strategy.md)

### Steps

1. Implement `GenicElement` extending `HTMLElement` with closed Shadow DOM
2. Implement `observedAttributes`: `['props-json', 'component-id']`
3. Implement `attributeChangedCallback`: apply JSON-Patch
4. Implement `connectedCallback`: subscribe WS, emit mounted
5. Implement `disconnectedCallback`: unsubscribe, cleanup
6. Implement event forwarding: `composed: true, bubbles: true`
7. Write unit test: closed Shadow DOM (F21-AC1)
8. Write unit test: JSON-Patch re-render (F21-AC2)
9. Write integration test: composed:true event forwarding (F21-AC3)
10. Write integration test: disconnectedCallback cleanup (F21-AC4)
11. Write property test: fast-check 10K error codes (testing-strategy.md)

## Acceptance Criteria

- Closed Shadow DOM via `attachShadow({mode:'closed'})`
- JSON-Patch re-renders shadow DOM
- `composed: true` event bubbles to runtime
- `disconnectedCallback` → channel cleanup

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 70% client
- [ ] Property-based test passing (fast-check 10K runs)

## Dependencies

- **Requires:** M1-T4 (F4), M4-T5 (F29) — circular dep; build with stub first
- **Blocks:** M4-T6 (F30 — Vite plugin)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F21]`
- Per-feature: `docs/requirements/specs/features/feature-021-web-component-base.md`
- Component system: `docs/requirements/idea/consolidated-requirements.md` §F
