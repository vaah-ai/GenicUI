---
feature_id: F19
title: "Event capture from Custom Elements"
phase: "Runtime"
priority: Critical
effort: M
dependencies: [F18]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#g-event-system-locked
---

# F19 — Event capture from Custom Elements

Listens for `composed: true, bubbles: true` CustomEvents from Web Components and emits to the channel as `EVENT` frames.

## Inputs / Outputs

**Client side (Web Component):**
```ts
this.dispatchEvent(new CustomEvent('row-click', {
  detail: { rowId: '1' },
  bubbles: true,
  composed: true,
}));
```

**Server wire:**
```json
{ "v":1, "channel":"dt-7f3a9b2c", "type":"EVENT", "payload":{
  "componentId":"dt-7f3a9b2c",
  "event":"row-click",
  "data":{"rowId":"1"}
}, "seq":14 }
```

## Acceptance Criteria (Gherkin)

### F19-AC1: composed:true required
- **Given** a CustomEvent without `composed: true`
- **When** it crosses the closed Shadow DOM boundary
- **Then** the event is NOT captured

### F19-AC2: Event payload shape conforms to schema
- **Given** a component declares event schemas (via `events.{name}.payload`)
- **When** the event fires
- **Then** payload is validated; invalid events are dropped with a server log warning

### F19-AC3: High-volume events rate-limited
- **Given** 1,000 events/sec from a component
- **When** they reach the server
- **Then** server applies a per-component 200/s cap with `drop_count` counter

## Test Plan

| AC | Test |
|---|---|
| F19-AC1 | `tests/integration/runtime.test.ts:F19-AC1` composed-flag test |
| F19-AC2 | `tests/integration/runtime.test.ts:F19-AC2` schema validation |
| F19-AC3 | `tests/load/throughput.test.ts:F19-AC3` 1K events/sec |

## Cross-References

- Locked by: [consolidated-requirements.md §G Event System](../../idea/consolidated-requirements.md#g-event-system-locked)
- Architecture: [architecture.md §Runtime](../architecture.md#runtime)
