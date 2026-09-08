---
feature_id: F28
title: "`ui://` URI grammar (catalog + instance)"
phase: "Tool Surface"
priority: High
effort: S
dependencies: [F13]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
---

# F28 — `ui://` URI grammar (catalog + instance)

Catalog form: `ui://components/{name}@{version}`. Instance form: `ui://instances/{componentId}`.

## Inputs / Outputs

**Catalog form (registry-resident):**
```
ui://components/data-table@1.0.0
ui://components/select@0.5.0
```

**Instance form (rendered):**
```
ui://instances/dt-7f3a9b2c
```

## Acceptance Criteria (Gherkin)

### F28-AC1: Catalog URI matches `^ui://components/[a-z][a-z0-9-]*@\d+\.\d+\.\d+$`
- **Given** any catalog URI
- **When** parsed
- **Then** it matches the regex `^ui://components/[a-z][a-z0-9-]*@\d+\.\d+\.\d+$`

### F28-AC2: Instance URI matches `^ui://instances/[a-z0-9-]{1,32}$`
- **Given** any instance URI
- **When** parsed
- **Then** it matches the regex `^ui://instances/[a-z0-9-]{1,32}$`

### F28-AC3: Catalog URI rejected for `render_component`
- **Given** a `render_component` call with a `ui://components/...` URI
- **When** the server validates
- **Then** it returns `-32002 invalid_resource_uri`

## Test Plan

| AC | Test |
|---|---|
| F28-AC1 | `tests/unit/core/uri.test.ts:F28-AC1` regex snapshot 100 cases |
| F28-AC2 | `tests/unit/core/uri.test.ts:F28-AC2` regex snapshot 100 cases |
| F28-AC3 | `tests/integration/mcp.test.ts:F28-AC3` wrong URI |

## Cross-References

- Locked by: [consolidated-requirements.md §D Tool contracts, §L5 URI grammar](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
- Architecture: [architecture.md §Request Lifecycle](../architecture.md#request-lifecycle)
