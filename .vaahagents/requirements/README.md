# GenicUI Requirements Corpus

> Canonical home for all GenicUI planning artefacts (specs, ideas, locked decisions, archived snapshots).
> Migrated from `docs/{specs,idea,requirements}/` to `.vaahagents/requirements/{specs,idea,_archive}/` in M5.1-T2 (2026-09-09).
> Replaces the prior split tree (now under `.vaahagents/requirements/_archive/`) with a single source-of-truth at the canonical locations.

## Layout

| Path | Role |
|---|---|
| `.vaahagents/requirements/specs/` | Authoritative feature specs, manifest, roadmap, glossary. |
| `.vaahagents/requirements/idea/` | Authoritative research, locked decisions, consolidated requirements, FAQs. |
| `.vaahagents/requirements/_archive/` | Frozen pre-reconciliation snapshot of the spec + idea trees. Read-only history. |

## Why an archive?

The pre-reconciliation snapshot (`.vaahagents/requirements/_archive/`) was the pipeline prompt's frozen snapshot of the corpus, built before the canonical `specs/` and `idea/` subtrees were promoted. It's preserved in `_archive/` so:

1. Every file in `_archive/` retains its full `git log --follow` history (the move was a `git mv`, not delete-then-add).
2. Reviewers can diff any archived spec against its canonical successor to see what changed and why.
3. The corpus stays a single tree — no split between "live" and "history" at the top level.

## What's NOT here

- **`docs/superpowers/`** — left in place at the repo root. Contains one playground design note. Out of scope for M5.1-T2 — move in a follow-up task if needed.
- **`docs/ai-base-prompts/`** — pipeline prompt inputs that produced these specs. Not a requirements artefact; remains at the repo root.
- **`poc/`** — proof-of-concept code per `CLAUDE.md`. Never a corpus source.

## Cross-references

- Migration report (this commit): [`.vaahagents/requirements/_archive/ref-rewrite-map.json`](./_archive/ref-rewrite-map.json)
- Plan / source-of-truth for the migration: `.vaahagents/milestones-and-tasks/milestone-05.1-documentation-site/task-M5.1-T2-corpus-reconciliation.md`

## One-time artefact

This README is a one-time orientation document per the M5.1-T2 spec. After T8 (API Reference) finishes mining this corpus, this file may be archived alongside `_archive/`.