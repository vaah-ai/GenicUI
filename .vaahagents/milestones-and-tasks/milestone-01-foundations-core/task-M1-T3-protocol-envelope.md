# Task M1-T3 — Protocol envelope + sequence generator

> **Milestone:** M1 (Foundations: Core Package)
> **Manifest feature:** F3 (Protocol envelope + sequence generator)
> **Priority:** Critical
> **Status:** ✅ Completed
> **Estimated Effort:** 1 day

## Description

Implement the `SequenceGenerator` for monotonic `uint64` sequence numbers and the frame envelope helper. Every frame on the wire carries a monotonically increasing `seq` value — this is the ordering guarantee for the entire system. Out-of-order frames are buffered until contiguous.

## Task Goals

- 1000 `seq.next()` calls produce monotonic uint64, no duplicates (F3-AC1)
- Out-of-order frame buffered until contiguous (F3-AC2)
- Reserved channel rejected with -32008 (F3-AC3)

## Implementation Plan

### Pre-Implementation Analysis

- This depends on M1-T1 (F1) — the core package must exist first
- `seq: monotonic uint64` is a wire protocol invariant (§E Wire Protocol, consolidated-requirements.md)
- Property-based test required: 10K `seq.next()` calls, no duplicates (testing-strategy.md)
- Invoke `sequential-thinking` skill if needed for monotonic-uint64 correctness proof

### Steps

1. Implement `SequenceGenerator` class with `next(): bigint` returning monotonic uint64
2. Implement frame envelope helper: `{ v: 1, channel, type, payload, seq, causes? }`
3. Implement out-of-order buffering: reorder by `seq`, apply contiguous
4. Implement reserved channel validation (`__session__`, `__mcp__`, `__agent__`)
5. Write unit test: monotonic uint64, no duplicates (F3-AC1)
6. Write integration test: out-of-order buffering (F3-AC2)
7. Write integration test: reserved channel rejection (F3-AC3)
8. Write property test: fast-check 10K seq.next() calls (testing-strategy.md)

## Acceptance Criteria

- 1000 `seq.next()` calls produce monotonic uint64, no duplicates
- Out-of-order frame buffered until contiguous
- Reserved channel rejected with -32008

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 80% core
- [ ] Property-based test passing (fast-check 10K runs)

## Dependencies

- **Requires:** M1-T1 (F1)
- **Blocks:** M2-T3 (F11 — frame multiplexing)

## Documentation References

- Manifest: `.vaahagents/requirements/specs/manifest.json` → `features[F3]`
- Per-feature: `.vaahagents/requirements/specs/features/feature-003-protocol-envelope.md`
- Wire protocol: `.vaahagents/requirements/idea/consolidated-requirements.md` §E
