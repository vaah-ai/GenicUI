---
feature_id: F11
title: "Frame envelope serialization + channel multiplexing"
phase: Transport
priority: Critical
effort: M
dependencies: [F3, F9]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#e-wire-protocol-locked
---

# F11 — Frame envelope serialization + channel multiplexing

Per-channel subscription routing with `seq` ordering, max 256 channels per socket.

## Inputs / Outputs

**Input (two channels):**
```ts
const frameA = { v: 1, channel: '__mcp__', type: 'TOOL_CALL_RESULT', payload: { ... }, seq: 10 };
const frameB = { v: 1, channel: 'dt-7f3a9b2c', type: 'STATE_DELTA', payload: [...], seq: 11 };
```

**Output (wire):**
```
{"v":1,"channel":"__mcp__","type":"TOOL_CALL_RESULT","payload":{...},"seq":10}
{"v":1,"channel":"dt-7f3a9b2c","type":"STATE_DELTA","payload":[...],"seq":11}
```

## Acceptance Criteria (Gherkin)

### F11-AC1: Single-line JSON, monotonic seq
- **Given** a frame with channel `__session__`
- **When** serialized
- **Then** JSON is single-line with `seq` monotonic

### F11-AC2: 257 channels rejected
- **Given** 256 channels are open
- **When** a 257th is registered
- **Then** server rejects with `-32001 component_not_found` and emits `channel.closed`

### F11-AC3: Dispatch by seq, not arrival
- **Given** a frame arrives with `seq: 11` after `seq: 10`
- **When** channel handler reads
- **Then** frames are dispatched in `seq` order (not arrival order)

### F11-AC4: Malformed frame → close 1003
- **Given** a frame is malformed (missing `v` or `channel`)
- **When** server receives
- **Then** connection closes with WS code 1003

## Test Plan

| AC | Test |
|---|---|
| F11-AC1 | `tests/integration/transport.test.ts:F11-AC1` JSON-line format regex |
| F11-AC2 | `tests/integration/transport.test.ts:F11-AC2` 257th channel rejected |
| F11-AC3 | `tests/integration/transport.test.ts:F11-AC3` arrived-out-of-order test |
| F11-AC4 | `tests/integration/transport.test.ts:F11-AC4` malformed payload test |

## Cross-References

- Used by: every wire-emitting component (F13, F16, F17, F20)
- Architecture: [architecture.md §Transport Topology](../architecture.md#transport-topology)
