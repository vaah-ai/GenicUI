---
title: MCP Servers
---

# MCP Servers — Use When Relevant

| Server | Purpose | When |
|---|---|---|
| `context7` | Current Docus, Nuxt UI v4, Nuxt Content v3, nuxt-seo docs | When syntax or config schema is uncertain |
| `filesystem` | Bulk doc-tree ops (`find`, `grep`, `read_many`) | Step 3 (corpus sourcing) |
| `git` | Branch, commit, PR, diff for docs work | All authoring steps |
| `memory` | Persist IA decisions, brand placeholders, link patterns, smoke-test history | Cross-session docs continuity |
| `sequential-thinking` | Decompose IA/page-outline decisions for non-trivial sections (T6–T8) | Step 5 if structure is non-obvious |
| `playwright` | Screenshot pages after build, verify rendered output | Step 8, 9 |

**Rule:** Resolve a Context7 library ID once per session (Docus + Nuxt UI v4 + nuxt-seo) before querying docs.