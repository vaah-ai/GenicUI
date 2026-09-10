---
title: Codebase Structure
---

# Codebase Structure (Docs-Relevant Slice)

```
.
├── .vaahagents/
│   ├── milestones-and-tasks/
│   │   └── milestone-05.1-documentation-site/   # Task specs, ACs, sub-tasks
│   └── requirements/
│       ├── specs/                                # Locked feature specs (F1–F67)
│       └── idea/                                 # Research, PoC learnings
├── examples/
│   ├── playground/                               # Nuxt 4 + PrimeVue demo app
│   └── docs/                                     # ★ Docus 5.13.0 layer (this work)
│       ├── nuxt.config.ts
│       ├── app/
│       │   ├── app.config.ts                     # Nuxt UI v4 brand tokens
│       │   └── pages/                            # Top-level routes
│       ├── content/                              # Markdown content (NC v3)
│       │   ├── index.md                          # Landing
│       │   └── docs/
│       │       ├── 1.getting-started/
│       │       ├── 2.concepts/
│       │       ├── 3.guide/
│       │       ├── 4.api/
│       │       └── 5.deployment/
│       ├── .navigation.yml                       # IA tree
│       └── package.json
├── packages/                                     # ★ Source-of-truth for API reference
│   ├── core/
│   ├── server/
│   ├── client/
│   ├── vite-plugin/
│   └── agent-bridge/
└── registries/
    └── primevue/                                 # ★ Source-of-truth for registry ref
```