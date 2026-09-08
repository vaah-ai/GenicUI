---
feature_id: F30
title: "Vite plugin + component auto-registration"
phase: Runtime
priority: High
effort: M
dependencies: [F21]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F30 — Vite plugin + component auto-registration

Scans `src/genui/components/*.ts` at build time, registers each via `customElements.define`.

## Inputs / Outputs

**Input (`vite.config.ts`):**
```ts
import { genicui } from '@genicui/vite-plugin';
export default { plugins: [genicui({ entry: 'src/genui/index.ts' })] };
```

**Output:**
- Bundled JS module auto-registers all components
- HMR support for component changes
- Build emits `genui-registry.json` for the server

## Acceptance Criteria (Gherkin)

### F30-AC1: Auto-discovery of components
- **Given** files in `src/genui/components/*.ts` exporting `default` extending `GenicElement`
- **When** `vite build` runs
- **Then** all are registered

### F30-AC2: HMR on file save
- **Given** a component file is saved during `vite dev`
- **When** HMR triggers
- **Then** the runtime swaps the element without full page reload

### F30-AC3: Server registry manifest emission
- **Given** `vite build` completes
- **When** the plugin finalizes
- **Then** `genui-registry.json` is emitted with each component's `name`, `version`, `propsSchema`, `events`

## Test Plan

| AC | Test |
|---|---|
| F30-AC1 | `tests/integration/vite-plugin.test.ts:F30-AC1` discovery |
| F30-AC2 | `tests/integration/vite-plugin.test.ts:F30-AC2` HMR |
| F30-AC3 | `tests/integration/vite-plugin.test.ts:F30-AC3` manifest |

## Cross-References

- Used by: F37 (server registry), F40 (PrimeVue registry)
