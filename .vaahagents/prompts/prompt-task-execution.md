---
description: Execute GenicUI development tasks
version: 1.0
auto_execution_mode: 3
generated_by: task-execution-generator@2.13
generated_at: 2026-09-01
---

# GenicUI Task Execution Prompt

## Purpose

Implement GenicUI development tasks by loading per-step instructions on-demand from `{{STEPS_DIR}}/step-{NN}-{slug}.md`. This file is the orchestrator — each step's detailed instructions live in its file, loaded one at a time.

## Variables

- **`{{TASK_ID}}`** _(dynamic)_ — Feature ID (F1, F2, F3, ...) or task identifier from the feature spec.
- **`{{FEATURE_BRANCH}}`** _(dynamic)_ — Git branch. Pattern: `feature/F{n}-short-description` (derived from commit convention: `feat(...)`, `fix(...)`).
- **`{{DOCS_DIR}}`** _(static)_ — `docs/` — design docs, architecture, research, requirements
- **`{{SPECS_DIR}}`** _(static)_ — `docs/specs/` — locked Testable MVP specs (29 features, 93 ACs)
- **`{{REQUIREMENTS_DIR}}`** _(static)_ — `docs/requirements/` — feature specs, acceptance criteria
- **`{{IDEA_DIR}}`** _(static)_ — `docs/idea/` — research, requirements, PoC learnings
- **`{{PROMPT_FILE_PATH}}`** _(static)_ — `.vaahagents/prompts/prompt-task-execution.md`
- **`{{STEPS_DIR}}`** _(static)_ — `.vaahagents/prompts/prompt-task-execution-steps/` — step files + reference files

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

### GenicUI Patterns

- **TypeScript strict mode:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` — enforce on every new file.
- **ESM modules only:** `"type": "module"`, `.mjs` for PoC, `.ts` for production packages. `import`/`export`, no `require()`.
- **Zero `any` types:** ESLint `@typescript-eslint/no-explicit-any` enforced — use `unknown` + narrowing.
- **Naming:** kebab-case for files, camelCase for functions/vars, PascalCase for classes/components.
- **Monorepo structure:** `packages/core`, `packages/server`, `packages/client`, `registries/primevue`, `examples/`.
- **Test colocation:** `*.test.ts` or `*.test.mjs` adjacent to source.
- **Test runner:** `bun test` for unit/integration; Playwright for E2E.
- **Typecheck command:** `bun run build` (runs `tsc` per package).
- **Lint command:** `bun run lint` (ESLint config per package).
- **JSON-Patch:** RFC 6902 ops only. `fast-json-patch` with `{ mutate: false }` — never mutate in place.
- **WebSocket protocol:** `genicui.v1` subprotocol. Single socket, up to 256 channels. Monotonic `seq: uint64` per channel.
- **API keys:** `gnc_live_<32>` for production, `gnc_test_*` for dev. Bearer header.
- **Security:** Strip `__proto__`, `constructor`, `prototype` from every inbound tool call. TypeBox `Value.Check()` on all inputs. `additionalProperties: false` in all schemas.
- **Web Components:** closed Shadow DOM. `observedAttributes: ['props-json', 'component-id']`. Forward events with `composed: true, bubbles: true`.
- **PrimeVue 4 PassThrough API:** Use PassThrough props to inject GenicUI data into PrimeVue components.
- **Git branch convention:** `feature/F{n}-short-description` from `develop` branch (Gitflow).
- **Git commit convention:** `feat(F{n}): [Task ID] Brief description` with bullet-point body and `Refs: docs/specs/features/...`.
- **Component registry naming:** `@genicul-<library>/registry` (note: `genicul`, not `genicui`).

### Blast Radius

- File edits and test runs are freely taken — no confirmation needed.
- Git pushes, branch deletions, and deploys require user confirmation — each independently.

### Faithful Reporting

- Report failures honestly — do not claim success on failing tests.
- Label unverifiable items `manual-verified` in the Report.
- Never suppress failures to manufacture a green result.
- For manual-verified flows, document exactly what was observed and what could not be automated.
- Never silence flaky tests — fix the root cause or mark with specific skip reason.

> **Context recovery:** If compacted, read the TodoWrite list to find the last `completed` step. Load `memory` MCP entry for `"GenicUI — {{TASK_ID}} Implementation Plan"`. Resume from the next `pending` step.

---

## Workflow

Load `{{STEPS_DIR}}/step-{NN}-{slug}.md` for each step. Follow it exactly. Never load multiple.

| Phase                              | Steps | Step Files                         |
| ---------------------------------- | ----- | ---------------------------------- |
| **Phase 1: Orientation**           | 0–2   | `step-00` → `step-02`             |
| **Phase 2: Preparation & Planning**| 3–10  | `step-03` → `step-10`             |
| **Phase 3: Execution**             | 11–14 | `step-11` → `step-14`             |
| **Phase 4: Completion**            | 15–18 | `step-15` → `step-18`             |

---

## Report

```
## Task Completion Report
- **Task:** {{TASK_ID}} — [Task title]
- **Branch:** {{FEATURE_BRANCH}}
- **Status:** 🟢 Complete | 🔵 Blocked | 🟠 Partial
- **Changes:** [List of files created/modified]
- **Tests:** [Pass/Fail count + commands run]
- **Verification:** [What was verified vs `manual-verified`]
- **Memory Updated:** [List of entries]
- **Notes:** [Decisions, patterns, follow-ups, skipped steps with justification]
```

## Progress Tracker (TodoWrite)

At the start of each task (Step 0), invoke **TodoWrite** with the full step list. This survives compaction.

**Rules:** Only ONE step `in_progress` at a time. Mark `completed` immediately. Never batch. Add sub-tasks for complex steps (e.g., `step-11a`).

**Invoke TodoWrite at Step 0 with this data:**

```json
[
  { "content": "Step 0: Load Session Context", "activeForm": "Loading session context", "status": "in_progress" },
  { "content": "Step 1: Create Feature Branch", "activeForm": "Creating feature branch", "status": "pending" },
  { "content": "Step 2: Understand Task Scope", "activeForm": "Understanding task scope", "status": "pending" },
  { "content": "Step 3: Research Technologies", "activeForm": "Researching technologies", "status": "pending" },
  { "content": "Step 4: Analyze Related Code", "activeForm": "Analyzing related code", "status": "pending" },
  { "content": "Step 5: Plan UI/UX Design", "activeForm": "Planning UI/UX design", "status": "pending" },
  { "content": "Step 6: Create Implementation Plan", "activeForm": "Creating implementation plan", "status": "pending" },
  { "content": "Step 7: Audit & Present Plan", "activeForm": "Auditing and presenting plan", "status": "pending" },
  { "content": "Step 8: Implement the Task", "activeForm": "Implementing the task", "status": "pending" },
  { "content": "Step 9: Automated UAT & Bug Fixes", "activeForm": "Running automated UAT and bug fixes", "status": "pending" },
  { "content": "Step 10: Write Unit and Integration Tests", "activeForm": "Writing unit and integration tests", "status": "pending" },
  { "content": "Step 11: Write E2E Tests", "activeForm": "Writing E2E tests", "status": "pending" },
  { "content": "Step 12: Code Quality & Principles Audit", "activeForm": "Auditing code quality and principles", "status": "pending" },
  { "content": "Step 13: Update AI Memory & Cache", "activeForm": "Updating AI memory and cache", "status": "pending" },
  { "content": "Step 14: Update Project Context Files", "activeForm": "Updating project context files", "status": "pending" },
  { "content": "Step 15: Completion Audit & Git Commit", "activeForm": "Auditing completion and committing", "status": "pending" }
]
```

**Transition:** Mark current step `in_progress` → complete → move to next `pending`.
**Recovery:** Read todo list after compaction — resume from next `pending` step.
