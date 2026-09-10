# Milestone M5 — Registry: Component Registry + PrimeVue Adapter

> **Roadmap phase:** Registry
> **Roadmap week:** W7
> **Priority:** Critical
> **Status:** ✅ Complete
> **Estimated Effort:** 10-14 days (2 weeks × single maintainer)
> **Dependencies:** M1 (F2 — schema), M3 (F13 — MCP server) — tool surface + schema needed

## Objective

Build the component registry system: manifest loader with `additionalProperties: false` enforcement, trust tier system (project/user/remote), and the PrimeVue DataTable registry adapter with PassThrough API. This enables the first component library integration — the MVP's sole registry target. Corresponds to W7 in [roadmap.md](../../../.vaahagents/requirements/specs/roadmap.md#week-7-proxyvue-registry-f37-f38-f40).

## Success Criteria

- [x] Registry loads from `registry.json` with schema validation (F37-AC1)
- [x] `additionalProperties: true` rejected at load (F37-AC2)
- [x] SIGHUP hot reload preserves connections (F37-AC3)
- [x] Trust tier lookup: project → user → remote (F38-AC3)
- [x] PrimeVue DataTable schema enforces exactly 8 props (F40-AC1)
- [x] Conformance suite green for PrimeVue registry
- [ ] Playground demo app runs with LLM config, registry selector, and suggestive prompts (F41)
- [ ] Agent bridge connects any LLM to GenicUI MCP tools (F42)
- [ ] Suggestive prompts wire end-to-end: click prompt → component renders (F43)

## Tasks

- M5-T1 — Component registry + manifest loader (maps to manifest F37)
- M5-T2 — Registry trust tiers (project / user / remote) (maps to manifest F38)
- M5-T3 — PrimeVue DataTable registry adapter (maps to manifest F40)
- M5-T4 — Playground app skeleton (Nuxt 4 + PrimeVue + WebSocket) (maps to manifest F41)
- M5-T5 — Agent bridge package (platform-agnostic LLM integration) (maps to manifest F42)
- M5-T6 — Suggestive prompts + registry selector (maps to manifest F43)

## Dependencies

- **Blocks:** M4 (F21 — runtime engine uses registry), M7 (Deployment)
- **Requires:** M1-T2 (F2 — GenicSchema), M3-T1 (F13 — MCP server)

## Manifest Cross-References

- Features: F37, F38, F40, F41, F42, F43
- Quality attributes covered: Security (F38), Maintainability (F37), Compatibility (F40)
- Pipeline handoff invariants honoured: PrimeVue registry day 1 (§L6)
