---
title: Codebase Structure Reference
purpose: Directory tree for GenicUI
---

# Codebase Structure

```
GenicUI/
├── ai-base-prompts/             # AI prompt generators (requirements, planning, execution)
│   ├── 0-brainstorming.md
│   ├── 1-requirements-gathering.md
│   ├── 2-plan-generator-optional.md
│   ├── 3-revise-plan-optional.md
│   ├── 4-milestones-and-tasks-generator.md
│   ├── 5-task-execution-generator.md
│   ├── 6-agent-system-prompts-generator.md
│   ├── 6-tests-generator.md
│   ├── 7-feature-playwright-e2e-prompt-generator.md
│   ├── 8-codebase-playwright-e2e-prompt-generator.md
│   ├── guidelines-for-claude-prompts.md
│   └── claude-mcp-server-setup.md
├── .vaahagents/prompts/                  # Generated task execution prompts
│   ├── prompt-task-execution.md  # Lean orchestrator (this system)
│   └── prompt-task-execution-steps/  # Step files + reference files
├── docs/
│   ├── idea/                    # Research, requirements, PoC learnings
│   │   ├── README.md             # GenicUI overview and positioning
│   │   ├── architecture.md       # System design (PoC-era)
│   │   ├── consolidated-requirements.md  # Locked decisions (27 decisions)
│   │   ├── adaptor-spec.md       # Component adaptor contract
│   │   ├── agent-protocol.md     # MCP tool contracts
│   │   ├── dx.md                 # Developer experience
│   │   ├── four-agnostic.md      # Library/agent/journey/provider agnostic design
│   │   ├── examples-cartviewer.md  # CartViewer in 3 frameworks
│   │   ├── lessons-learned.md    # PoC build lessons
│   │   ├── tech-stack-research.md  # Tech stack research
│   │   ├── mcp-ecosystem-research.md
│   │   ├── market-research.md
│   │   ├── package-distribution.md   # 3 packages + N registries
│   │   └── ... (23 docs total)
│   ├── requirements/
│   │   ├── idea/
│   │   └── specs/
│   └── specs/                   # Locked Testable MVP specifications
│       ├── README.md             # Spec index
│       ├── manifest.json         # Cross-reference manifest (29 features, 93 ACs)
│       ├── features.md           # Feature catalog (29 features, 93 ACs)
│       ├── architecture.md       # System architecture
│       ├── roadmap.md            # 12-week implementation plan
│       ├── deployment.md         # Cloudflare + Bun self-host
│       ├── testing-strategy.md   # Test pyramid, coverage targets
│       ├── glossary.md           # Vocabulary (345 terms)
│       ├── security.md           # Security model + threat model
│       ├── completion-summary.md
│       └── features/             # Per-feature specs (22 files)
├── poc/                         # Working proof-of-concept
│   ├── adaptors/                # Component adaptors (Counter, TodoList, CartViewer)
│   │   ├── base-adaptor.mjs
│   │   ├── counter.mjs
│   │   ├── todo-list.mjs
│   │   └── cart-viewer.mjs
│   ├── server/                  # MCP server + chat backend
│   │   ├── index.mjs            # MCP server entry point
│   │   ├── registry.mjs         # Component registry + keyword search
│   │   ├── lifecycle.mjs        # Mount/update/unmount/state tracking
│   │   ├── mcp-bridge.mjs       # WebSocket bridge (browser ↔ MCP)
│   │   ├── chat-handler.mjs     # Spawns claude --print per turn
│   │   ├── chat-parser.mjs      # stdout line → typed event mapper
│   │   ├── chat-broadcaster.mjs # Per-session SSE event emitter
│   │   ├── smoke-test.mjs       # 15 in-process assertions
│   │   └── chat-parser.test.mjs # Parser unit tests
│   ├── web/                     # Chat surface (single-page app)
│   │   ├── index.html
│   │   ├── app.mjs              # EventSource client + DOM mounting
│   │   └── styles.css
│   ├── fake-browser.mjs
│   ├── counter.html
│   └── README.md
├── package.json                 # Project manifest (ESM, @modelcontextprotocol/sdk, ws)
├── package-lock.json
├── start.sh                     # Dev launcher (static server + MCP server)
└── README.md                    # Project overview + install guide
```

**Planned monorepo structure (production — not yet implemented):**

```
genicui/
├── packages/
│   ├── core/           # @genicui/core — framework-agnostic logic
│   ├── server/         # @genicui/server — WebSocket + HTTP server
│   └── client/         # @genicui/client — browser-side render
├── registries/
│   └── primevue/       # @genicul-primevue/registry
└── examples/
    └── nuxt-primevue/  # Working dev environment
```
