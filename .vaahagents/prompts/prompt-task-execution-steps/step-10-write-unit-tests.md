---
step: 10
title: Write Unit and Integration Tests
phase: Execution
---

# Step 10: Write Unit and Integration Tests

**MANDATORY — Unit and integration tests are NOT skippable.**

## Phase A — Integration Tests

Codify the flows verified in Step 9 into deterministic integration tests.

For each API endpoint, tool handler, or service:

- Create or extend a test file co-located with source (`*.test.ts` or `*.test.mjs`)
- Use the project's test framework (`bun test` for all packages)
- Cover: happy path, primary edge case, primary error path, auth/permission guards
- Use mock sessions where appropriate — never hit a real WebSocket or database in unit tests

## Phase B — Critical Unit Tests

**Write unit tests for:**

- Pure business-logic functions with non-trivial branches
- Validators, parsers, transformers, calculators
- Sequence generators and frame envelope helpers
- JSON-Patch engine wrapper (property tests via `fast-check` — 10K pairs)
- TypeBox schema validation (`GenicSchema<T>` wrapper)
- `SessionStore` interface + `InMemoryStore` + subscribe behavior
- Component lifecycle: mount/update/unmount/state tracking
- Web Component base class: `observedAttributes`, event forwarding
- Event routing: subscription management, composed event forwarding

**Do NOT write unit tests for:**

- Trivial getters / setters / pass-through functions
- Pure presentational components (covered by E2E)
- Framework-provided wrappers
- Code already covered by integration tests

**Coverage targets (from `docs/specs/testing-strategy.md`):**

| Component | Line | Branch |
|---|---|---|
| `@genicui/core` | 80% | 75% |
| `@genicui/server` | 80% | 75% |
| `@genicui/client` | 70% | 65% |
| Tool handlers | 90% | 85% |

## Phase C — Type Checking & Linting

Run the full pre-commit suite:

```bash
bun run build    # TypeScript compilation
bun run lint     # ESLint (no-explicit-any enforced)
bun test         # All unit and integration tests
```

**Gate:** Do NOT proceed to Step 11 until:

- All unit and integration tests pass
- Zero typecheck / lint errors
- Coverage targets met per `docs/specs/testing-strategy.md`

**Error recovery:** IF a test fails, fix the **code** if the failure is a real regression. Fix the test only if the assertion was wrong. Never silence.
