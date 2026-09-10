---
feature_id: F13
title: "MCP server with 4 public tools"
phase: "Tool Surface"
priority: Critical
effort: L
dependencies: [F9, F11]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#d-tool-contracts-locked
---

# F13 — MCP server with 4 public tools

`@genicui/server` exposes `tools/list` with exactly 4 tools; each tool's `inputSchema` is JSON Schema derived from `GenicSchema<T>`.

## Inputs / Outputs

**Input (MCP initialize):**
```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
  "protocolVersion": "2026-07-28",
  "capabilities": {},
  "clientInfo": { "name": "claude-code", "version": "1.0.0" }
}}
```

**Output (tools/list):**
```json
{ "jsonrpc": "2.0", "id": 2, "result": {
  "tools": [
    { "name": "find_ui_component", "description": "...", "inputSchema": {...} },
    { "name": "render_component", "description": "...", "inputSchema": {...} },
    { "name": "update_component", "description": "...", "inputSchema": {...} },
    { "name": "subscribe_to_events", "description": "...", "inputSchema": {...} }
  ]
}}
```

## Acceptance Criteria (Gherkin)

### F13-AC1: tools/list returns exactly 4
- **Given** an MCP client connects via stdio or Streamable HTTP
- **When** it calls `tools/list`
- **Then** exactly 4 tools are returned with correct names

### F13-AC2: Invalid input → JSON-RPC error
- **Given** a tool is called with invalid input
- **When** the server validates
- **Then** it returns `{ isError: true, content: [...] }` with a JSON-RPC error code from the -32001..-32010 namespace

### F13-AC3: Valid input conforms to output schema
- **Given** a tool is called with valid input
- **When** execution completes
- **Then** the result conforms to the tool's output schema

## Test Plan

| AC | Test |
|---|---|
| F13-AC1 | `tests/integration/mcp.test.ts:F13-AC1` MCP initialize + tools/list count == 4 |
| F13-AC2 | `tests/integration/mcp.test.ts:F13-AC2` send broken tool call, expect isError:true |
| F13-AC3 | `tests/integration/mcp.test.ts:F13-AC3` output schema validation against snapshot |

## Cross-References

- Locked by: [consolidated-requirements.md §L4 MCP positioning](../../idea/consolidated-requirements.md#b-locked-technical-decisions)
- Locked contracts: [consolidated-requirements.md §D Tool Contracts](../../idea/consolidated-requirements.md#d-tool-contracts-locked)
