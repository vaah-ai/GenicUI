---
feature_id: F20
title: "Internal event bus (post-emit hook + backpressure)"
phase: Runtime
priority: Critical
effort: M
dependencies: [F5, F11, F19]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#g-event-system-locked
  - ../../idea/consolidated-requirements.md#i-error-handling-locked
---

# F20 — Internal event bus (post-emit hook + backpressure)

Decouples inbound events from outbound emission; includes backpressure on per-socket queues.

## Inputs / Outputs

**Input:**
```ts
const bus = new InternalEventBus();
bus.emit('dt-7f3a9b2c', { type: 'EVENT', payload: {...} });
```

**Output:**
- `EVENT` frames added to outbound queue for the channel
- Backpressure: queue depth > 500 → close socket with WS code 1013

## Acceptance Criteria (Gherkin)

### F20-AC1: Emit returns seq number
- **Given** a visible channel
- **When** `bus.emit()` is called
- **Then** the enqueued frame carries the next monotonic seq

### F20-AC2: post-emit hook fires after WS write
- **Given** a registered `postEmit` hook
- **When** the frame has been flushed
- **Then** the hook fires with `{ channel, seq }`

### F20-AC3: Queue overflow → WS close 1013
- **Given** outbound queue > 500 frames
- **When** another `bus.emit` arrives
- **Then** socket is closed with WS code 1013

### F20-AC4: Failed deliver → drop, not crash
- **Given** a write fails (e.g., socket closed)
- **When** emit completes
- **Then** the frame is dropped and the failure logged

## Test Plan

| AC | Test |
|---|---|
| F20-AC1 | `tests/integration/runtime.test.ts:F20-AC1` seq monotonicity |
| F20-AC2 | `tests/integration/runtime.test.ts:F20-AC2` post-emit hook |
| F20-AC3 | `tests/integration/runtime.test.ts:F20-AC3` queue overflow |
| F20-AC4 | `tests/integration/runtime.test.ts:F20-AC4` graceful failure |

## Cross-References

- Locked by: [consolidated-requirements.md §I Error Handling, §G Event System](../../idea/consolidated-requirements.md#g-event-system-locked)
- Architecture: [architecture.md §Runtime](../architecture.md#runtime)
