---
step: 5
title: Plan Page Outline + IA Fit
phase: Content Sourcing
---

# Step 5: Plan Page Outline + IA Fit

Read `reference-coding-principles.md` first — then plan the page tree.

**For each page you will author:**

1. **Title** (matches frontmatter `title:`)
2. **Description** (≤ 160 chars, for SEO + OG)
3. **IA placement** — which folder under `examples/docs/content/`
4. **Outline** — H2 / H3 headings in order
5. **MDC components** — pre-decide which MDC blocks each section needs
6. **Code snippets** — list which command/API/JSON examples will appear
7. **Cross-links** — internal links to other docs pages
8. **Smoke-test contribution** — which milestone smoke test this page must keep green

**Invoke `sequential-thinking` MCP** if the IA placement or section scope is genuinely ambiguous (e.g., Concepts section splitting). Otherwise, write the plan inline in your response.

**Write the plan to `memory` MCP** under key `"GenicUI — {{TASK_ID}} Documentation Plan"`. This survives context compaction.

**Gate:** IF the page tree would put two pages at the same URL, THEN re-think IA — Docus will fail the build on duplicate routes.

**Return:** the page outline as a structured list (one entry per page).