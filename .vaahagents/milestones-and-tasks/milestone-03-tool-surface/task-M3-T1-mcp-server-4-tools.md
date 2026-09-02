# Task M3-T1 — MCP server with 4 public tools

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F13 (MCP server with 4 public tools)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 2-3 days

## Description

Bootstrap the MCP server exposing 4 public tools: `find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`. `tools/list` returns exactly 4 tools. Invalid input returns JSON-RPC errors in the -32001..-32010 range.

## Task Goals

- `tools/list` returns exactly 4 tools (F13-AC1)
- Invalid input → JSON-RPC error in -32001..-32010 (F13-AC2)
- Valid input conforms to output schema (F13-AC3)

## Implementation Plan

### Steps

1. Create MCP server bootstrap with `tools/list` returning 4 tool definitions
2. Implement tool registry: Map<toolName, handler>
3. Implement JSON-RPC error codes: -32001..-32010 namespace
4. Stub handlers for 4 tools (real impls in M3-T3 through M3-T6)
5. Write integration test: tools/list returns 4 (F13-AC1)
6. Write integration test: invalid input → error code (F13-AC2)
7. Write integration test: valid input conforms to schema (F13-AC3)

## Acceptance Criteria

- `tools/list` returns exactly 4 tools
- Invalid input → JSON-RPC error in -32001..-32010
- Valid input conforms to output schema

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds
- [ ] Coverage target met: 90% tool handlers

## Dependencies

- **Requires:** M2-T1 (F9), M2-T4 (F11)
- **Blocks:** M3-T2 (F14), M3-T3 (F15), M3-T4 (F16), M3-T5 (F17), M3-T6 (F18), M3-T7 (F28)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F13]`
- Per-feature: `docs/requirements/specs/features/feature-013-mcp-server-4-tools.md`
- Tool contracts: `docs/requirements/idea/consolidated-requirements.md` §D
