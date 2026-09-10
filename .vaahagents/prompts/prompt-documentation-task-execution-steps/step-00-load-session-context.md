---
step: 0
title: Load Session Context
phase: Orientation
---

# Step 0: Load Session Context

**Invoke `memory` MCP server:** Search for `"GenicUI"` and `"GenicUI — M5.1"` entries. Load any cached IA decisions, brand placeholders, link patterns, or smoke-test history from previous sessions.

Read in parallel:

- `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/milestone-05.1.md` — milestone scope, smoke tests, IA
- `docs/.navigation.yml` (if it exists) — current IA tree
- `docs/package.json` — installed doc-site deps

**Invoke `filesystem` MCP server** to confirm `docs/` exists.

**Initialize the Progress Tracker:** Invoke the TodoWrite tool with the 12-item list defined in the Progress Tracker section of `{{PROMPT_FILE_PATH}}`. Set all to `pending`, mark Step 0 `in_progress`.

**Gate:** IF `docs/` is missing AND `{{TASK_ID}}` is not `M5.1-T1`, THEN the docs site was never scaffolded — STOP and instruct the user to run the `prompt-task-execution.md` orchestrator with `{{TASK_ID}} = M5.1-T1` first.

**Recovery:** IF memory has `"GenicUI — {{TASK_ID}} Documentation Plan"`, THEN this task was previously interrupted. Load it, read TodoWrite, and resume from the next `pending` step.

**Error recovery:** IF `memory` MCP is unavailable, THEN proceed without cached context and note the limitation in the final report.