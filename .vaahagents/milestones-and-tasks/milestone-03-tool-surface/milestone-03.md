# Milestone M3 — Tool Surface: MCP + 4 Public Tools

> **Roadmap phase:** Tool Surface
> **Roadmap week:** W3-W4
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 10-14 days (2 weeks × single maintainer)
> **Dependencies:** M2 (Transport) — server, WS, frames must exist first

## Objective

Build the MCP server with 4 public tools (`find_ui_component`, `render_component`, `update_component`, `subscribe_to_events`), trust-boundary validation, and `ui://` URI grammar. This is the agent-facing surface — where AI agents interact with the framework. Corresponds to W3-W4 in [roadmap.md](../../../docs/requirements/specs/roadmap.md#week-3-mcp-server--trust-boundary-f13-f14).

## Success Criteria

- [ ] `tools/list` returns exactly 4 tools (F13-AC1)
- [ ] All 7 manifest features pass `bun test` (17 ACs total)
- [ ] Trust-boundary validation strips `__proto__`/`constructor`/`prototype` (F14-AC1)
- [ ] Agent smoke test: connect → tools/list → find_ui_component → render_component → update_component
- [ ] All tool calls validated via TypeBox `Value.Check()` with `additionalProperties: false`

## Tasks

- M3-T1 — MCP server with 4 public tools (maps to manifest F13)
- M3-T2 — Trust-boundary validation (maps to manifest F14)
- M3-T3 — find_ui_component tool (maps to manifest F15)
- M3-T4 — render_component tool (maps to manifest F16)
- M3-T5 — update_component (JSON-Patch mode + replace fallback) (maps to manifest F17)
- M3-T6 — subscribe_to_events tool (maps to manifest F18)
- M3-T7 — ui:// URI grammar (catalog + instance) (maps to manifest F28)

## Dependencies

- **Blocks:** M4 (Runtime — F19 depends on F18, F23/F24/F29 depend on tool surface)
- **Requires:** M2-T1 (F9 — server), M2-T3 (F11 — frames), M1-T2 (F2 — schema)

## Manifest Cross-References

- Features: F13, F14, F15, F16, F17, F18, F28
- Quality attributes covered: Security (F14), Performance (F15), Reliability (F17), Usability (F16)
- Pipeline handoff invariants honoured: 4 public MCP tools (§L4), 10 JSON-RPC error codes (§D)
