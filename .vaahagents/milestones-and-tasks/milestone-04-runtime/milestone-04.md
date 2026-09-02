# Milestone M4 — Runtime: Events, Web Components, Runtime Engine

> **Roadmap phase:** Runtime
> **Roadmap week:** W4-W8
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 14-21 days (3 weeks × single maintainer)
> **Dependencies:** M3 (Tool Surface) — tool handlers must exist first

## Objective

Build the runtime layer: event capture from Custom Elements, internal event bus with backpressure, `GenicElement` Web Component base class, server-side event application, runtime engine (mount/patch/lifecycle), Vite plugin with auto-registration, and session recovery. This is the bridge between server-side state and browser-rendered components. Corresponds to W4-W8 in [roadmap.md](../../../docs/requirements/specs/roadmap.md#week-5-ag-ui-events--error-codes-f20-f21).

## Success Criteria

- [ ] All 7 manifest features pass `bun test` (25 ACs total)
- [ ] GenicElement renders in closed Shadow DOM
- [ ] JSON-Patch re-renders shadow DOM
- [ ] Runtime engine: STATE_SNAPSHOT → mount within 50ms, STATE_DELTA → patch within 10ms
- [ ] Session recovery: last-10-messages replay works after disconnect

## Tasks

- M4-T1 — Event capture from Custom Elements (maps to manifest F19)
- M4-T2 — Internal event bus (post-emit hook + backpressure) (maps to manifest F20)
- M4-T3 — Server-side event application (maps to manifest F24)
- M4-T4 — GenicElement Web Component base class (maps to manifest F21)
- M4-T5 — Runtime engine (mount, patch, lifecycle) (maps to manifest F29)
- M4-T6 — Vite plugin + component auto-registration (maps to manifest F30)
- M4-T7 — Session recovery (last-10-messages replay) (maps to manifest F33)

## Dependencies

- **Blocks:** M5 (Registry — F37 uses runtime), M6 (Deployment)
- **Requires:** M3-T6 (F18 — subscribe_to_events), M1-T4 (F4 — JSON-Patch), M1-T5 (F5 — session store), M2-T4 (F11 — frames)

## Manifest Cross-References

- Features: F19, F20, F21, F24, F29, F30, F33
- Quality attributes covered: Reliability (F20-AC4, F24-AC1), Performance (F29-AC1, F29-AC2), Usability (F21-AC3), Security (F24-AC3)
- Pipeline handoff invariants honoured: Web Components with closed Shadow DOM (§L3)
