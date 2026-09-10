---
title: Coding Principles Reference
purpose: Coding discipline rules and quality audit checklist
---

# Coding Principles

## Coding Discipline (Apply During Implementation)

- Use the **Edit** / **Write** tools for file operations. Never `sed`, `awk`, `echo >`, or heredocs in Bash.
- After every file edit, immediately run the relevant typecheck: `bun run build` for TypeScript packages.
- IF a test file exists adjacent to the modified file, run it immediately after editing.
- **No `any` types:** ESLint `@typescript-eslint/no-explicit-any` is enforced. Use `unknown` + narrowing.
- **ESM only:** `"type": "module"`, `.mjs` for PoC, `.ts` for production. `import`/`export`, no `require()`.
- **Strict TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.

## Security (Apply to All Inbound Data)

- **Strip prototype keys:** Remove `__proto__`, `constructor`, `prototype` from every inbound payload.
- **TypeBox validation:** `Value.Check()` on ALL inbound data — tool calls, WebSocket frames, API requests.
- **Schema enforcement:** `additionalProperties: false` in ALL TypeBox schemas.
- **JSON-Patch safety:** Validate path exists in current state before applying. Use `{ mutate: false }`.
- **API key format:** `gnc_live_<32>` for production, `gnc_test_*` for dev only. Bearer header.

## MCP Server Conventions

- **stdout is MCP transport** — ALL logging goes to `stderr`. Never `console.log` to stdout.
- **Tool result shape:** `{ content: [{ type: 'text', text: '...' }] }` for all tool handlers.
- **Error envelope:** `{ content: [{ type: 'text', text: '...' }], isError: true }` for error responses.
- **Transport modes:** `stdio` (single-shot per session) or `http` (stateless, per-request server).

## WebSocket Protocol

- **Subprotocol:** `genicui.v1`
- **Channel model:** Up to 256 channels per socket. Reserved: `__session__`, `__mcp__`, `__agent__`.
- **Frame ordering:** Monotonic `seq: uint64` per channel. Client buffers out-of-order frames.
- **Heartbeat:** Ping every 30s; 2 missed pongs = reconnect.
- **Reconnect:** Exponential backoff (1s/2s/4s/8s/30s cap).

## Web Component Conventions

- **Closed Shadow DOM:** `shadowRootMode: 'closed'`
- **Observed attributes:** `['props-json', 'component-id']`
- **Event forwarding:** `composed: true, bubbles: true` for all forwarded events
- **PrimeVue integration:** Use PassThrough API to inject GenicUI data

## Principles Audit Checklist (Apply Before Commit)

| Principle         | Check                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **DRY**           | No duplicated logic across files                                          |
| **KISS**          | No over-engineered solutions                                              |
| **YAGNI**         | No speculative code, no unused parameters, no future-proofing             |
| **SoC**           | DB / service / route / store / component concerns separated               |
| **SRP**           | Each function / class / component does one thing                          |
| **SOLID**         | Abstractions respected, interfaces clean                                  |
| **Accessibility** | ARIA roles, keyboard navigation, focus management (UI tasks only)         |
| **Security**      | Inputs validated, outputs escaped, no secrets in code, prototype keys stripped |
| **No `any`**      | Zero `any` types in all new code                                          |
| **Tracing**       | Every feature/function traces back to a feature ID (F1, F2, ...)         |

## Complexity Check

- **Single Responsibility?** Refactor if the function has more than one concern.
- **>30 lines?** Extract cohesive blocks into named sub-functions.
- **>3 levels of nesting?** Apply guard clauses / early returns.
- **Side effects in pure layers?** Move them to the outermost layer.

## Test Expectations

- **Unit test colocation:** `*.test.ts` or `*.test.mjs` adjacent to source.
- **Test runner:** `bun test` for all packages.
- **Property tests:** `fast-check` for JSON-Patch engine (10K pairs).
- **Coverage targets:** See `docs/specs/testing-strategy.md` (80% core, 90% tool handlers).
- **E2E:** Playwright, deterministic (run twice), no `test.skip` / `test.fixme`.
