---
step: 9
title: Automated UAT & Bug Fixes
phase: Execution
---

# Step 9: Automated UAT & Bug Fixes

**Goal:** Verify every acceptance criterion through frontend UI automation and fix all defects before proceeding to test authoring.

**GATE — DO NOT SKIP.** Every task must be verified. There is no "skip" path for this step. If the dev server won't start, the app won't build, the backend is down, ports are blocked, or dependencies are missing, THEN those ARE the bugs to fix. Fix them first, then run the sweep.

**Errors are not a reason to skip — they are the work.** Build failures, runtime crashes, missing dependencies, port conflicts, Docker issues, database connection errors, or broken routes are all defects discovered by this step. Enter Phase B (bug fix loop) to resolve each one before continuing.

**Use Playwright MCP server** for the entire sweep. If the Playwright MCP server is not available, install or configure it before proceeding.

## Phase A — Infrastructure Readiness

1. **Free blocked ports** — if ports are blocked (8080, 9876, 9877), free them first (`lsof -i :{port}`, `kill {PID}`).
2. **Start the MCP server** — run `bash start.sh` or `npm run poc` from the project root.
   If it fails, diagnose and fix the root cause.
3. **Verify the server is reachable** — `curl http://localhost:9877` should respond.
4. **Verify the chat surface is reachable** — `curl http://localhost:8080/poc/web/` should return 200.

## Phase B — Automation sweep

For each acceptance criterion from the feature spec:

1. Navigate to the relevant URL: `playwright navigate <url>`
2. Take an accessibility snapshot: `playwright snapshot`
3. Drive the flow — click, fill, select, submit
4. Capture evidence: `playwright screenshot /tmp/<flow>.png`
5. Check console: `playwright console_messages` — zero errors
6. Check network: `playwright network_requests` — zero 4xx/5xx

Cover: happy path, edge cases, cross-component interactions, auth-gated paths.

## Phase C — Bug fix loop

WHILE any acceptance criterion remains unverified OR errors detected:

1. **Document the bug** — expected vs actual, reproduction steps, evidence
2. **Diagnose root cause** — read source files; check console / network logs
3. **Implement fix** — minimal change; run typecheck immediately after edit
4. **Regression test** — re-run the affected flow; verify zero errors
5. **Cascade check** — IF fix touched shared code, re-run ALL critical flows

**Error recovery (Pattern 5):**

- IF a fix introduces a new error → revert and re-diagnose. Never layer fixes.
- IF unable to find root cause after 3 attempts → escalate to user.
- IF bug is in an external dependency → document workaround and continue.

## Gate

**DO NOT proceed to Step 10 until ALL of the following are true:**

- Every acceptance criterion verified through the Playwright browser sweep
- Zero console errors on every tested page
- Zero network errors (4xx/5xx) on every tested page
- Visual correctness confirmed (screenshots taken for each flow)
- The bug fix loop has run to completion (no open bugs)

If any condition is not met, stay in this step and fix the issue. Do not move on.
