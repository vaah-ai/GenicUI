---
feature_id: F3
title: "Protocol envelope + sequence generator"
phase: Foundations
priority: Critical
effort: S
dependencies: [F1]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#e-wire-protocol-locked
---

# F3 — Protocol envelope + sequence generator

Monotonic uint64 sequence generator + envelope `{ v, channel, type, payload, seq, causes? }`.

## Inputs / Outputs

**Input:**
```ts
import { SequenceGenerator, envelope } from '@genicui/core';
const seq = new SequenceGenerator();
const frame = envelope({
  channel: 'dt-7f3a9b2c',
  type: 'STATE_DELTA',
  payload: [{ op: 'replace', path: '/rows/1/name', value: 'updated' }],
  seq: seq.next(),
});
```

**Output (wire):**
```
{"v":1,"channel":"dt-7f3a9b2c","type":"STATE_DELTA","payload":[{"op":"replace","path":"/rows/1/name","value":"updated"}],"seq":42}
```

## Acceptance Criteria (Gherkin)

### F3-AC1: Monotonic uint64 over 1000 calls
- **Given** a sequence generator instance
- **When** `seq.next()` is called 1000 times
- **Then** values are monotonic uint64 with no duplicates

### F3-AC2: Out-of-order buffering
- **Given** an envelope with `seq: 5`
- **When** another envelope with `seq: 3` arrives
- **Then** the second is buffered until `seq: 4` and `seq: 5` are seen

### F3-AC3: Reserved channel rejection
- **Given** a reserved channel (`__session__`, `__mcp__`, `__agent__`)
- **When** used as a component channel
- **Then** the server rejects with `-32008 surface_unavailable`

## Test Plan

| AC | Test |
|---|---|
| F3-AC1 | `tests/unit/core/sequence.test.ts:F3-AC1` property test, 10K calls |
| F3-AC2 | `tests/integration/transport.test.ts:F3-AC2` arrival vs seq dispatch |
| F3-AC3 | `tests/integration/tools.test.ts:F3-AC3` renders with reserved channel |

## Cross-References

- Locked by: [consolidated-requirements.md §E Frame Envelope](../../idea/consolidated-requirements.md#e-wire-protocol-locked)
- Depends on: F1 (core skeleton)
