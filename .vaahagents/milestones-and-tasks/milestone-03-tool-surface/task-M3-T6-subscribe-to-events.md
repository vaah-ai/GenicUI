# Task M3-T6 — subscribe_to_events tool

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F18 (subscribe_to_events)
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Implement `subscribe_to_events`: agent subscribes to component events by filter (`componentId?`, `actions?`, `sessionId?`, `expiresAt?`). Default TTL 1 hour. Component unmount auto-cleans subscription.

## Task Goals

- Event filter scopes subscription (F18-AC1)
- Unsubscribe stops event stream (F18-AC2)
- Component unmount auto-cleans subscription (F18-AC3)

## Implementation Plan

### Steps

1. Implement `subscribe_to_events` handler with filter parameters
2. Implement TTL: default 1h, `expiresAt` override
3. Implement `unsubscribe` — stop event stream
4. Wire to F20 event bus (auto-clean on component unmount)
5. Write integration test: event filter scopes subscription (F18-AC1)
6. Write integration test: unsubscribe stops stream (F18-AC2)
7. Write integration test: unmount auto-cleans (F18-AC3)

## Acceptance Criteria

- Event filter scopes subscription
- Unsubscribe stops event stream
- Component unmount auto-cleans subscription

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 90% tool handlers

## Dependencies

- **Requires:** M3-T1 (F13) — F20 (event bus) is a future dep in M4
- **Blocks:** M4-T1 (F19 — event capture)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F18]`
- Per-feature: `docs/requirements/specs/features/feature-018-subscribe-to-events-tool.md`
