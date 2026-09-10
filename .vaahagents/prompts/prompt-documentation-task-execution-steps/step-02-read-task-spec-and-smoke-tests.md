---
step: 2
title: Read Task Spec + Smoke Tests
phase: Orientation
---

# Step 2: Read Task Spec + Smoke Tests

Read in parallel:

- `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-{{TASK_ID}}-*.md` — full task spec (AC, sub-tasks, dependencies, references)
- `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/milestone-05.1.md` — re-read the **Smoke Test** section

Return a concise summary of:

1. **Acceptance Criteria** (numbered list — paste verbatim, don't paraphrase)
2. **Sub-tasks** (table)
3. **Dependencies** (what blocks this, what this blocks)
4. **Smoke tests** this task contributes to (from the milestone file)

**Gate:** IF the task spec file is missing, THEN stop and ask the user to verify the milestone folder is intact.

**Gate:** IF `{{TASK_ID}}` is `M5.1-T12` (Vercel deploy), THEN this task requires external coordination — confirm Vercel access before proceeding.