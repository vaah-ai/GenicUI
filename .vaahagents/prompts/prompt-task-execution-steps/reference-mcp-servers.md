---
title: MCP Servers Reference
purpose: Available MCP servers and when to use each
---

# MCP Servers

| Server | Purpose | When to Use |
| ------ | ------- | ----------- |
| `filesystem` | Local file system operations (read, write, list, search) | Every step — file discovery, reading source code, writing new files. Use `read`, `write`, `edit`, `find`, `grep`. |
| `git` | Git operations (branches, commits, diff, status, log) | Step 1 (create branch), Step 12 (diff review), Step 15 (commit). Always use git MCP over Bash. |
| `memory` | Persistent knowledge graph (search, create, update entities) | Step 0 (load context), Step 6 (save plan), Step 13 (persist learnings). Back up on-the-fly discoveries. |
| `sequential-thinking` | Multi-step reasoning with revision support | Step 3 (research), Step 4 (architectural decisions), Step 6 (plan decomposition). |
| `gitnexus` | Code knowledge graph (query, context, impact, cypher) | Step 2 (understand codebase), Step 4 (related code analysis), step 6 (impact assessment). |
| `playwright` | Browser automation (navigate, click, fill, screenshot, snapshot) | Step 9 (UAT sweep), Step 11 (E2E tests). Also for capturing UI screenshots in Step 5. |
| `llmkb` / `llmkb-local` | Knowledge base spaces (search, read, write, entities, graph) | Step 0 (load project context), Step 2 (read feature specs), Step 13 (persist knowledge). |
| `context7` | Official documentation lookup (any library/framework) | Step 3 (research technologies). Use to fetch current docs before writing code. |
