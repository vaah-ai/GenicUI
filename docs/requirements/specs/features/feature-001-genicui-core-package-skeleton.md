---
feature_id: F1
title: "@genicui/core package skeleton"
phase: Foundations
priority: Critical
effort: S
dependencies: []
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
  - ../../idea/consolidated-requirements.md#a-foundational-decisions-locked
---

# F1 — `@genicui/core` package skeleton

Monorepo workspace; `packages/core` with ESM exports, strict TypeScript, zero runtime deps.

## Inputs / Outputs

**Input:**
```bash
mkdir -p packages/core/src && cd packages/core
cat > package.json <<'EOF'
{ "name": "@genicui/core", "version": "0.1.0", "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc", "test": "bun test" } }
EOF
cat > tsconfig.json <<'EOF'
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "strict": true,
  "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true } }
EOF
echo 'export const VERSION = "0.1.0";' > src/index.ts
```

**Output:**
```bash
$ bun test
✓ src/index.test.ts (1 test) [12ms]
$ bun run build
$ ls dist
index.js  index.d.ts
```

## Acceptance Criteria (Gherkin)

### F1-AC1: TypeScript resolution < 50ms
- **Given** a developer runs `bun install` at the monorepo root
- **When** they import `@genicui/core`
- **Then** TypeScript types resolve and the package loads in <50ms

### F1-AC2: ESM compatibility
- **Given** the package is built
- **When** consumers `import { something } from '@genicui/core'`
- **Then** ESM resolution works in Node 20+, Bun 1.2+, Deno 1.40+

### F1-AC3: Zero `any` types
- **Given** strict TypeScript is enabled
- **When** the build runs
- **Then** zero `any` types in `src/` (enforced by ESLint rule `@typescript-eslint/no-explicit-any`)

## Test Plan

| AC | Test |
|---|---|
| F1-AC1 | `tests/unit/core/package.test.ts:F1-AC1` measures import latency |
| F1-AC2 | `tests/unit/core/package.test.ts:F1-AC2` cross-runtime ESM test (Node, Bun, Deno matrix in CI) |
| F1-AC3 | `tests/unit/core/lint.test.ts:F1-AC3` runs ESLint, fails on `any` |

## Cross-References

- Locked by: [consolidated-requirements.md §L9 Schema system](../../idea/consolidated-requirements.md#b-locked-technical-decisions), §F6 Package count
- Test strategy: [testing-strategy.md](../testing-strategy.md#test-pyramid)
- Architectural context: [architecture.md §Package Boundaries](../architecture.md#package-boundaries)
