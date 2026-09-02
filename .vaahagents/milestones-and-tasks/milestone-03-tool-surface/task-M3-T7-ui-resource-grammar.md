# Task M3-T7 — ui:// URI grammar (catalog + instance)

> **Milestone:** M3 (Tool Surface: MCP + 4 Public Tools)
> **Manifest feature:** F28 (ui:// URI grammar)
> **Priority:** Medium
> **Status:** ✅ Completed
> **Estimated Effort:** 1 day

## Description

Implement `ui://` URI grammar for MCP Apps: catalog URIs (`ui://components/{component}@{version}`) and instance URIs (`ui://instances/{componentId}`). Validates format and rejects catalog URIs for render_component calls.

## Task Goals

- Catalog URI matches regex pattern (F28-AC1)
- Instance URI matches regex pattern (F28-AC2)
- Catalog URI rejected for render_component with -32002 (F28-AC3)

## Implementation Plan

### Steps

1. Implement catalog URI regex: `/^ui:\/\/components\/[a-z][a-z0-9-]*@\d+\.\d+\.\d+$/`
2. Implement instance URI regex: `/^ui:\/\/instances\/[a-z0-9-]{1,32}$/`
3. Reject catalog URIs for render_component with -32002
4. Write unit test: catalog URI regex (F28-AC1)
5. Write unit test: instance URI regex (F28-AC2)
6. Write integration test: catalog URI rejected for render (F28-AC3)

## Acceptance Criteria

- Catalog URI matches `/^ui:\/\/components\/[a-z][a-z0-9-]*@\d+\.\d+\.\d+$/`
- Instance URI matches `/^ui:\/\/instances\/[a-z0-9-]{1,32}$/`
- Catalog URI rejected for render_component with -32002

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds

## Dependencies

- **Requires:** M3-T1 (F13)
- **Blocks:** None directly (used by F16/F17)

## Documentation References

- Manifest: `docs/requirements/specs/manifest.json` → `features[F28]`
- Per-feature: `docs/requirements/specs/features/feature-028-ui-resource-grammar.md`
- Wire protocol: `docs/requirements/idea/consolidated-requirements.md` §E
