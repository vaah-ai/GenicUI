---
feature_id: F23
title: "Vue 3 shim (`useGenicComponent`, `v-genic`, `<GenicProvider>`)"
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

# F23 — Vue 3 shim

`useGenicComponent`, `v-genic` directive, `<GenicProvider>` for Vue 3 applications.

## Inputs / Outputs

**Input:**
```vue
<script setup>
import { useGenicComponent } from '@genicui/vue';
const { props } = useGenicComponent('dt-7f3a9b2c', { rows: [] });
</script>

<template>
  <div v-genic="'data-table'" :props="props" @row-click="onClick" />
</template>
```

**Output:**
- Web Component rendered with closed shadow DOM
- Props reactive to incoming patches
- Events emitted back to server

## Acceptance Criteria (Gherkin)

### F23-AC1: useGenicComponent fetches initial state
- **Given** the server has mounted component `dt-7f3a9b2c` with `{ rows: [] }`
- **When** `useGenicComponent('dt-7f3a9b2c')` runs
- **Then** `props.value` is `{ rows: [] }`

### F23-AC2: Reactive patches
- **Given** a patch arrives at `dt-7f3a9b2c`
- **When** the runtime applies it
- **Then** `props.value` reflects the change (Vue reactivity)

### F23-AC3: v-genic directive registers element
- **Given** a `<div v-genic="'data-table'">` element
- **When** inserted into the DOM
- **Then** a Web Component is registered and props are wired

### F23-AC4: GenicProvider passes WS connection
- **Given** `<GenicProvider url="..." api-key="...">` wraps the app
- **When** a child component uses `useGenicComponent`
- **Then** it inherits the connection without re-authenticating

## Test Plan

| AC | Test |
|---|---|
| F23-AC1 | `tests/integration/vue-shim.test.ts:F23-AC1` initial state |
| F23-AC2 | `tests/integration/vue-shim.test.ts:F23-AC2` patch reactivity |
| F23-AC3 | `tests/integration/vue-shim.test.ts:F23-AC3` directive |
| F23-AC4 | `tests/integration/vue-shim.test.ts:F23-AC4` provider |

## Cross-References

- Locked by: [consolidated-requirements.md §F3 Frameworks, §L11 Post-MVP frameworks](../../idea/consolidated-requirements.md#f-component-system-locked)
- Architecture: [architecture.md §Runtime](../architecture.md#runtime)
