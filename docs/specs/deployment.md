---
title: GenicUI Testable MVP — Deployment Guide
description: How to deploy the GenicUI Testable MVP to three targets — Cloudflare Workers + Durable Objects (production), Bun self-host (dev/CI), and Nitro/Nuxt (Nuxt apps). Includes env vars, wrangler.toml, and CI/CD recipes.
audience: Engineering, DevOps, OSS maintainers
date: 2026-09-01
status: APPROVED — Phase 4 sign-off
---

# GenicUI Deployment Guide — Testable MVP

> **Purpose:** Deploy the Testable MVP to production, dev, or Nuxt environments. Covers Cloudflare Workers + Durable Objects (primary), Bun self-host (escape hatch), and Nitro/Nuxt (binding for Nuxt apps).
>
> **Source:** [consolidated-requirements.md §L1, L2](../idea/consolidated-requirements.md#b-locked-technical-decisions), features F61/F62/F64.

---

## Table of Contents

- [Target Matrix](#target-matrix)
- [Environment Variables](#environment-variables)
- [Target 1: Cloudflare Workers + Durable Objects](#target-1-cloudflare-workers--durable-objects)
- [Target 2: Bun Self-host](#target-2-bun-self-host)
- [Target 3: Nitro/Nuxt Binding](#target-3-nitronuxt-binding)
- [CI/CD Recipes](#cicd-recipes)
- [Production Checklist](#production-checklist)

---

## Target Matrix

| Target | Use case | Cold start | Max WS msg | State | Setup effort |
|---|---|---|---|---|---|
| **Cloudflare Workers + DO** | Production, multi-region | 50ms | 128KB | DO SQLite | Medium |
| **Bun self-host** | Dev, CI, single-tenant demos | 0ms | Unlimited | In-memory `Map` | Trivial |
| **Nitro/Nuxt binding** | Existing Nuxt apps | depends on host | depends on host | In-memory | Easy |

---

## Environment Variables

All targets share these env vars:

| Var | Required | Default | Notes |
|---|---|---|---|
| `GENICUI_API_KEY` | prod | (random in dev) | `gnc_live_<32>` chars. Generate via `openssl rand -hex 16`. |
| `GENICUI_SESSION_STORE` | optional | `memory` | One of `memory` (MVP), `durable-object` (CF), `postgres` (Phase 2) |
| `GENICUI_PORT` | optional | `8080` | Bun self-host only |
| `GENICUI_LOG_LEVEL` | optional | `info` | `debug`, `info`, `warn`, `error` |
| `GENICUI_HEARTBEAT_MS` | optional | `30000` | WebSocket ping interval |
| `GENICUI_REGION` | optional | (auto) | Phase 2; `eu`, `us`, `apac` |

---

## Target 1: Cloudflare Workers + Durable Objects

### Prerequisites

```bash
bun install -g wrangler
wrangler login
```

### File: `wrangler.toml`

```toml
name = "genicui-mvp"
main = "src/index.ts"
compatibility_date = "2026-09-01"
compatibility_flags = ["nodejs_compat"]

# Durable Object binding
[[durable_objects.bindings]]
name = "SESSION"
class_name = "GenicSessionDO"

[[migrations]]
tag = "v1"
new_classes = ["GenicSessionDO"]

# Optional: R2 backup bucket (Phase 2)
# [[r2_buckets]]
# binding = "BACKUP"
# bucket_name = "genicui-backups"

[vars]
GENICUI_LOG_LEVEL = "info"
GENICUI_HEARTBEAT_MS = "30000"

# Secrets (set via `wrangler secret put`)
# GENICUI_API_KEY
```

### File: `src/index.ts`

```ts
import { mountGenicUIForWorkers, GenicSessionDO } from '@genicui/server/workers';

export { GenicSessionDO };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return mountGenicUIForWorkers({ request, env, ctx, sessionDO: GenicSessionDO });
  },
};

interface Env {
  SESSION: DurableObjectNamespace;
  GENICUI_API_KEY: string;
  GENICUI_LOG_LEVEL: string;
  GENICUI_HEARTBEAT_MS: string;
}
```

### Deploy

```bash
# Set the API key as a secret (one-time)
wrangler secret put GENICUI_API_KEY
# paste: gnc_live_xxxxxxxxxxxxxxxxxxxxxxxx

# Deploy
wrangler deploy

# Verify
curl https://genicui-mvp.<account>.workers.dev/health
# {"status":"ok"}

# Test WebSocket
wscat -c "wss://genicui-mvp.<account>.workers.dev/ws" \
  -H "Authorization: Bearer ${GENICUI_API_KEY}"
# < {"v":1,"channel":"__session__","type":"server.hello", ...}
```

### What happens during hibernation

Cloudflare DOs can hibernate after ~10s of inactivity. State persists in SQLite; on next message, the DO resumes. WebSocket Hibernation API means the WS itself survives hibernation without dropping the client.

**MVP semantics:** State is held in `state.storage.sql` with one row per session, keyed by `sessionId`. Mutations use SQL transactions for consistency.

---

## Target 2: Bun Self-host

### Single command

```bash
bun run start
```

Or compile to a binary:

```bash
bun build src/server.ts --compile --outfile genicul
./genicui
```

### File: `src/server.ts` (Bun entry)

```ts
import { Elysia } from 'elysia';
import { mountGenicUIForBun } from '@genicui/server/bun';

const app = new Elysia()
  .get('/health', () => ({ status: 'ok' }))
  .use(mountGenicUIForBun({
    apiKey: process.env.GENICUI_API_KEY,
    port: Number(process.env.GENICUI_PORT ?? 8080),
  }))
  .listen({ port: 8080, hostname: '0.0.0.0' });

console.log(`Server running at ${app.server!.url}`);
```

### Run with Docker

```dockerfile
FROM oven/bun:1.2
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/server.ts --compile --outfile /usr/local/bin/genicui
EXPOSE 8080
CMD ["genicui"]
```

### Verify

```bash
docker build -t genicul-mvp .
docker run -p 8080:8080 -e GENICUI_API_KEY=gnc_live_$(openssl rand -hex 16) genicul-mvp
curl http://localhost:8080/health
# {"status":"ok"}
```

---

## Target 3: Nitro/Nuxt Binding

### Install the module

```bash
pnpm add nuxt-genicui @genicui/server @genicui/client
```

### File: `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  modules: ['nuxt-genicui'],
  genicui: {
    apiKey: process.env.GENICUI_API_KEY,
    surface: 'default', // mount point for components
  },
});
```

### Auto-generated route: `server/api/ws.ts`

The module generates this at build time:

```ts
import { mountGenicUIForNitro } from '@genicui/server/nitro';

export default defineWebSocketHandler({
  open(peer) {
    mountGenicUIForNitro({ peer, config: useRuntimeConfig().genicui });
  },
  message(peer, message) {
    // delegated to @genicui/server core
  },
  close(peer) {
    // cleanup
  },
});
```

### Run

```bash
pnpm dev
# WebSocket endpoint: ws://localhost:3000/api/ws
```

### Build for production

```bash
pnpm build
# Output: .output/server with Nitro deploy support
```

Deploy `.output/` to any Nitro-compatible host (Vercel, Netlify, Cloudflare Pages, Node server).

---

## CI/CD Recipes

### GitHub Actions: Cloudflare deploy on tag

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
      - run: bun run build
      - name: Publish packages
        run: bun run publish:all
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

### GitHub Actions: Bun self-host smoke test

```yaml
# .github/workflows/smoke.yml
name: Smoke
on: [push]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run start &
      - run: sleep 2
      - run: curl -f http://localhost:8080/health
```

---

## Production Checklist

Before tagging v1.0.0:

- [ ] `GENICUI_API_KEY` rotated from dev to a fresh `gnc_live_<32>`
- [ ] Cloudflare DO class registered (`wrangler deploy` migrations applied)
- [ ] `/health` endpoint returns 200 from deployed URL
- [ ] WebSocket upgrade succeeds with Bearer auth
- [ ] Cold-start latency < 200ms (p99)
- [ ] Heartbeat timer survives hibernation
- [ ] One full agent turn works end-to-end (find → render → update → event)
- [ ] Logs scrub API keys (never log `gnc_live_*` in plain text)
- [ ] Rate limit hooks in place (even if MVP doesn't enforce yet)
- [ ] `bun run audit` passes (no known vulnerabilities)

---

## Cross-Reference

- [features.md F61, F62, F64](./features.md#phase-f61f64-deploy) — feature specs with acceptance criteria
- [architecture.md Transport Topology](./architecture.md#transport-topology) — WS protocol details
- [security.md](./security.md) — auth + trust boundary
- [consolidated-requirements.md §L1, L2, H](../idea/consolidated-requirements.md#b-locked-technical-decisions) — locked deployment decisions
