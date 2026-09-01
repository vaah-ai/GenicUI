# Milestone M5 — Registry: Component Registry + PrimeVue Adapter

> **Roadmap phase:** Registry
> **Roadmap week:** W7
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 10-14 days (2 weeks × single maintainer)
> **Dependencies:** M1 (F2 — schema), M3 (F13 — MCP server) — tool surface + schema needed

## Objective

Build the component registry system: manifest loader with `additionalProperties: false` enforcement, trust tier system (project/user/remote), and the PrimeVue DataTable registry adapter with PassThrough API. This enables the first component library integration — the MVP's sole registry target. Corresponds to W7 in [roadmap.md](../../../docs/requirements/specs/roadmap.md#week-7-proxyvue-registry-f37-f38-f40).

## Success Criteria

- [ ] Registry loads from `registry.json` with schema validation (F37-AC1)
- [ ] `additionalProperties: true` rejected at load (F37-AC2)
- [ ] SIGHUP hot reload preserves connections (F37-AC3)
- [ ] Trust tier lookup: project → user → remote (F38-AC3)
- [ ] PrimeVue DataTable schema enforces exactly 8 props (F40-AC1)
- [ ] Conformance suite green for PrimeVue registry

## Tasks

- M5-T1 — Component registry + manifest loader (maps to manifest F37)
- M5-T2 — Registry trust tiers (project / user / remote) (maps to manifest F38)
- M5-T3 — PrimeVue DataTable registry adapter (maps to manifest F40)

## Dependencies

- **Blocks:** M4 (F21 — runtime engine uses registry), M7 (Deployment)
- **Requires:** M1-T2 (F2 — GenicSchema), M3-T1 (F13 — MCP server)

## Manifest Cross-References

- Features: F37, F38, F40
- Quality attributes covered: Security (F38), Maintainability (F37), Compatibility (F40)
- Pipeline handoff invariants honoured: PrimeVue registry day 1 (§L6)
