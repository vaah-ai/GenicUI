---
step: 10
title: Update Memory + Project Context
phase: Polish & Publish
---

# Step 10: Update Memory + Project Context

## Update memory MCP

Persist:

- **IA decisions** — which folder structure was chosen and why (so a follow-up task doesn't reshuffle).
- **Brand placeholders** — colors, fonts, radii used in `app.config.ts` (so T4 polish and downstream don't conflict).
- **MDC component inventory** — which Docus/Nuxt Content MDC blocks were used and any quirks discovered.
- **Smoke-test history** — which milestone smoke tests passed and which are still `manual-verified`.
- **Cross-ref patterns** — how spec links resolve, so future tasks reuse the convention.

Use the `memory` MCP `add_observations` tool with `entityName: "GenicUI — M5.1"` and `entityName: "GenicUI — {{TASK_ID}} Documentation Plan"`.

## Update project context files

If this task established a **pattern** other docs tasks should follow (e.g., the MDC callout syntax, the frontmatter convention, the `nuxt-seo` route rules), update:

- `docs/README.md` (if it exists) — quick-start notes
- This prompt's `reference-coding-principles.md` — codify the pattern
- This prompt's `reference-key-files.md` — add new file paths

**Gate:** IF you don't have evidence the pattern is reusable, THEN do NOT codify it. Leave it in memory only.

**Return:** list of memory entries created + project-context files updated.