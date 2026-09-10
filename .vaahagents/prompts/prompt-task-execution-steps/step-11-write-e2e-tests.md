---
step: 11
title: Write E2E Tests
phase: Execution
---

# Step 11: Write E2E Tests

**Invoke the `playwright` skill** before writing E2E tests.

## Phase A — E2E Tests with Playwright

Codify the flows verified in Step 9 into deterministic Playwright tests.

For each acceptance criterion with a frontend UI:

- Create or extend a `.spec.ts` file in the project's E2E test directory
- Use `page.getByRole` / `page.getByTestId` selectors (avoid CSS / XPath)
- Cover: happy path, primary edge case, primary error path
- Use `await expect(...).toBeVisible()` style assertions — not snapshot-only
- Use Page Object Model if the project already uses it; otherwise inline

For the GenicUI full-flow E2E test, verify:

1. Agent calls `find_ui_component({ query: "data table" })` → returns DataTable
2. Agent calls `render_component({ name: "DataTable", props: { rows: [...] } })` → table appears in browser
3. Agent calls `update_component({ patch: [...] })` → table updates in place (no remount, no flicker)
4. User clicks a row → agent receives `{ action: "row_selected", detail: { rowId: "..." } }`

Run locally:

```bash
npx playwright test
```

Run twice to confirm determinism. Fix flakes; never `test.skip` / `test.fixme` to mask flakes.

**Gate:** Do NOT proceed to Step 12 until:

- All Playwright E2E tests pass twice in a row (deterministic)
- All tests written in Step 10 still pass (regression check)

**Error recovery:** IF a test fails, fix the **code** if the failure is a real regression. Fix the test only if the assertion was wrong. Never silence.

## Skip Condition

IF this project has no frontend UI, then E2E tests are not applicable. Mark this step as ⏭️ Skipped with reason "Backend-only task — no frontend UI to test with Playwright. Unit/integration tests (Step 10) cover all AC."

**IF Playwright test infrastructure does not exist** (no `playwright.config.ts`, no `e2e/` directory), THEN:

1. **Do NOT skip this step.** Instead, plan a new task for setting up the test infrastructure.
2. **Use `.vaahagents/prompts/prompt-ai-milestones-tasks-planner.md`** to create the new task.
3. **Write the Playwright test scripts anyway** — write the `.spec.ts` files even if they can't run yet.
4. Document the new task reference in the completion report.
