# Milestone M1 — Foundations: Core Package

> **Roadmap phase:** Foundations
> **Roadmap week:** W1
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 7-10 days (1 week × single maintainer)
> **Dependencies:** None — this is the foundational milestone with zero prerequisites.

## Objective

Establish the `@genicui/core` package skeleton, schema abstraction, protocol envelope, JSON-Patch engine, and session store — the five building blocks every subsequent milestone depends on. This milestone corresponds to the W1 Foundations phase in [roadmap.md](../../../.vaahagents/requirements/specs/roadmap.md#week-1-monorepo--core-foundations-f1-f2-f3-f4-f5) and satisfies the manifest pipeline_handoff invariant that F1 has zero dependencies.

## Success Criteria

- [ ] All 5 manifest features in this milestone pass `bun test` (16 ACs total)
- [ ] `bun test packages/core` exits green with 100% line coverage on F2/F3/F4/F5
- [ ] Zero `any` types in `src/` (ESLint enforced)
- [ ] ESM resolution works in Node 20+, Bun 1.2+, Deno 1.40+
- [ ] 10K fast-check property tests pass for F4 (JSON-Patch round-trip)

## Tasks

- M1-T1 — @genicui/core package skeleton (maps to manifest F1)
- M1-T2 — GenicSchema<T> abstraction (maps to manifest F2)
- M1-T3 — Protocol envelope + sequence generator (maps to manifest F3)
- M1-T4 — JSON-Patch engine wrapper (maps to manifest F4)
- M1-T5 — SessionStore interface + InMemoryStore (maps to manifest F5)

## Dependencies

- **Blocks:** M2 (Transport), M3 (Tool Surface), M4 (Runtime), M5 (Registry), M7 (Deployment) — all downstream milestones require core
- **Requires:** None

## Manifest Cross-References

- Features: F1, F2, F3, F4, F5
- Quality attributes covered: Maintainability (F1-AC3), Compatibility (F1-AC2), Reliability (F3-AC1), Performance (F4-AC3), Security (F2-AC1)
- Pipeline handoff invariants honoured: F1 zero-dependency foundation; verification ladder step 1 (93/93 ACs have test IDs)
