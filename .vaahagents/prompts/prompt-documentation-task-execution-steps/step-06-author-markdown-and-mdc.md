---
step: 6
title: Author Markdown + MDC
phase: Authoring
---

# Step 6: Author Markdown + MDC

**For granular sub-step tracking within this step, create additional TodoWrite items** (e.g., `step-06a-write-landing`, `step-06b-write-getting-started`) — one per page.

Mark exactly ONE item `in_progress` at a time. Mark `completed` immediately after each page — never batch.

**Use Read** to verify an existing page before editing. Use **Write** to create new pages. Use **Edit** for in-place tweaks. Never use Bash for file ops.

**Frontmatter required on every page** (per `reference-coding-principles.md`):

```yaml
---
title: ...
description: ...
navigation:
  title: ...
  icon: i-lucide-...
---
```

**Authoring order — follow this sequence:**

1. **Index pages** first (`landing`, `getting-started/index`, etc.) — they establish the IA frame
2. **Concept pages** second — they justify the IA ordering
3. **Guide / API pages** third — they consume the conceptual vocabulary
4. **Cookbook** fourth — recipes depend on everything before
5. **Cross-link cleanup** last — wire all internal links

**Invoke skills per area:**

- `nuxt-content` before authoring any markdown (collection config, queryCollection patterns)
- `tailwind-css-patterns` before custom MDC styling
- `nuxt-ui` for any component embedded in MDC

**Gate per page:** After writing each page, run:

```bash
bun --filter docs dev
```

Then `curl -s http://localhost:3000/<path>` to confirm it renders. Kill the dev server before the next page.

**CRITICAL constraints:**

- Every page must work with `Accept: text/markdown` (test in Step 8).
- Every page is reachable via `/raw/*.md` (Docus convention).
- Never reference `poc/` — per `CLAUDE.md`.
- Never copy code from `poc/` — quote from `packages/*/src/` verbatim.

**Return:** a concise list of files created with one-line summary per file.