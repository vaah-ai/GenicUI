# Milestone M6 — Deployment: Cloudflare, Bun, Durable Objects, Nitro

> **Roadmap phase:** Deployment
> **Roadmap week:** W11-W12
> **Priority:** High
> **Status:** ⚪ Not Started
> **Estimated Effort:** 10-14 days (2 weeks × single maintainer)
> **Dependencies:** M1 (F5 — session store, F9 — server), M2 (F10 — WS), M4 (F21 — Web Component via F62b)

## Objective

Ship the deployment targets: Cloudflare Workers + Durable Objects (primary), Bun self-host binary (escape hatch), DODurableObjectStore (DO session backend), and Nitro/Nuxt binding (Vercel deploy). This makes the framework deployable. Corresponds to W11-W12 in [roadmap.md](../../../.vaahagents/requirements/specs/roadmap.md#week-11-cloudflare-workers-deploy-f61).

## Success Criteria

- [ ] `wrangler deploy` succeeds; deployed Worker serves `/health`, `/ws`
- [ ] DO state persists across redeploy (F61-AC2)
- [ ] Single binary runs without Bun installed (F62-AC1)
- [ ] Binary size <50MB (F62-AC2)
- [ ] WS upgrade via Nitro experimental websocket (F64-AC1)

## Tasks

- M6-T1 — Cloudflare Workers + DO deployment (maps to manifest F61)
- M6-T2 — Bun self-host deployment (maps to manifest F62)
- M6-T3 — DODurableObjectStore (CF DO session backend) (maps to manifest F62b)
- M6-T4 — Nitro/Nuxt binding (maps to manifest F64)

## Dependencies

- **Blocks:** None — final milestone before v0.1.0 tag
- **Requires:** M1-T1 (F9 — server), M1-T5 (F5 — session store)

## Manifest Cross-References

- Features: F61, F62, F62b, F64
- Quality attributes covered: Reliability (F61-AC2), Performance (F61-AC1, F62-AC3), Compatibility (F64)
- Pipeline handoff invariants honoured: Cloudflare Workers + DO primary (§L2)
