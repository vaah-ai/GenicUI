# Task M5-T5 — Agent Bridge Package

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F42 (Agent bridge — platform-independent LLM integration)
> **Priority:** Critical
> **Status:** ⚪ Not Started
> **Estimated Effort:** 3-5 days

## Description

Create `packages/agent-bridge/` — a platform-agnostic agent bridge that uses `@modelcontextprotocol/sdk` to connect any LLM provider (OpenAI, Anthropic, OpenAI-compatible) to GenicUI MCP tools. This enables GenicUI to work with any AI agent framework (LangGraph, CrewAI, Claude Code, etc.) without custom integration code.

The agent bridge is a thin wrapper — not a custom LLM framework. It fetches MCP tool definitions from the GenicUI server, calls the LLM with those tools, and routes tool calls through the MCP SDK.

## Task Goals

- `AgentBridge` class: `connect(llmConfig, mcpEndpoint) → execute(prompt)`
- Uses `@modelcontextprotocol/sdk` as the MCP client (standard library)
- Supports OpenAI, Anthropic, and OpenAI-compatible providers (pluggable)
- Fetches MCP tool definitions from GenicUI server
- Routes LLM tool calls to MCP endpoint, returns results
- Single responsibility: bridge between LLM and MCP tools

## Implementation Plan

### Steps

1. Create `packages/agent-bridge/` package with `package.json`, `tsconfig.json`
2. Install `@modelcontextprotocol/sdk` as primary dependency
3. Implement `AgentBridge` class with `connect()` and `execute()` methods
4. Implement `fetchToolDefinitions()` — retrieves MCP tool schemas from GenicUI server
5. Implement `callLLM()` — calls LLM API with system prompt + tools + messages
6. Implement `executeToolCall()` — routes LLM tool calls through MCP SDK
7. Implement system prompt builder from registry schemas
8. Add LLM provider abstraction (OpenAI, Anthropic, OpenAI-compatible)
9. Write unit tests: mock LLM responses, verify MCP tool calls
10. Write integration tests: end-to-end flow with mock server
11. Run `bun run test` — all tests green
12. Run `bun run lint` — zero errors
13. Run `bun run build` — tsc clean

## Acceptance Criteria

- [ ] `AgentBridge` class connects to MCP endpoint and fetches tool definitions
- [ ] `AgentBridge` calls LLM with correct system prompt (built from registry schemas)
- [ ] LLM tool calls are routed through MCP SDK and return results
- [ ] Supports OpenAI, Anthropic, and OpenAI-compatible providers
- [ ] Error handling: LLM failures, MCP connection errors, timeout handling
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds — tsc clean

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] `bun run build` succeeds — tsc clean

## Dependencies

- **Requires:** M3-T1 (F13 — MCP server), M5-T1 (F37 — registry schemas)
- **Blocks:** M5-T6 (M5-T6 uses agent bridge in the playground)
