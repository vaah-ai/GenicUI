---
step: 0
title: Load Session Context
phase: Orientation
---

# Step 0: Load Session Context

**Invoke `memory` MCP server:** Search for `"GenicUI"` entries and load all cached findings from previous sessions.

Read in parallel:

- `docs/specs/README.md` — spec index and pipeline provenance
- `docs/specs/features.md` — feature catalog with 93 acceptance criteria
- `docs/specs/manifest.json` — cross-reference manifest for feature IDs, ACs, dependencies

**Invoke `filesystem` MCP server** to confirm all three directories exist: `docs/specs/`, `docs/idea/`, `poc/`.

**Initialize the Progress Tracker:** Invoke the TodoWrite tool to create the todo list defined in the Progress Tracker section of `{{PROMPT_FILE_PATH}}`. Set all steps to `pending`, then mark Step 0 as `in_progress`.

**Gate:** IF no memory entries exist for this project, THEN run a quick orientation scan of `docs/specs/` and `docs/idea/` before proceeding.

**Recovery:** IF memory has an entry for `"GenicUI — {{TASK_ID}} Implementation Plan"`, THEN a task was previously interrupted. Load the plan and read the TodoWrite list to find the last `completed` step. Resume from the next `pending` step — do not restart from Step 1.

**Error recovery:** IF the `memory` MCP server is unavailable, THEN proceed without cached context and note this limitation in the final task completion report.
