---
feature_id: F38
title: "Registry trust tiers (project / user / remote)"
phase: Registry
priority: High
effort: M
dependencies: [F37]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#k-registry-system-locked
  - ../../idea/consolidated-requirements.md#m-security-decisions-locked
---

# F38 — Registry trust tiers

Project tier > User tier > Remote tier. Remote entries require explicit allow-list.

## Inputs / Outputs

**Input:**
```ts
const registry = new Registry([
  { tier: 'project', manifest: 'registry.project.json' },
  { tier: 'user', manifest: '~/.config/genicui/registry.json' },
  { tier: 'remote', manifest: 'https://registry.genicui.dev/api/components', allowList: ['@official/*'] },
]);
```

**Output:**
- Effective registry is the union, project wins on conflict
- Remote entries are filtered by allow-list patterns

## Acceptance Criteria (Gherkin)

### F38-AC1: Project wins on conflict
- **Given** project registry defines `data-table@1.0.0` and remote defines `data-table@2.0.0`
- **When** `find_ui_component({ capability: 'table' })` runs
- **Then** project's `data-table@1.0.0` is returned

### F38-AC2: Remote allow-list enforced
- **Given** a remote entry not matching `@official/*`
- **When** the loader runs
- **Then** it is dropped with a log warning

### F38-AC3: User tier falls through to project on miss
- **Given** the user registry has no matching component
- **When** lookup runs
- **Then** project (and then remote) are tried

## Test Plan

| AC | Test |
|---|---|
| F38-AC1 | `tests/integration/registry-tier.test.ts:F38-AC1` conflict |
| F38-AC2 | `tests/integration/registry-tier.test.ts:F38-AC2` allow-list |
| F38-AC3 | `tests/integration/registry-tier.test.ts:F38-AC3` lookup order |

## Cross-References

- Locked by: [consolidated-requirements.md §M Security Decisions, §K Registry System](../../idea/consolidated-requirements.md#m-security-decisions-locked)
- Security: [security.md §Registry Trust](../security.md#registry-trust)
