---
step: 3
title: Source Content from Corpus
phase: Content Sourcing
---

# Step 3: Source Content from Corpus

Sourcing depends on which task you are authoring:

| Task | Source from |
|---|---|
| M5.1-T1, T3, T11, T12 | Code/config under `examples/docs/` + `package.json` |
| M5.1-T2 | `.vaahagents/requirements/` (full corpus reconciliation) |
| M5.1-T4 (Landing) | Memory + `README.md` at repo root |
| M5.1-T5 (Getting Started) | `README.md` + 1–2 representative examples in `examples/playground/` |
| M5.1-T6 (Concepts) | `.vaahagents/requirements/specs/` (core concepts sections) |
| M5.1-T7 (Guides) | `.vaahagents/requirements/specs/` + `examples/playground/` patterns |
| M5.1-T8 (API Reference) | `packages/*/src/**/*.ts` + `registries/primevue/registry.json` |
| M5.1-T9 (Cookbook) | Existing patterns in `examples/playground/` + PoC lessons in `.vaahagents/idea/` |
| M5.1-T10 (Deployment) | M6-T1/T2/T4 specs + Vercel/Cloudflare docs |

**Invoke `filesystem` MCP server** to bulk-read sources. Read up to 20 files in parallel per `read_many` call.

**For API Reference (T8):** Use `grep` MCP equivalent to find every `export` in `packages/*/src/`. The set of exports IS the page list — never paraphrase.

**Quote verbatim** from source — copy-paste the exact TypeScript signatures, command syntax, and error messages. Do not paraphrase.

**Note cross-references inline:** when a page cites a spec, capture the link path so Step 7 can wire it.

**Return:** a structured outline — heading per source page, bullet per reusable asset (code snippet, diagram, table).