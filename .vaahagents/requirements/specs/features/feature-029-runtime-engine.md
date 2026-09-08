---
feature_id: F29
title: "Runtime engine (mount, patch, lifecycle)"
phase: Runtime
priority: Critical
effort: L
dependencies: [F21, F24]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#f-component-system-locked
---

# F29 — Runtime engine

Module-isolated sub-module that mounts, patches, and tears down components; lives in `@genicui/runtime`.

## Inputs / Outputs

**Input:**
```ts
import { createRuntime } from '@genicui/runtime';
const rt = createRuntime({ socket, registry, sessionStore });
rt.onMessage(frame);
```

**Output:**
- DOM updates
- Outbound WS frames emitted via socket
- Session store mutations on mount/unmount

## Acceptance Criteria (Gherkin)

### F29-AC1: Mount within 50ms
- **Given** an inbound `STATE_SNAPSHOT` for a fresh componentId
- **When** the runtime processes
- **Then** the Web Component is mounted within 50ms of frame arrival

### F29-AC2: Patch within 10ms
- **Given** an inbound `STATE_DELTA`
- **When** applied
- **Then** the DOM is updated within 10ms

### F29-AC3: Unmount on `channel.closed`
- **Given** an inbound `channel.closed` for a mounted component
- **When** received
- **Then** the Web Component is removed and the channel handler disposed

### F29-AC4: Module isolation
- **Given** the runtime module
- **When** loaded
- **Then** no global namespace pollution (`window.${runtime}` should not be set)

## Test Plan

| AC | Test |
|---|---|
| F29-AC1 | `tests/integration/runtime.test.ts:F29-AC1` timing assert |
| F29-AC2 | `tests/integration/runtime.test.ts:F29-AC2` timing assert |
| F29-AC3 | `tests/integration/runtime.test.ts:F29-AC3` unmount |
| F29-AC4 | `tests/unit/runtime/isolation.test.ts:F29-AC4` global state |

## Cross-References

- Architecture: [architecture.md §Runtime](../architecture.md#runtime)
- Used by: F23 (Vue shim), F40 (PrimeVue registry)
