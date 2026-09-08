# GenicUI Specs — Testable MVP

This directory contains the locked, verified specification set for the **GenicUI Testable MVP** — produced by the Spec-Writer → Spec-Verifier pipeline (Phase 4 → Phase 5 of `1-requirements-gathering.md`).

## Table of Contents

### Core documents

| Doc | Role | Lines | Purpose |
|---|---|---|---|
| [manifest.json](./manifest.json) | Cross-reference manifest | — | Single source-of-truth for feature IDs, ACs, dependencies, sources, quality attributes, and the pipeline handoff prompt for Phase 7 bootstrap |
| [features.md](./features.md) | Feature catalog (long-form) | 1,032 | Master spec covering all 28 features with locked decisions, input/output examples, and Gherkin ACs |
| [architecture.md](./architecture.md) | System architecture | 257 | Request lifecycle (4 phases: Discovery → Render → Update → Interact), package boundaries, transport topology, state management |
| [roadmap.md](./roadmap.md) | Implementation plan | 262 | 12-week plan for single maintainer, 10-point Definition of Done, risk register, post-MVP backlog (30 features deferred) |
| [deployment.md](./deployment.md) | Deployment guide | 329 | Cloudflare Workers + DO (wrangler.toml), Bun self-host, Nitro/Nuxt binding, CI/CD recipes, production checklist |
| [testing-strategy.md](./testing-strategy.md) | Verification plan | 363 | Test pyramid (150 unit / 20 integration / 3-5 e2e), coverage targets (80% core, 90% tool handlers), property tests via fast-check (10K pairs), conformance suite, CI matrix (~7 min budget) |
| [glossary.md](./glossary.md) | Vocabulary | 345 | Authoritative terms, cross-referenced to locked decisions and feature IDs |
| [security.md](./security.md) | Security model | 553 | Threat model (3 trust boundaries), API key auth, prototype pollution defense (stripProtoKeys code), schema enforcement (`additionalProperties: false`), wire protocol security, registry trust, data privacy, operational security |
| [completion-summary.md](./completion-summary.md) | Phase 1-7 handoff | — | Pipeline run report with formal Step 24 handoff block |

### Per-feature specifications

Each MVP feature has its own file at [`features/`](./features/) with YAML frontmatter, Inputs/Outputs, Gherkin ACs, Test Plan, and Cross-References. The 22 files below cover all 29 MVP feature IDs.

| Feature | File |
|---|---|
| F1 | [feature-001-genicui-core-package-skeleton.md](./features/feature-001-genicui-core-package-skeleton.md) |
| F2 | [feature-002-genicschema-abstraction.md](./features/feature-002-genicschema-abstraction.md) |
| F3 | [feature-003-protocol-envelope.md](./features/feature-003-protocol-envelope.md) |
| F4 | [feature-004-json-patch-engine.md](./features/feature-004-json-patch-engine.md) |
| F5 | [feature-005-sessionstore-inmemorystore.md](./features/feature-005-sessionstore-inmemorystore.md) |
| F9 | [feature-009-bun-elysia-server-skeleton.md](./features/feature-009-bun-elysia-server-skeleton.md) |
| F10 | [feature-010-websocket-transport.md](./features/feature-010-websocket-transport.md) |
| F11 | [feature-011-frame-envelope-multiplexing.md](./features/feature-011-frame-envelope-multiplexing.md) |
| F13 | [feature-013-mcp-server-4-tools.md](./features/feature-013-mcp-server-4-tools.md) |
| F14 | [feature-014-trust-boundary-validation.md](./features/feature-014-trust-boundary-validation.md) |
| F15 | [feature-015-find-ui-component-tool.md](./features/feature-015-find-ui-component-tool.md) |
| F16 | [feature-016-render-component-tool.md](./features/feature-016-render-component-tool.md) |
| F17 | [feature-017-update-component-tool.md](./features/feature-017-update-component-tool.md) |
| F18 | [feature-018-subscribe-to-events-tool.md](./features/feature-018-subscribe-to-events-tool.md) |
| F19 | [feature-019-event-capture-forwarding.md](./features/feature-019-event-capture-forwarding.md) |
| F20 | [feature-020-event-system-internal.md](./features/feature-020-event-system-internal.md) |
| F21 | [feature-021-web-component-base.md](./features/feature-021-web-component-base.md) |
| F23 | [feature-023-vue-shim.md](./features/feature-023-vue-shim.md) |
| F24 | [feature-024-server-side-event-application.md](./features/feature-024-server-side-event-application.md) |
| F28 | [feature-028-ui-resource-grammar.md](./features/feature-028-ui-resource-grammar.md) |
| F29 | [feature-029-runtime-engine.md](./features/feature-029-runtime-engine.md) |
| F30 | [feature-030-vite-plugin.md](./features/feature-030-vite-plugin.md) |
| F33 | [feature-033-session-recovery.md](./features/feature-033-session-recovery.md) |
| F37 | [feature-037-component-registry.md](./features/feature-037-component-registry.md) |
| F38 | [feature-038-registry-trust-tiers.md](./features/feature-038-registry-trust-tiers.md) |
| F40 | [feature-040-primevue-registry.md](./features/feature-040-primevue-registry.md) |
| F46 | [feature-046-api-key-auth.md](./features/feature-046-api-key-auth.md) |
| F61 | [feature-061-cloudflare-workers-do-deployment.md](./features/feature-061-cloudflare-workers-do-deployment.md) |
| F62 | [feature-062-bun-self-host.md](./features/feature-062-bun-self-host.md) |
| F62b | [feature-062b-do-session-store.md](./features/feature-062b-do-session-store.md) |
| F64 | [feature-064-nuxt-binding.md](./features/feature-064-nuxt-binding.md) |

## Pipeline provenance

- **Methodology:** Specification by Example (Gherkin ACs throughout)
- **Source of truth:** [docs/idea/consolidated-requirements.md](../idea/consolidated-requirements.md) (signed off 2026-08-28)
- **Pipeline stages run:** Elicitation → QA workshop → 3-panel adversarial review → Loop-until-dry → Consolidated confirmation → Dependency map → Validation (SBE) → Spec-Writer → Spec-Verifier → Manifest → Handoff
- **Verification ladder:** 6/6 steps passed (schema check, coverage check, cross-reference check, open question check, manifest generation, quality attributes coverage)
- **Checkpoint blocks:** Inline `### Checkpoint: Phase X complete` markers in [completion-summary.md](./completion-summary.md)

## How to use this directory

1. **Reading:** start with [manifest.json](./manifest.json) for the cross-reference map, then jump to per-feature files for detail.
2. **Implementing:** bootstrap agent reads manifest, topologically sorts features by `dependsOn[]`, opens each `sourceDoc`, implements ACs.
3. **Verifying:** every AC has a `testId` in manifest.json; run `bun run test` to validate.
4. **Post-MVP:** deferred features listed in `pipeline_handoff.deferred_for_post_mvp` (manifest.json) and `roadmap.md` §Post-MVP backlog.

## See also

- [docs/idea/consolidated-requirements.md](../idea/consolidated-requirements.md) — locked decisions
- [docs/ai-base-prompts/1-requirements-gathering.md](../ai-base-prompts/1-requirements-gathering.md) — the pipeline that produced these specs
- `memory://GenicUI`, `memory://GenicUI-requirements`, `memory://Pipeline State` — project memory entities
