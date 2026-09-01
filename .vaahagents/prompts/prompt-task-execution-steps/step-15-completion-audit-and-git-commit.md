---
step: 15
title: Completion Audit & Git Commit
phase: Completion
---

# Step 15: Completion Audit & Git Commit

**MANDATORY — Verify that ALL previous steps were actually completed, not just assumed done. Then finalize the task and commit.**

## Part A: Workflow Completion Audit

Complete this checklist before declaring the task finished:

| Step | Verification Question | Status | Skipped Reason |
| ---- | --------------------- | ------ | -------------- |
| **0** | Was session context loaded? Were memory entries read? Was TodoWrite initialized? |  |  |
| **1** | Was the feature branch created from `develop`? Is it up-to-date? |  |  |
| **2** | Was task scope understood? Were feature specs, architecture, and security docs read? |  |  |
| **3** | Were relevant technologies researched? Were appropriate skills invoked? |  |  |
| **4** | Was related code analyzed? Were existing patterns noted? |  |  |
| **5** | Was UI/UX planned? Were all design skills invoked? |  |  |
| **6** | Was an implementation plan written and saved to memory? |  |  |
| **7** | Was the plan audited against principles and presented to the user? |  |  |
| **8** | Was the task implemented following the plan and layer-ordered sequence? |  |  |
| **9** | Was UAT run with Playwright? Were all ACs verified? Were bugs fixed? |  |  |
| **10** | Were unit and integration tests written? Do they pass? Are coverage targets met? |  |  |
| **11** | Were E2E tests written? Do they pass twice (deterministic)? |  |  |
| **12** | Were all 6 quality checks passed? Is the principles audit clean? |  |  |
| **13** | Was AI memory updated with patterns, decisions, and lessons? |  |  |
| **14** | Were project context files and documentation updated? |  |  |

**IMPORTANT — Do not skip earlier steps and assume they were done.** Each step (0-14) must have been executed by loading its individual step file from `{{STEPS_DIR}}/step-{NN}-{slug}.md` and following its instructions. If you did NOT load and execute a step file, mark it `❌ Missing` — do not retroactively claim it was completed.

**Status values:**
- `✅ Completed` — Step was fully executed and verified.
- `⏭️ Skipped` — Step was intentionally skipped. **A reason MUST be provided in the "Skipped Reason" column.**
- `❌ Missing` — Step was not executed and no justification exists.

**IF any step shows ❌:**

1. **STOP** — do not finalize the task
2. Go back and complete the missed step(s)
3. Re-run this audit after completing them
4. Only mark complete when ALL steps show `✅` or `⏭️` (with a valid reason)

Present the completed audit table to the user.

> "Workflow Completion Audit: All steps verified. Task `{{TASK_ID}}` is fully complete."

IF a step was skipped with explicit user permission, mark it `⏭️ Skipped (user approved)` instead of `❌`.

**Valid skip reasons (examples):**
- "Not applicable — backend-only task, no UI/UX to plan" (Step 5)
- "No external research needed — existing patterns suffice" (Step 3)
- "Backend-only task — no frontend UI to test with Playwright. Unit tests (Step 10) cover all AC" (Step 11)

**GATE:** Do NOT commit until the user has seen the completed audit table. The audit is a gate, not a post-commit formality. Present the table first, wait for the user to acknowledge before proceeding to Part C.

## Part B: Notify Completion

Notify the user:

> "Task `{{TASK_ID}}` is complete on branch `{{FEATURE_BRANCH}}`. Ready to merge when you're ready."

## Part C: Git Commit

**Only proceed to Part C AFTER the user has reviewed the audit table in Part A and acknowledged it.**

**Invoke `git` MCP server:**

- Stage all changes.
- Write commit message following the project's commit convention:

  ```
  feat(F{N}): [{{TASK_ID}}] Brief description of changes

  - Specific change 1
  - Specific change 2

  Refs: docs/specs/features/feature-{N}.md
  ```

- Commit locally. Do NOT push without user confirmation.
