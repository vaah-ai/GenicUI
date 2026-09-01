---
title: GenicUI Testable MVP — Testing Strategy
description: How we verify the 93 Gherkin acceptance criteria across the 29 Testable MVP features. Property tests, integration tests, conformance suite, and CI matrix.
audience: Engineering, QA, OSS maintainers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Testing Strategy — Testable MVP

> **Purpose:** Define how every one of the 93 acceptance criteria in [features.md](./features.md) is verified, from unit tests to end-to-end smoke tests. The strategy supports a single maintainer — high signal, low maintenance burden.
>
> **Source:** [features.md](./features.md) (93 ACs), [consolidated-requirements.md §C Maintainability](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010).

---

## Table of Contents

- [Test Pyramid](#test-pyramid)
- [Coverage Targets](#coverage-targets)
- [Test Layers](#test-layers)
- [How Each AC Is Verified](#how-each-ac-is-verified)
- [Property-Based Tests](#property-based-tests)
- [Integration Tests](#integration-tests)
- [Conformance Suite](#conformance-suite)
- [CI Matrix](#ci-matrix)
- [Test Authoring Rules](#test-authoring-rules)

---

## Test Pyramid

```
              ╱╲
             ╱  ╲         E2E smoke (3-5 tests)
            ╱    ╲        Full agent turn: render → update → event
           ╱──────╲
          ╱        ╲       Integration tests (~20)
         ╱          ╲      WebSocket frames, MCP tool calls, schema validation
        ╱────────────╲
       ╱              ╲    Unit tests (~150)
      ╱                ╲   SequenceGenerator, JsonPatchEngine, genicSchema, ...
     ╱──────────────────╲
```

| Layer | Count | Speed | Where it runs |
|---|---|---|---|
| Unit | ~150 | <5s total | Every PR, pre-commit |
| Integration | ~20 | <30s total | Every PR |
| E2E smoke | 3-5 | <2min total | Pre-deploy, nightly |
| Conformance | N×3 (registry × versions) | <60s | Pre-publish |

---

## Coverage Targets

Locked in [consolidated-requirements.md §C](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010):

| Component | Line | Branch |
|---|---|---|
| `@genicui/core` | 80% | 75% |
| `@genicui/server` | 80% | 75% |
| `@genicui/client` | 70% | 65% |
| Tool handlers | 90% | 85% |
| Registry adapters | 60% | 55% |
| Framework shims | 60% | 55% |

**Enforcement:** `bun test --coverage` in CI fails the build if any component drops below target.

---

## Test Layers

### Layer 1: Unit Tests

Pure logic, no I/O. Located next to source as `*.test.ts`.

```ts
// packages/core/src/patch/engine.test.ts
import { describe, it, expect } from 'bun:test';
import fc from 'fast-check';
import { JsonPatchEngine } from './engine';

describe('JsonPatchEngine', () => {
  it('round-trips random pairs (property test)', () => {
    fc.assert(fc.property(
      fc.object({ maxDepth: 3 }),
      fc.object({ maxDepth: 3 }),
      (a, b) => {
        const engine = new JsonPatchEngine();
        const patch = engine.diff(a, b);
        const result = engine.apply(patch, a);
        return JSON.stringify(result) === JSON.stringify(b);
      }
    ), { numRuns: 10_000 });
  });

  it('returns empty patch for identical objects', () => {
    const engine = new JsonPatchEngine();
    expect(engine.diff({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it('falls back to snapshot on Date values', () => {
    const engine = new JsonPatchEngine();
    const before = { ts: new Date(0) };
    const after = { ts: new Date(1) };
    expect(() => engine.diff(before, after)).toThrow('non_serializable');
  });
});
```

### Layer 2: Integration Tests

Server + client + transport together. Located in `tests/integration/`.

```ts
// tests/integration/render-update.test.ts
import { test, expect } from 'bun:test';
import { startTestServer } from '../helpers/server';
import { connectTestClient } from '../helpers/client';

test('agent renders and updates a DataTable', async () => {
  const { server, port } = await startTestServer({ apiKey: 'gnc_live_test' });
  const client = await connectTestClient(`ws://localhost:${port}/ws`, 'gnc_live_test');

  // Render
  const mounted = await client.call('render_component', {
    name: 'DataTable',
    props: { rows: [{ id: '1', name: 'Alice' }] },
    surface: 'default',
  });
  expect(mounted.componentId).toMatch(/^dt-[a-f0-9]{8}-[0-9A-HJKMNP-TV-Z]{26}$/);

  // Wait for COMPONENT_MOUNTED on the channel
  const mounted_frame = await client.nextFrame(mounted.componentId);
  expect(mounted_frame.type).toBe('COMPONENT_MOUNTED');

  // Update
  await client.call('update_component', {
    componentId: mounted.componentId,
    patch: [{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }],
  });

  // Verify STATE_DELTA arrives
  const delta = await client.nextFrame(mounted.componentId);
  expect(delta.type).toBe('STATE_DELTA');
  expect(delta.payload).toEqual([{ op: 'replace', path: '/rows/0/name', value: 'Alicia' }]);

  await server.close();
});
```

### Layer 3: End-to-End Smoke

Real browser + real agent. Playwright for browser, MCP inspector for agent.

```ts
// tests/e2e/full-flow.test.ts
import { test, expect } from '@playwright/test';

test('agent renders DataTable, user clicks, agent receives event', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.waitForSelector('genic-data-table');

  // Click row
  await page.click('genic-data-table [data-p-row="0"]');

  // Agent (via MCP inspector) should receive the event
  const events = await inspectMcpTransport.getReceivedEvents();
  expect(events).toContainEqual(expect.objectContaining({
    type: 'COMPONENT_EVENT',
    payload: expect.objectContaining({
      action: 'row_selected',
      detail: expect.objectContaining({ rowId: expect.any(String) }),
    }),
  }));
});
```

---

## How Each AC Is Verified

| AC type | Verification method |
|---|---|
| Type / interface contract | TypeScript compile error if violated |
| Validation rule | Unit test with valid + invalid inputs |
| Wire format | Integration test that asserts JSON over WebSocket |
| Performance (p50 < 50ms) | Benchmark suite in `tests/perf/`, fail if exceeded |
| Browser behavior | Playwright test |
| Cloudflare-specific | Deploy to staging env, run smoke |
| Auth | Integration test with multiple key types |

---

## Property-Based Tests

For invariants where enumerating cases is impossible, use `fast-check`.

### Required property tests

| Feature | Property |
|---|---|
| F3 SequenceGenerator | 10K `seq.next()` calls produce monotonic uint64, no duplicates |
| F4 JsonPatchEngine | 10K random object pairs satisfy `apply(diff(a, b), a) === b` |
| F2 GenicSchema | All TypeBox types round-trip to JSON Schema 2020-12 + back without loss |
| F14 Trust boundary | 10K random payloads with `__proto__`, `constructor`, `prototype` all strip those keys |
| F21 Error codes | 10K random tool calls return codes in [-32010, -32001] or standard MCP range |

---

## Integration Tests

### Auth & Trust Boundary (tests/integration/auth.test.ts)

- Missing `Authorization` → 401
- Test key to prod → 403
- WS upgrade without `Sec-WebSocket-Protocol: genicui.v1` → 400
- Tool call with `__proto__` in payload → `-32003 props_invalid`
- Tool call with extra props beyond schema → `-32003 props_invalid`

### Tool Surface (tests/integration/tools.test.ts)

- `find_ui_component` returns DataTable for "table" query
- `render_component` returns valid componentId format
- `update_component` with both `patch` and `merge` → rejected (discriminated union)
- `subscribe_to_events` receives events as they fire

### Transport (tests/integration/transport.test.ts)

- Server sends `server.hello` within 100ms of upgrade
- Heartbeat ping fires every 30s
- Two missed pongs → WS close 1011
- Malformed frame (missing `v` or `channel`) → close 1003

### Component Lifecycle (tests/integration/lifecycle.test.ts)

- AG-UI events fire in order (RUN_STARTED → TOOL_CALL_* → RUN_FINISHED)
- `unmount_component` emits `channel.closed`
- 257th channel registration → rejected

---

## Conformance Suite

`@genicui/conformance` — a package that all registry implementations run against.

```ts
// in @genicul-primevue/registry package
import { runConformance } from '@genicui/conformance';
import { registry } from './dist/registry.js';

await runConformance(registry, {
  framework: 'vue3',
  mountPoint: '#test-root',
});
```

### Conformance rules

| Rule | Tests |
|---|---|
| Schema valid | All component schemas parse with `genicSchema()` |
| Events declared | Every `composed: true` event has a `detailSchema` |
| Lifecycle clean | `connectedCallback` → render; `disconnectedCallback` → cleanup |
| State queries work | `getState()` returns the same shape as initialState |
| Wire integration | Render → update → event flow works in a smoke test |

### CI enforcement

Registry PRs that fail conformance are auto-blocked:

```yaml
# .github/workflows/registry-conformance.yml
on:
  pull_request:
    paths: ['registries/**']
jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:conformance
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          configuration-path: .github/labeler.yml
```

---

## CI Matrix

`.github/workflows/ci.yml` runs on every PR:

| Job | Tooling | Time budget |
|---|---|---|
| Lint + format | ESLint, Prettier | 30s |
| Typecheck | `tsc --noEmit` | 60s |
| Unit + integration | `bun test` | 60s |
| Coverage gate | `bun test --coverage` | 90s |
| Property tests | `bun test --property` | 120s |
| Build | `bun run build` | 60s |
| E2E smoke (PR only) | Playwright | 180s |
| Conformance (registry PR) | `bun run test:conformance` | 60s |

**Total PR CI:** ~7 minutes. Stated budget; will fail PRs that exceed it.

**Nightly:**
- E2E smoke against deployed Cloudflare staging
- Performance benchmarks (record p50/p99, fail if regression > 20%)
- Security: `bun audit`, dependency review

---

## Test Authoring Rules

### Rule 1: ACs map 1-to-1 to tests
Every `Given/When/Then` AC in [features.md](./features.md) gets at least one test. The test file is named after the AC ID.

```
features.md says: F10 AC: "Given WS upgrade with invalid API key, server returns 401"
Test file:       tests/integration/transport.test.ts:12
Test name:       F10-AC2: WS upgrade with invalid API key returns 401
```

### Rule 2: Red-green-refactor
Write the AC first, the failing test second, the implementation third. PRs that include a feature without its AC tests are blocked.

### Rule 3: No network in unit tests
Unit tests use stubs for WebSocket, fetch, etc. If a test makes a network call, it belongs in the integration or e2e layer.

### Rule 4: Deterministic tests
All randomness must come from `fast-check`. No `Math.random()`, no `Date.now()` in test bodies. Pass timestamps as fixtures.

### Rule 5: One assertion per `it()`
Use `expect()` chains sparingly. If a test has 5+ assertions, split it.

### Rule 6: Real references where possible
Mocking is a last resort. Inject real implementations for I/O when feasible — Bun's in-process WebSocket is fast enough that the test overhead is negligible.

---

## Current test inventory (PoC)

Tests implemented as part of the PoC. These are the actual tests that run today, mapped to features and ACs.

### Package unit tests (`packages/core/`)

| File | Feature | ACs | Count |
|---|---|---|---|
| `packages/core/src/index.test.ts` | F1 | F1-AC1, F1-AC2, F1-AC3 | 3 |

### PoC unit tests (`poc/`)

| File | Module | Scope | Count |
|---|---|---|---|
| `poc/adaptors/base-adaptor.test.mjs` | BaseAdaptor | validateProps: required, type, itemShape, edge cases | ~18 |
| `poc/server/registry.test.mjs` | ComponentRegistry | register, get, list, search (scoring, topK, edge cases) | ~15 |
| `poc/server/lifecycle.test.mjs` | ComponentLifecycle | mount, update, unmount, get, getState, invoke, list | ~17 |
| `poc/server/chat-broadcaster.test.mjs` | ChatBroadcaster | create, push, subscribe, close, claude session, isTerminal | ~18 |
| `poc/server/chat-parser.test.mjs` | ChatParser | mapStreamJsonEvent (compact + verbose), parseOutputLine | ~35 |
| `poc/server/integration.test.mjs` | Integration | find→render→update→unmount flow, search+validate round-trip | ~15 |

### E2E tests (`e2e/`)

| Spec | Features | Scope | Count |
|---|---|---|---|
| `e2e/chat-surface.spec.ts` | F9, F46 | Browser UI, session API, SSE, CORS | ~13 |
| `e2e/component-render.spec.ts` | F16, F17, F19 | Component mount/update/unmount | ~6 |
| `e2e/event-bridge.spec.ts` | F10, F18, F29, F30 | WebSocket bridge, hello, actions | ~8 |
| `e2e/full-flow.spec.ts` | F13-F18, F30 | Full flow: render → update → event | ~5 |

**Total:** ~130 tests (13 unit + ~83 PoC unit/integration + ~32 E2E).

---

## Verification Ladder (Phase 5 reference)

After Phase 4.5 docs are written, the verification ladder runs:

1. **Schema check** — every AC has a corresponding test ID in code
2. **Coverage check** — every feature's AC count matches its test count
3. **Cross-reference check** — every locked decision in [consolidated-requirements.md](../idea/consolidated-requirements.md) is tested or explicitly deferred
4. **Open-question check** — no unresolved "TBD" in test files
5. **Manifest generation** — produce `docs/specs/manifest.json` with feature → test → doc cross-references

---

## Cross-Reference

- [features.md](./features.md) — 93 ACs that this strategy verifies
- [architecture.md](./architecture.md) — system topology that integration tests target
- [deployment.md](./deployment.md) — E2E smoke targets (Cloudflare staging, Bun self-host)
- [security.md](./security.md) — auth + trust boundary tests
