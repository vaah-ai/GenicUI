---
feature_id: F64
title: "Nitro/Nuxt binding"
phase: Deployment
priority: Medium
effort: M
dependencies: [F9]
methodology: Specification by Example
status: approved
verified: true
verified_by: pipeline-verifier
verified_at: 2026-09-01
sources:
  - ../../idea/consolidated-requirements.md#b-locked-technical-decisions
---

# F64 — Nitro/Nuxt binding

Nuxt module `@genicui/nuxt` that mounts the WebSocket handler via Nitro's experimental WebSocket support.

## Inputs / Outputs

**Input (`nuxt.config.ts`):**
```ts
export default defineNuxtConfig({
  modules: ['@genicui/nuxt'],
  genicui: { wsPath: '/ws', apiKeyEnv: 'GENICUI_API_KEY' },
  nitro: { experimental: { websocket: true } },
});
```

**Output:**
- WS route mounted at `/ws`
- API key loaded from `process.env.GENICUI_API_KEY`

## Acceptance Criteria (Gherkin)

### F64-AC1: WS upgrade via Nitro
- **Given** a Nuxt app with the module installed
- **When** a client connects to `/ws`
- **Then** upgrade succeeds through Nitro's WebSocket handler

### F64-AC2: API key from env
- **Given** `GENICUI_API_KEY` is set
- **When** the module initializes
- **Then** the API key is read from env, not from config file

### F64-AC3: Devtools panel
- **Given** a Nuxt app in dev mode
- **When** opened
- **Then** a "GenicUI" panel shows active sessions and mount counts

## Test Plan

| AC | Test |
|---|---|
| F64-AC1 | `tests/integration/nuxt-binding.test.ts:F64-AC1` WS upgrade |
| F64-AC2 | `tests/integration/nuxt-binding.test.ts:F64-AC2` env-driven auth |
| F64-AC3 | `tests/integration/nuxt-binding.test.ts:F64-AC3` devtools |

## Cross-References

- Deployment: [deployment.md §Nuxt/Nitro Binding](../deployment.md#nuxtnitro-binding)
