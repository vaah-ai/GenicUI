---
title: Project Context Reference
purpose: Key project metadata and orientation for GenicUI
---

# Project Context

| Key           | Value                                          |
| ------------- | ---------------------------------------------- |
| **Project**   | GenicUI                                        |
| **Tagline**   | "The protocol that lets AI agents use your UI." |
| **Root**      | `/Users/pk/Projects/GenicUI`                   |
| **Runtime**   | Node.js / Bun (ESM)                           |
| **Phase**     | PoC — working end-to-end on macOS with Claude Code. Framework not yet packaged for npm. |
| **Specs**     | 29 Testable MVP features, 93 acceptance criteria, 8-12 week estimate |
| **Architecture** | 3 core packages + N community registries, MCP-native, WebSocket transport |
| **UI**        | Chat surface — components render inline in conversation transcript |
| **Registry**  | PrimeVue DataTable (MVP only) — Mantine/shadcn/Skeleton planned for Phase 2 |
| **Deploy**    | Cloudflare Workers + Durable Objects (primary), Bun self-host (fallback) |
| **License**   | Private — internal PoC                         |

**Key characteristics:**

- **Library-agnostic** — wrap any UI library; the agent never knows which
- **Agent-agnostic** — works with any MCP-capable agent (Claude Code, GPT, custom)
- **Journey-agnostic** — ecommerce, support, ops, internal tools — same framework
- **Schema-as-source-of-truth** — one declaration generates TypeScript types, MCP tool definitions, and agent prompt fragments

**Current working state:** PoC with 3 components (Counter, TodoList, CartViewer), MCP server with 6 tools, WebSocket bridge, and a browser-driven chat surface that spawns `claude --print` per turn.
