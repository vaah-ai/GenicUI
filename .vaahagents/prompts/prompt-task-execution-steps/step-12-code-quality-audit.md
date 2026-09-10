---
step: 12
title: Code Quality, Formatting & Principles Audit
phase: Completion
---

# Step 12: Code Quality, Formatting & Principles Audit

Run project quality checks in this order:

1. **Formatter** — Auto-format all changed files using the project formatter.
2. **Linter** — Run linter on all changed files. Zero warnings allowed.
3. **Type checker** — Run full type check. Zero errors allowed. `bun run build` per package.
4. **Dead code** — Scan changed files for unused imports, variables, functions. Remove them.
5. **Complexity check** — Review each function you wrote against the Coding Principles: does it violate Single Responsibility, exceed 30 lines, or have nesting deeper than 3 levels? Refactor if yes.
6. **Review diff** — **Invoke `git` MCP server** (`git diff`) to review all staged changes. Confirm only intended changes are present. No debug artifacts, no commented-out code.

**Final Principles Audit — load `reference-coding-principles.md` from `{{STEPS_DIR}}/` and run every check in the Principles Audit Checklist section.**

**GenicUI-specific quality checks:**

- No `console.log` to stdout in MCP server code (stdout is MCP transport)
- All inbound payloads validated with TypeBox `Value.Check()`
- `__proto__`, `constructor`, `prototype` stripped from all inbound data
- `additionalProperties: false` on all TypeBox schemas
- `fast-json-patch` called with `{ mutate: false }`
- No `any` types anywhere (ESLint enforced)
- All AG-UI events follow the enumerated 14-event spec
- WebSocket frames use monotonic `seq: uint64`
- API key validation: `gnc_live_<32>` format, Bearer header
- Web Components use closed Shadow DOM
- Events forwarded with `composed: true, bubbles: true`

**Note:** These checks are mandatory even if Steps 10–11 passed — they catch code quality issues that tests do not cover.

**Gate:** Do not commit until all 6 quality checks pass and the principles audit is clean.

**Error recovery:** IF linter or type checker produces errors, THEN fix each before committing. IF the fix requires structural changes, THEN re-run the relevant Step 10–11 tests after fixing to confirm no regressions.
