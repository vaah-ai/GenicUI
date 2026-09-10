---
title: Project Context
---

# Project Context

## What GenicUI is

A **generative agentic UI framework**: installable into any AI project to render custom UI + bridge AI agents. The framework turns agent tool calls into live, interactive widgets using a registry of declarative component definitions.

## The 5 packages + 1 registry

| Package | Role | Used by API ref |
|---|---|---|
| `@genicui/core` | JSON-Patch engine, AG-UI types, type system | Yes |
| `@genicui/server` | MCP server, WebSocket transport, trust boundary | Yes |
| `@genicui/client` | Web Component runtime, prop/event bridge | Yes |
| `@genicui/vite-plugin` | Dev-time AST scanner, HMR | Yes |
| `@genicui/agent-bridge` | LLM ↔ MCP plumbing, Claude Code spawn | Yes |
| `@genicul-primevue/registry` | PrimeVue component catalog | Yes (as registry) |

Plus **4 MCP tools** — `render_component`, `update_component`, `subscribe_to_events`, `find_ui_component` — whose JSON-RPC schemas must appear in the API reference.

## Locked specs live in `.vaahagents/requirements/specs/`

The doc site quotes from there, NOT from `docs/specs/` (the legacy location). If you find a cross-ref to `docs/specs/...` in an old page, fix it.

## Public docs URL

Target: `https://genicui.dev/` (or chosen alternative — confirm in Step 2).