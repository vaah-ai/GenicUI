# GenicUI — Instructions for AI Agents

## Do Not Use PoC Code in Production

The `poc/` directory contains **proof-of-concept prototype code only**. It validated the original design decisions but must **never** be copied into, imported from, or used as a basis for production code in `packages/`.

- **Production code lives in `packages/`** — always implement new features there.
- **Reference only** — you may read `poc/` to understand design intent or original assumptions, but do not copy its files, patterns, or code.
- The production codebase uses TypeScript (`.ts`), proper ESM package structure, and follows the architecture documented in `docs/specs/`.

When working on a task:
1. Read `docs/specs/features/` for the authoritative feature specifications.
2. Read existing production code in `packages/` for patterns and conventions.
3. Ignore `poc/` unless you need historical context about why a decision was made.
