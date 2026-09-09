---
description: Execute GenicUI documentation-site tasks for M5.1
version: 1.0
auto_execution_mode: 3
generated_by: task-execution-generator@2.13
generated_at: 2026-09-08
---

# GenicUI Documentation Task Execution Prompt

## Purpose

Author documentation-site pages, sections, and infrastructure for milestone M5.1 by loading per-step instructions on-demand from `{{STEPS_DIR}}/step-{NN}-{slug}.md`. This file is the orchestrator — each step's detailed instructions live in its file, loaded one at a time.

## Variables

- **`{{TASK_ID}}`** _(dynamic)_ — Task ID from M5.1 (M5.1-T1 … M5.1-T12).
- **`{{FEATURE_BRANCH}}`** _(dynamic)_ — Git branch. Pattern: `feature/M5.1-T{n}-short-description` from `develop`.
- **`{{DOCS_SITE_DIR}}`** _(static)_ — `docs/` — Docus 5.13.0 layer (sibling to `examples/playground/`).
- **`{{CORPUS_DIR}}`** _(static)_ — `.vaahagents/requirements/` — reconciled source corpus (F68+).
- **`{{SPECS_DIR}}`** _(static)_ — `.vaahagents/requirements/specs/` — locked feature specs.
- **`{{PACKAGES_DIR}}`** _(static)_ — `packages/` — source-of-truth for API reference (core, server, client, vite-plugin, agent-bridge).
- **`{{REGISTRIES_DIR}}`** _(static)_ — `registries/primevue/` — source-of-truth for registry reference.
- **`{{PROMPT_FILE_PATH}}`** _(static)_ — `.vaahagents/prompts/prompt-documentation-task-execution.md`
- **`{{STEPS_DIR}}`** _(static)_ — `.vaahagents/prompts/prompt-documentation-task-execution-steps/`

---

## How to Follow This Workflow

1. **Read this file completely** to understand the orchestrator.
2. **Read the WORKFLOW table below** to identify the current step from your TodoWrite list.
3. **Load ONLY the current step file** from `{{STEPS_DIR}}/step-{NN}-{slug}.md`.
4. **Follow ONLY the loaded step's instructions exactly** — do not proceed to the next step.
5. **When the current step is complete**, return here, load the NEXT step file in sequence.
6. **Never load multiple step files at once.**

**Strict sequential execution:** Complete each step before moving to the next. Never skip steps.
**Reference files:** Load `{{STEPS_DIR}}/reference-{topic}.md` when a step instructs you to.

---

## Instructions (Global — Applies to All Steps)

### Re-read Rule

- IF this is a new session OR `{{TASK_ID}}` has changed, THEN re-read this file **completely**. This file wins over memory cache.

### Tool-First Rule

- Use **Read** for files (never `cat`/`head`/`tail`), **Edit** for modifications (never `sed`/`awk`), **Write** for new files (never `echo >`), **Glob/Grep** for search (never `find`/`ls`/`rg`). Use **Bash** only for actual shell operations.

### Skills — Invoke When Relevant

| Skill | When |
|---|---|
| `nuxt` | Before editing `nuxt.config.ts`, layers, or Nuxt 4 wiring in `{{DOCS_SITE_DIR}}` |
| `nuxt-content` | Before authoring markdown for Docus, configuring collections, or querying content |
| `nuxt-seo` | Before adding SEO modules, `llms.txt`, sitemap, or OG metadata |
| `tailwind-css-patterns` / `tailwind-design-system` | Before styling Nuxt UI v4 components or custom prose |
| `nuxt4-patterns` | Before touching any Nuxt 4–specific API in the Docus layer |
| `vercel:deploy` / `vercel:env` / `vercel:deployments-cicd` | M5.1-T12 only — Vercel wiring |
| `web-perf` | Before claiming a Lighthouse ≥ 90 score; run a perf audit |
| `code-review` | Optional after authoring — review the diff before committing |

### MCP Servers — Use When Relevant

| Server | Purpose | When |
|---|---|---|
| `context7` | Current Docus, Nuxt UI v4, Nuxt Content v3, Nuxt SEO docs | When syntax or config schema is uncertain |
| `filesystem` | Bulk doc-tree ops, read `{{CORPUS_DIR}}` cleanly | Step 2 (corpus reconciliation) |
| `git` | Branch, commit, PR for docs work | All authoring steps |
| `memory` | Persist IA decisions, brand placeholders, link patterns | Cross-session docs continuity |

### GenicUI Patterns

- **Workspace layout:** `docs/` is the docs site. Top-level `docs/` is the legacy requirements tree — never write docs there.
- **No PoC:** Per `CLAUDE.md`, `poc/` is proof-of-concept only. Doc-site code is fresh against Docus 5.13.0 + Nuxt UI v4 (MIT).
- **Naming:** kebab-case for files and routes (`getting-started/introduction.md`).
- **Content collections:** Docus bundles Nuxt Content v3 — use `queryCollection()` (never legacy `queryContent()`).
- **TypeScript strict mode** for any `.ts` in `{{DOCS_SITE_DIR}}/` (e.g., `app.config.ts`).
- **ESM modules only.**
- **Nuxt UI v4 MIT** — never `@nuxt/ui-pro`. Verify `bun pm ls` shows no Pro license.
- **MDC components:** Use Nuxt Content v3 MDC syntax (`::callout`, `::code-group`, etc.) — confirm Docus-supported list before authoring.
- **llms.txt + raw:** Every public page must be reachable via `llms.txt`, `llms-full.txt`, `/raw/*.md`, and `Accept: text/markdown`.
- **Git commit convention:** `docs(M5.1-T{n}): Brief description` with bullet body and `Refs: .vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T{n}-*.md`.
- **Git branch convention:** `feature/M5.1-T{n}-short-description` from `develop` (Gitflow).
- **Trust boundary:** N/A — static content, no MCP/WS input, no registry input. No `additionalProperties: false` surface needed.
- **No new `packages/*` deps.** Doc-site work lives entirely under `docs/`.

### Blast Radius

- File edits, dev-server runs, and `bun --filter docs build` are freely taken — no confirmation needed.
- Vercel deploys (preview + production), branch deletions, and force-pushes require user confirmation — each independently.
- Preview deploys are cheap; production deploys are durable — confirm before promoting.

### Faithful Reporting

- Report build/serve failures honestly — do not claim "docs render" on a broken build.
- Label unverified items `manual-verified` in the Report.
- Never suppress lint errors, broken-link warnings, or Lighthouse regressions to manufacture a green result.
- For SEO/llms.txt/`Accept: text/markdown` flows, curl the live URL and paste the status code.

> **Context recovery:** If compacted, read the TodoWrite list to find the last `completed` step. Load `memory` MCP entry for `"GenicUI — {{TASK_ID}} Documentation Plan"`. Resume from the next `pending` step.

---

## Workflow

Load `{{STEPS_DIR}}/step-{NN}-{slug}.md` for each step. Follow it exactly. Never load multiple.

| Phase                              | Steps  | Step Files                                         |
| ---------------------------------- | ------ | -------------------------------------------------- |
| **Phase 1: Orientation**           | 0–2    | `step-00` → `step-02`                              |
| **Phase 2: Content Sourcing**      | 3–5    | `step-03` → `step-05`                              |
| **Phase 3: Authoring**             | 6–7    | `step-06` → `step-07`                              |
| **Phase 4: Polish & Publish**      | 8–11   | `step-08` → `step-11`                              |

**Reference files** (load when a step instructs you to):

| File | Purpose |
|---|---|
| `reference-role.md` | Your role + scope boundaries |
| `reference-key-files.md` | Read map for docs-relevant paths |
| `reference-tech-stack.md` | Docus 5.13.0 + Nuxt UI v4 + Nuxt Content v3 stack |
| `reference-skills.md` | Skills to invoke per area |
| `reference-mcp-servers.md` | MCP server usage map |
| `reference-codebase-structure.md` | Repo tree slice for docs work |
| `reference-coding-principles.md` | Authoring rules (voice, frontmatter, MDC, a11y, SEO) |
| `reference-project-context.md` | GenicUI framing + 5 packages + 1 registry |

**Independent workflow script:** `workflow-documentation-task-execution.js` (sibling to this file) — runs the same 12 steps as parallel `agent()` calls with shared context threading. Use it for multi-agent fan-out; use this prompt's table for single-agent sequential execution.

---

## Report

```
## Documentation Task Completion Report
- **Task:** {{TASK_ID}} — [Task title]
- **Branch:** {{FEATURE_BRANCH}}
- **Status:** 🟢 Complete | 🔵 Blocked | 🟠 Partial
- **Changes:** [List of files created/modified under {{DOCS_SITE_DIR}}/]
- **Build:** [Pass/Fail — `bun --filter docs build` output]
- **Verification:** [What was verified vs `manual-verified`]
- **Memory Updated:** [List of entries]
- **Notes:** [Decisions, IA choices, MDC patterns, follow-ups, skipped steps with justification]
```

## Progress Tracker (TodoWrite)

At the start of each task (Step 0), invoke **TodoWrite** with the full step list. This survives compaction.

**Rules:** Only ONE step `in_progress` at a time. Mark `completed` immediately. Never batch.

**Invoke TodoWrite at Step 0 with this data:**

```json
[
  { "content": "Step 0: Load Session Context", "activeForm": "Loading session context", "status": "in_progress" },
  { "content": "Step 1: Create Feature Branch", "activeForm": "Creating feature branch", "status": "pending" },
  { "content": "Step 2: Read Task Spec + Smoke Tests", "activeForm": "Reading task spec and smoke tests", "status": "pending" },
  { "content": "Step 3: Source Content from Corpus", "activeForm": "Sourcing content from corpus", "status": "pending" },
  { "content": "Step 4: Verify Library Syntax via context7", "activeForm": "Verifying library syntax via context7", "status": "pending" },
  { "content": "Step 5: Plan Page Outline + IA Fit", "activeForm": "Planning page outline and IA fit", "status": "pending" },
  { "content": "Step 6: Author Markdown + MDC", "activeForm": "Authoring markdown and MDC components", "status": "pending" },
  { "content": "Step 7: Configure Components / SEO / llms", "activeForm": "Configuring components, SEO, llms", "status": "pending" },
  { "content": "Step 8: Build + Preview Verification", "activeForm": "Running build and preview verification", "status": "pending" },
  { "content": "Step 9: Link Check + Accessibility Audit", "activeForm": "Running link check and accessibility audit", "status": "pending" },
  { "content": "Step 10: Update Memory + Project Context", "activeForm": "Updating memory and project context", "status": "pending" },
  { "content": "Step 11: Completion Audit + Git Commit", "activeForm": "Auditing completion and committing", "status": "pending" }
]
```

**Transition:** Mark current step `in_progress` → complete → move to next `pending`.
**Recovery:** Read todo list after compaction — resume from next `pending` step.