---
feature_id: F40
title: "PrimeVue DataTable registry (single component)"
phase: Registry
priority: High
effort: L
dependencies: [F37, F38]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#k-registry-system-locked
---

# F40 — PrimeVue DataTable registry

Single wrapped component: `<gv-data-table>` backed by PrimeVue's DataTable, with its 30+ props reduced to 8 (`rows`, `columns`, `pageSize`, `page`, `sort`, `filters`, `selection`, `loading`).

## Inputs / Outputs

**Input:**
```json
{
  "uri": "ui://components/gv-data-table@1.0.0",
  "props": {
    "rows": [{"id":"1","name":"Alice"}],
    "columns": [{"key":"name","label":"Name"}],
    "pageSize": 25,
    "page": 0
  }
}
```

**Output (rendered):**
- A paginated, sortable, filterable table
- All PrimeVue features wired via the 8-prop API
- Events: `row-click`, `sort-change`, `filter-change`, `page-change`, `selection-change`

## Acceptance Criteria (Gherkin)

### F40-AC1: 8 prop API
- **Given** the wrapped DataTable
- **When** `render_component` is called
- **Then** the schema enforces exactly 8 top-level props (no more, no less)

### F40-AC2: Sort emits `sort-change`
- **Given** a sortable column
- **When** the user clicks the header
- **Then** `sort-change` event fires with `{ key, direction }`

### F40-AC3: Filter emits `filter-change` with debounce
- **Given** a filterable column
- **When** the user types
- **Then** `filter-change` fires after 300ms debounce with `{ key, value }`

### F40-AC4: Selection mode
- **Given** `selection: { mode: 'multiple' }`
- **When** the user selects rows
- **Then** `selection-change` fires with the array of selected IDs

## Test Plan

| AC | Test |
|---|---|
| F40-AC1 | `tests/integration/primevue-registry.test.ts:F40-AC1` prop schema |
| F40-AC2 | `tests/integration/primevue-registry.test.ts:F40-AC2` sort |
| F40-AC3 | `tests/integration/primevue-registry.test.ts:F40-AC3` filter debounce |
| F40-AC4 | `tests/integration/primevue-registry.test.ts:F40-AC4` selection |

## Cross-References

- Locked by: [consolidated-requirements.md §K Registry System](../../idea/consolidated-requirements.md#k-registry-system-locked)
- Velocity decision: Post-MVP deferral of full PrimeVue bindings
