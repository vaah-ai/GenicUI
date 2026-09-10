---
step: 13
title: Update AI Memory & Cache
phase: Completion
---

# Step 13: Update AI Memory & Cache

**Invoke `memory` MCP server** to persist session knowledge for future task sessions:

Create or update entries:

- `"GenicUI — Patterns Established"`: New patterns, components, or abstractions introduced in this task.
- `"GenicUI — Decisions Made"`: Architectural or implementation decisions and their rationale.
- `"GenicUI — Lessons Learned"`: Errors encountered, root causes, and fixes applied.
- `"GenicUI — {{TASK_ID}} Complete"`: Summary of what was done, files changed, test results.

These entries are the agent's persistent project cache — they reduce ramp-up time for future task sessions and prevent repeating the same mistakes.

**Tags:** `genicui`, `task-execution`, `prompt-generation`, `{{TASK_ID}}`
