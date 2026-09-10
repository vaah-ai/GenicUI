---
feature_id: F15
title: "find_ui_component tool"
phase: "Tool Surface"
priority: Critical
effort: M
dependencies: [F2, F13, F37]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
---

# F15 — `find_ui_component` tool

Returns a single `ui://` resource for the matching component (full schema + props), so the model can `Read` it.

## Inputs / Outputs

**Input:**
```json
{
  "name": "find_ui_component",
  "arguments": {
    "capability": "table",
    "tags": ["sortable", "filterable"]
  }
}
```

**Output:**
```json
{
  "uri": "ui://components/data-table@1.0.0",
  "name": "DataTable",
  "version": "1.0.0",
  "description": "Server-paginated table with sortable headers and per-column filters.",
  "propsSchema": {
    "type": "object",
    "properties": { "rows": { "type": "array" }, "columns": { "type": "array" }, "pageSize": { "type": "integer", "default": 25 } },
    "required": ["rows", "columns"],
    "additionalProperties": false
  },
  "events": ["row-click", "sort-change", "filter-change"],
  "examples": [{ "rows": [{"id":"1","name":"Alice"}], "columns": [{"key":"name","label":"Name"}] }]
}
```

## Acceptance Criteria (Gherkin)

### F15-AC1: Exact tag match returns 1 result
- **Given** the registry has 1 component matching `tags:["sortable"]`
- **When** `find_ui_component({ capability: "table", tags: ["sortable"] })` is called
- **Then** exactly 1 result is returned with `name`, `version`, `propsSchema`, `events`, `examples`

### F15-AC2: No match → empty result with reason
- **Given** no matching component
- **When** the tool runs
- **Then** return `{ results: [], reason: "no_component_matches" }`

### F15-AC3: Ambiguous match → ask for more criteria
- **Given** 3 components match `tags:["filterable"]`
- **When** the tool runs
- **Then** it returns a `disambiguation` field listing the 3 candidates and asks the agent to refine

## Test Plan

| AC | Test |
|---|---|
| F15-AC1 | `tests/integration/mcp.test.ts:F15-AC1` exact-tag scenario |
| F15-AC2 | `tests/integration/mcp.test.ts:F15-AC2` empty-result path |
| F15-AC3 | `tests/integration/mcp.test.ts:F15-AC3` disambiguation path |

## Cross-References

- Locked contract: [consolidated-requirements.md §D1 Tool contracts](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
- Used by: F16 (render), F17 (update)
