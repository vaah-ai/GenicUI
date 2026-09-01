# Task M2-T3 — Frame envelope serialization + channel multiplexing

> **Milestone:** M2 (Transport: Server + WebSocket + Frames)
> **Manifest feature:** F11 (Frame envelope serialization + channel multiplexing)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement frame envelope serialization with monotonic `seq` values and channel multiplexing. Single WebSocket multiplexes 256 channels with frame ordering by `seq`. Malformed frames trigger WS close 1003.

## Task Goals

- Single-line JSON with monotonic seq (F11-AC1)
- 257th channel rejected with -32001 (F11-AC2)
- Frames dispatched in seq order, not arrival order (F11-AC3)
- Malformed frame → WS close 1003 (F11-AC4)

## Implementation Plan

### Pre-Implementation Analysis

- Depends on M1-T3 (F3 — sequence generator) and M2-T1 (F9 — server)
- Frame envelope: `{ v: 1, channel, type, payload, seq, causes? }` per §E Wire Protocol
- Max 256 channels per socket

### Steps

1. Implement frame serialization using SequenceGenerator from F3
2. Implement channel multiplexer: Map<channelId, Frame[]> with 256-channel limit
3. Implement seq-ordering: buffer out-of-order, dispatch when contiguous
4. Implement malformed frame detection → WS close 1003
5. Write integration test: single-line JSON with monotonic seq (F11-AC1)
6. Write integration test: 257th channel rejected (F11-AC2)
7. Write integration test: seq-order dispatch (F11-AC3)
8. Write integration test: malformed frame → close 1003 (F11-AC4)

## Acceptance Criteria

- Single-line JSON with monotonic seq
- 257th channel rejected with -32001
- Frames dispatched in seq order, not arrival order
- Malformed frame → WS close 1003

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M1-T3 (F3), M2-T1 (F9)
- **Blocks:** M3-T1 (F13 — MCP server)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F11]`
- Per-feature: `docs/requirements/specs/features/feature-011-frame-envelope-multiplexing.md`
- Wire protocol: `docs/requirements/idea/consolidated-requirements.md` §E
