---
title: Key Files
---

# Key Files (Read Map)

| Path | Purpose | Read when |
|---|---|---|
| `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/milestone-05.1.md` | Milestone scope + smoke tests | Step 2 |
| `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-{{TASK_ID}}-*.md` | Per-task ACs + sub-tasks | Step 2 |
| `examples/docs/nuxt.config.ts` | Docus layer wiring | Any nuxt edit |
| `examples/docs/app/app.config.ts` | Nuxt UI v4 brand config | Step 6 (when theme-relevant) |
| `examples/docs/content.config.ts` | Nuxt Content v3 collections | Any content authoring |
| `examples/docs/content/**/*.md` | All authored pages | Authoring steps |
| `examples/docs/.navigation.yml` | IA tree | Step 5, 6 |
| `packages/*/src/**/*.ts` | Source-of-truth for API reference | Step 3 (API ref task only) |
| `registries/primevue/registry.json` | Source-of-truth for registry reference | Step 3 (API ref task only) |
| `package.json` (root) | Workspace declaration | T1 only |