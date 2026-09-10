---
step: 11
title: Completion Audit + Git Commit
phase: Polish & Publish
---

# Step 11: Completion Audit + Git Commit

## Completion Audit

Run through this checklist **before** committing:

- [ ] Every acceptance criterion from Step 2 is verified (`✅` or `manual-verified`).
- [ ] `bun --filter docs build` exits 0 from a clean working tree.
- [ ] `bun --filter docs lint` exits 0 (or zero warnings).
- [ ] No `console.log` / `debugger` left in any new file.
- [ ] No `poc/` references in any new file.
- [ ] No `TODO`/`FIXME` markers left (use the task issue tracker instead).
- [ ] No edits to `packages/*` source — docs work stays under `docs/`.
- [ ] Frontmatter present on every new page (`title`, `description`).
- [ ] Internal links resolve; external links alive.
- [ ] Lighthouse ≥ target scores on every new page (or `manual-verified`).

If anything fails, fix it. Do NOT batch-fix later — fix now.

## Present to User

Show the audit results + the diff summary. **Wait for explicit user acknowledgment** before proceeding to commit. Match scope: user approval to commit doesn't authorize push.

## Git Commit

```bash
git add docs/ .vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-{{TASK_ID}}-*.md
git status   # verify only intended files
git commit -m "docs(M5.1-T{n}): <imperative summary>

- <bullet per file or section>
- <bullet per verification passed>
- <bullet per memory entry created>

Refs: .vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T{n}-*.md"
```

**DO NOT push.** Push is a separate user-confirmed action (per blast-radius rules).

## Return

The final completion report in the format defined in `{{PROMPT_FILE_PATH}}`:

```
## Documentation Task Completion Report
- **Task:** {{TASK_ID}} — [title]
- **Branch:** {{FEATURE_BRANCH}}
- **Status:** 🟢 Complete | 🔵 Blocked | 🟠 Partial
- **Changes:** [list]
- **Build:** Pass/Fail
- **Verification:** [per-AC + Lighthouse scores]
- **Memory Updated:** [entries]
- **Notes:** [decisions, IA, MDC patterns, follow-ups]
```