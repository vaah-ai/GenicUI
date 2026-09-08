---
title: GenicUI Testable MVP — Security Model
description: Threat model, trust boundaries, auth, prototype-pollution defense, and security verification for the 29 Testable MVP features.
audience: Engineering, security reviewers, OSS maintainers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Security Model — Testable MVP

> **Purpose:** Document the threat model, trust boundaries, authentication, prototype-pollution defense, and security verification procedures for the Testable MVP. Single-maintainer scope; intentionally conservative.
>
> **Source:** [consolidated-requirements.md §C Security](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010), [features.md F14, F46](./features.md).

---

## Table of Contents

- [Threat Model](#threat-model)
- [Trust Boundaries](#trust-boundaries)
- [Authentication](#authentication)
- [Input Validation](#input-validation)
- [Prototype Pollution Defense](#prototype-pollution-defense)
- [Schema Enforcement](#schema-enforcement)
- [Wire Protocol Security](#wire-protocol-security)
- [Component Versioning Safety](#component-versioning-safety)
- [Registry Trust](#registry-trust)
- [Data Privacy](#data-privacy)
- [Operational Security](#operational-security)
- [Security Verification](#security-verification)
- [Threat Mitigations Matrix](#threat-mitigations-matrix)
- [Out of Scope (Phase 2)](#out-of-scope-phase-2)

---

## Threat Model

### Assets

| Asset | Threat |
|---|---|
| **User state** (component props, mounted IDs) | Unauthorized read, modification, deletion |
| **Component events** (click streams, form input) | Eavesdropping, injection |
| **Server resources** (CPU, memory, sockets) | Exhaustion, DoS |
| **API keys** | Theft, brute force |
| **Registry packages** | Malicious code execution via supply chain |
| **User PII in component state** | Leakage across sessions, logs |

### Adversaries

| Adversary | Capability | Goal |
|---|---|---|
| **Network attacker** | On-path TLS termination, replay | Read events, forge frames |
| **Authenticated agent** | Valid API key | Privilege escalation, schema bypass |
| **Malicious registry** | Compromised npm package, typosquat | RCE on consumer app |
| **Malicious user input** | Clicking, typing in mounted components | XSS in Shadow DOM, prompt injection |
| **Internal bug** | Implementation defect | Data corruption, leak |
| **Brute-forcer** | Network access | API key discovery |

### Non-goals (MVP)

- **Tenant isolation:** MVP assumes a single trust domain per server. Multi-tenant RBAC is Phase 2.
- **End-to-end encryption:** MVP relies on TLS (Cloudflare / host termination).
- **Compliance certifications:** SOC 2 / HIPAA / GDPR Mode 2 are Phase 2. Mode 1 (zero-retention) ships MVP.
- **Defense against nation-state attackers:** Out of scope for OSS single-maintainer project.

---

## Trust Boundaries

GenicUI has three trust boundaries:

```
┌─────────────────────────────────────────────────────────┐
│  Trust boundary 1: Network → Server                     │
│  • TLS termination (Cloudflare / host)                  │
│  • API key validation                                   │
│  • WebSocket subprotocol check                           │
└─────────────────────────────────────────────────────────┘
                            ↓ trusted ↓
┌─────────────────────────────────────────────────────────┐
│  Trust boundary 2: Agent tool call → Server handler     │
│  • JSON Schema validation (TypeBox Value.Check)        │
│  • Prototype pollution strip                            │
│  • Schema version drift detection                       │
│  • Idempotency key check                                │
└─────────────────────────────────────────────────────────┘
                            ↓ trusted ↓
┌─────────────────────────────────────────────────────────┐
│  Trust boundary 3: User event → Agent                   │
│  • CustomEvent comes from Shadow DOM (less attack       │
│    surface than innerHTML)                              │
│  • Agent must re-validate detail payload                │
│  • MVP: events are untrusted JSON; agent schema-checks  │
└─────────────────────────────────────────────────────────┘
```

### Why three boundaries, not one

- Network boundary prevents unauthenticated abuse
- Tool-call boundary prevents authenticated abuse (agent doing more than allowed)
- Event boundary prevents user-injected events from manipulating the agent

Each boundary runs independently. A breach in one doesn't auto-breach the next.

---

## Authentication

### API Key Format

```
gnc_live_<32 hex chars>    # production key (32 hex chars = 16 bytes entropy)
gnc_test_<32 hex chars>    # test key (works only in dev mode)
```

### Header Forms

Both `Authorization: Bearer` and `Sec-WebSocket-Protocol: api-key.<key>` are accepted:

```
Authorization: Bearer gnc_live_abc123def456ghi789jkl012mno345pq
```
or
```
Sec-WebSocket-Protocol: genicui.v1, api-key.gnc_live_abc123def456ghi789jkl012mno345pq
```

### Validation Rules

| Condition | Response |
|---|---|
| Missing `Authorization` | HTTP 401 + `WWW-Authenticate: Bearer` |
| Invalid format (not `gnc_live_*` / `gnc_test_*`) | HTTP 401 |
| Valid format, unknown key | HTTP 401 |
| `gnc_test_*` to production server (`GENICUI_ENV=production`) | HTTP 403 |
| Valid `gnc_live_*` key | Pass |

### Storage

- **Local dev:** key in `GENICUI_API_KEY` env var, never logged
- **Cloudflare:** `wrangler secret put GENICUI_API_KEY`
- **Self-host:** `~/.config/genicui/keys.json` with file mode `0600` (Phase 2)

### Rotation

Manual rotation in MVP. Phase 2 supports zero-downtime rotation: send `oldKey` and `newKey` simultaneously; server accepts both for 24 hours.

### Threat: Key Theft via Logs

**Defense:** Every log line that touches an API key is scrubbed before write:

```ts
function scrub(s: string): string {
  return s.replace(/gnc_(live|test)_[a-f0-9]{32}/g, 'gnc_$1_***REDACTED***');
}
logger.info(scrub(`Auth attempt with ${key}`));
```

Verified in [F46 AC3](./features.md#f46--api-key-auth).

---

## Input Validation

Every inbound tool call goes through this pipeline (locked in [F14](./features.md#f14--trust-boundary-validation)):

```
Raw payload
  ↓
[1] Strip __proto__, constructor, prototype keys recursively
  ↓
[2] JSON Schema validate (TypeBox Value.Check)
  ↓
[3] Discriminated union check (update_component: patch XOR merge)
  ↓
[4] Component version drift check (≤ 2 minor versions behind)
  ↓
[5] Idempotency key dedupe (24h window)
  ↓
Tool handler (trusted)
```

### Why each step

| Step | Defends against |
|---|---|
| 1 | Prototype pollution (CVE-2018-3721, CVE-2019-7609) |
| 2 | Type confusion, missing fields, extra fields |
| 3 | Conflicting update mechanisms |
| 4 | Breaking changes the agent doesn't know about |
| 5 | Replay attacks |

### Step 1: Prototype Pollution Strip

```ts
function stripProtoKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripProtoKeys) as any;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = stripProtoKeys(v);
  }
  return out;
}
```

**Tested:** `fast-check` 10K random payloads with malicious keys; all stripped.

### Step 2: Schema Validation

TypeBox's `Value.Check()` returns `true` / `false` + a `TypeErrors` array. We always use both:

```ts
const errors = Value.Errors(schema, payload);
if (errors.length > 0) {
  return { isError: true, code: -32003, message: 'props_invalid', data: { details: errors.map(e => `${e.path}: ${e.message}`) } };
}
```

### Step 3-5: Domain-Specific

- Discriminated union: TS enforces at compile time; runtime re-check via `if ('patch' in body && 'merge' in body) reject`.
- Version drift: `installed.major === expected.major && expected.minor - installed.minor <= 2`.
- Idempotency: in-memory LRU cache keyed by `(apiKey, idempotencyKey)`; 24h TTL.

---

## Prototype Pollution Defense

This is GenicUI's most-tested attack vector.

### What we defend

```json
// Attacker payload
{
  "props": {
    "rows": [],
    "__proto__": { "isAdmin": true }
  }
}
```

### What the attacker hopes happens

If passed to `Object.assign(target, payload)`, the prototype of `target` would gain `isAdmin: true`, affecting every `target` instance.

### Defense layers

1. **Pre-strip** — `stripProtoKeys()` removes `__proto__`, `constructor`, `prototype` recursively
2. **Schema reject** — Even if not stripped, TypeBox doesn't process these as keys
3. **`Object.create(null)`** — `genicul-components` registry uses null-prototype objects internally
4. **Frozen prototypes** — Server-side state objects are `Object.freeze()`d after mount

### Property test (F14)

```ts
fc.assert(fc.property(
  fc.object({ maxDepth: 3 }),
  fc.constantFrom('__proto__', 'constructor', 'prototype'),
  fc.object(),
  (payload, key, malicious) => {
    const dirty = { ...payload, [key]: malicious };
    const clean = stripProtoKeys(dirty);
    return !(key in clean);
  }
), { numRuns: 10_000 });
```

---

## Schema Enforcement

### `additionalProperties: false` at the Tool Level

Every MCP tool's `inputSchema` is emitted with `additionalProperties: false`. This means TypeBox's `Value.Check` rejects any extra field.

```ts
// In core
const schema = Type.Object({ ... }, { additionalProperties: false });

// At server
const errors = Value.Errors(schema, payload);
// If payload has fields not in schema → errors.length > 0
```

### `additionalProperties: true` at Registry Load

Registry authors can't sneak in open schemas. At registry load time, we walk the schema tree and reject:

```ts
function rejectOpenSchemas(schema: TSchema): void {
  if (schema.type === 'object' && schema.additionalProperties === true) {
    throw new RegistryValidationError('additionalProperties: true is forbidden');
  }
  // recurse into properties, items, etc.
}
```

Verified in [F14 AC3](./features.md#f14--trust-boundary-validation).

### Schema Version Drift

When a registry publishes version 1.5.0 and the agent expects 1.7.0, GenicUI:

- **Same major:** accepts (within ±2 minor versions)
- **Drift > 2 minor:** server emits `component.deprecated` event, lets agent migrate
- **Different major:** server rejects the tool call with `-32010 internal` (manifests don't match)

Phase 2: server returns a migration path; MVP: server rejects.

---

## Wire Protocol Security

### Frame Validation

| Field | Rule |
|---|---|
| `v` | Must equal `1` |
| `channel` | String, 1-128 chars, no control chars |
| `type` | String, 1-64 chars, must be in known AG-UI / GenicUI event list |
| `payload` | Must conform to the event's payload schema |
| `seq` | uint64, monotonic per channel |

Frames failing validation → connection closed with WS code 1003.

### Replay Protection

MVP has no replay protection at the wire level (relies on TLS + WS upgrade auth). Phase 2 adds HMAC signatures on each frame.

### Heartbeat

30s ping / 5s pong timeout / 2 missed pongs = close. Prevents idle-connection resource exhaustion.

---

## Component Versioning Safety

### Deprecation Flow

```
Registry publishes v1.1.0 with deprecation note on `pageSize`
  ↓
Server receives render_component for v1.0.0 DataTable
  ↓
Server accepts (within ±2 minor versions)
  ↓
Server logs warning to operator
  ↓
find_ui_component returns deprecatedFields: ['pageSize']
  ↓
Agent decides: ignore / migrate / swap
```

### Version Mismatch

If agent sends `componentVersion: '1.0.0'` but only `1.2.0` is registered, server rejects with:

```json
{ "code": -32003, "message": "props_invalid", "data": { "details": ["component_version 1.0.0 not found; available: [1.2.0]"] } }
```

Agent calls `find_ui_component` again, gets the new version, retries.

---

## Registry Trust

### Supply Chain

| Risk | Mitigation |
|---|---|
| Typosquat (`@genicul-primevuee/registry`) | npm scope + clear docs |
| Compromised maintainer | npm `--provenance` recommended |
| Malicious code in `wireActions` | `@genicui/conformance` test suite |
| Eval/Function injection | Registry validator rejects `eval`, `new Function`, raw `WebSocket` constructors |

### Registry Validator (Phase 2)

`genicui registry validate <path>` runs 5 rules:

1. Every component has `name`, `namespace`, `version`, `framework`, `schema`, `events`
2. Schemas parse as TypeBox + emit valid JSON Schema 2020-12
3. Event names match emitted events (AST scan)
4. Source file size < 100KB
5. No `eval(`, `new Function(`, `new WebSocket(` outside approved adapters

**MVP:** Manual review by maintainer. GitHub Action gates registry PRs.

### `GENICUI_REGISTRY_ALLOWLIST`

Phase 2 env var restricts which registries can be loaded:

```
GENICUI_REGISTRY_ALLOWLIST=@genicul-primevue/registry,@genicul-mantine/registry
```

Server refuses to load any registry not on the list.

---

## Data Privacy

### MVP Privacy Posture

- **No persistence by default:** `InMemoryStore` is the only backend; state dies with the process
- **No telemetry:** GenicUI doesn't phone home
- **No logs of user content:** logs record event types, IDs, and metadata — never payload contents
- **Zero-retention mode** (`GENICUI_PRIVACY_MODE=zero`): no session state persisted beyond active WebSocket

### PII Redaction Hook

Phase 2: `beforePersist(event, ctx)` lets the host app scrub PII before state is saved. MVP: not exposed.

### Compliance Section in Docs

Required for MVP:
- What GenicUI stores: per-session component state (InMemory only)
- What GenicUI doesn't store: agent messages, conversation history, telemetry
- How to disable persistence: run with `GENICUI_PRIVACY_MODE=zero`
- GDPR right-to-erasure: kill the session, memory clears immediately

---

## Operational Security

### Logging

| Log level | Content |
|---|---|
| `debug` | Frame dumps (dev only) |
| `info` | Connections, mounts, unmounts, errors |
| `warn` | Schema mismatches, deprecated fields, slow queries |
| `error` | Exceptions, internal failures |

**Never logged:** API keys, component prop contents, user input, conversation text.

### Rate Limiting (Phase 2)

MVP documents the limits but doesn't enforce:

```
50 components/session
20 updates/sec/component
256KB payload
5MB total state
10K renders/day per API key
```

Phase 2 enforces via Cloudflare WAF rules + DO-level counters.

### Backups (Phase 2)

- Self-host: `pg_dump`-style snapshot every 6 hours
- Cloudflare: DO SQLite → R2 hourly
- Recovery: server reads latest snapshot on cold start

MVP has no backup mechanism — `InMemoryStore` is volatile by design.

---

## Security Verification

### Automated Tests

Every feature in [features.md](./features.md) with security-relevant ACs has a corresponding test:

| Feature | Test location | What it verifies |
|---|---|---|
| F14 AC1 | `tests/integration/trust-boundary.test.ts` | `__proto__`, `constructor`, `prototype` stripped |
| F14 AC2 | `tests/integration/schema-validation.test.ts` | Invalid props → -32003 with details |
| F14 AC3 | `tests/integration/registry-load.test.ts` | `additionalProperties: true` rejected at load |
| F14 AC4 | `tests/integration/patch-validation.test.ts` | Patch op path not in state → -32004 |
| F46 AC1-3 | `tests/integration/auth.test.ts` | Bearer validation + test key rejection |

### Manual Security Review (Pre-v0.1.0)

Single-maintainer checklist before tagging:

- [ ] No `any` types in security-critical paths (`src/server/auth/`, `src/server/mcp/`, `src/core/patch/`, `src/core/mcp/`)
- [ ] No `eval`, `new Function`, `vm.runIn*` anywhere in `packages/`
- [ ] No raw `WebSocket` constructor (only `Bun.ws` / `WebSocketPair`)
- [ ] All tool inputs go through `Value.Check`
- [ ] All inbound frames go through `validateFrame`
- [ ] No user-supplied data ever passed to `dangerouslySetInnerHTML` / `innerHTML`
- [ ] All event listeners in Web Component use `composed: true, bubbles: true`
- [ ] API keys redacted from logs

### Penetration Testing

Phase 2 — outsource. Cost: ~$5K-15K for a focused MCP Apps / WebSocket review.

### Bug Bounty

Phase 3 — after MVP ships + 50+ GitHub stars + an enterprise user expresses interest.

### Security Disclosure

`SECURITY.md` at repo root:
- Email: security@genicui.dev (placeholder; Phase 2)
- 90-day disclosure window
- Hall of fame for reporters

---

## Threat Mitigations Matrix

| Threat | Mitigation | Status |
|---|---|---|
| Network sniffing | TLS termination | Host responsibility |
| API key brute force | Length (32 hex = 128 bits entropy) + rate limits (Phase 2) | MVP partial |
| Replay attack | TLS + WS upgrade auth | MVP |
| Prototype pollution | `stripProtoKeys` + `Object.create(null)` + frozen objects | MVP |
| Schema bypass | TypeBox + `additionalProperties: false` | MVP |
| Type confusion | TypeBox + runtime discriminated union | MVP |
| XSS in event detail | `composed: true` events are JSON-serialized; agent must re-validate | MVP |
| Registry supply chain | npm `--provenance` + conformance tests + manual review | MVP partial |
| Denial of service | WS heartbeat + max connections per key | MVP partial |
| Privilege escalation | API key per agent, no nested keys | MVP |
| Session fixation | Random session IDs, no client-controlled session state | MVP |
| Side-channel timing | All auth paths are constant-time | MVP |
| Component version drift | Reject drift > 2 minor versions | MVP |
| User input → agent prompt | Agent must re-validate every event payload | Out of MVP scope (agent's responsibility) |
| Server RCE via malicious registry | Registry validator + conformance tests | MVP partial |

---

## Out of Scope (Phase 2+)

These are **deliberately deferred** and documented so they aren't "missing features":

- **Multi-tenant isolation with row-level security** (Phase 2)
- **End-to-end encryption for events** (Phase 2 — relies on TLS)
- **OAuth 2.1 + JWT identity propagation** (Phase 2 — F52, F47)
- **Webhook signatures** for outbound notifications (Phase 2)
- **HMAC frame signing** (Phase 2)
- **Cloudflare WAF rules** for rate limits (Phase 2)
- **Penetration test** (Phase 2 — after first external user)
- **SOC 2 / HIPAA / GDPR Mode 2** (Phase 3)
- **Bug bounty program** (Phase 3)

---

## Cross-Reference

- [features.md F14, F46](./features.md) — feature specs with security ACs
- [architecture.md Trust Boundary](./architecture.md#state-management) — system context
- [deployment.md §Production Checklist](./deployment.md#production-checklist) — operational security
- [testing-strategy.md §Property-Based Tests](./testing-strategy.md#property-based-tests) — 10K-pair invariant tests
- [consolidated-requirements.md §C Security](../idea/consolidated-requirements.md#c-non-functional-requirements-iso-25010) — locked security requirements
