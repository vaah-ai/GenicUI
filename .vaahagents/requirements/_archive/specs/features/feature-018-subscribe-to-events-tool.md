---
feature_id: F18
title: "subscribe_to_events tool"
phase: "Tool Surface"
priority: Critical
effort: M
dependencies: [F13, F20]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
  - ../../idea/consolidated-requirements.md#g-event-system-locked
---

# F18 — `subscribe_to_events` tool

Returns a `subscriptionId` and starts forwarding matching events back to the model.

## Inputs / Outputs

**Input:**
```json
{
  "name": "subscribe_to_events",
  "arguments": {
    "componentId": "dt-7f3a9b2c",
    "events": ["row-click"]
  }
}
```

**Output:**
```json
{
  "subscriptionId": "sub-9c2a",
  "componentId": "dt-7f3a9b2c",
  "events": ["row-click"]
}
```

**Server push (subsequent):**
```json
{ "v":1, "channel":"__mcp__", "type":"EVENT", "payload":{
  "subscriptionId":"sub-9c2a",
  "componentId":"dt-7f3a9b2c",
  "event":"row-click",
  "data":{"rowId":"1"}
}, "seq":14 }
```

## Acceptance Criteria (Gherkin)

### F18-AC1: Filter by events
- **Given** a mounted component with `events: ["row-click","sort-change"]`
- **When** `subscribe_to_events({ events: ["row-click"] })`
- **Then** only `row-click` events are forwarded

### F18-AC2: Unsubscribe stops stream
- **Given** an active subscription
- **When** `unsubscribe` is invoked with the same `subscriptionId`
- **Then** no further events flow through that subscription

### F18-AC3: Component unmounted → auto-cleanup
- **Given** a subscription against a component that gets unmounted
- **When** the unmount completes
- **Then** the subscription is auto-cleaned and `subscription.closed` is emitted

## Test Plan

| AC | Test |
|---|---|
| F18-AC1 | `tests/integration/mcp.test.ts:F18-AC1` filter scope |
| F18-AC2 | `tests/integration/mcp.test.ts:F18-AC2` unsubscribe |
| F18-AC3 | `tests/integration/mcp.test.ts:F18-AC3` unmount cleanup |

## Cross-References

- Locked contract: [consolidated-requirements.md §D4 Tool contracts](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
- Used by: F20 (event capture/forward)
