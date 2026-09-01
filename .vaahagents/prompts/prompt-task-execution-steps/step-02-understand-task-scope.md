---
step: 2
title: Understand Task Scope
phase: Planning
---

# Step 2: Understand Task Scope

Read in parallel:

- Task or feature definition — `docs/specs/features/feature-{{TASK_ID}}-*.md` for per-feature specs with Gherkin ACs
- `docs/specs/features.md` — full feature catalog with inputs, outputs, examples, and acceptance criteria
- `docs/specs/manifest.json` — dependency map, feature ordering, acceptance criterion test IDs
- `docs/specs/architecture.md` — system topology, request lifecycle, package boundaries, transport topology
- Related developer documentation in `docs/idea/` — consolidated requirements, adaptor spec, agent protocol, DX guide
- `docs/specs/security.md` — threat model, trust boundaries, API key auth, prototype pollution defense
- `docs/specs/testing-strategy.md` — test pyramid, coverage targets, property tests

**Invoke `filesystem` MCP server** to list files in the directories this task will touch.

**For each feature (F1–F64):** Read the corresponding spec file in `docs/specs/features/`. Extract:
- Feature inputs/outputs
- Gherkin acceptance criteria
- Dependencies (what features must be complete first)

**For PoC work:** Read `poc/README.md` and the relevant source files in `poc/server/`, `poc/adaptors/`, `poc/web/`.

Summarize: which files will be created, which modified, which deleted.
