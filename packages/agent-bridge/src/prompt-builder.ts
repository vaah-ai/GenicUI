/**
 * System prompt builder — generates an LLM system prompt from MCP tool definitions.
 *
 * @module @genicui/agent-bridge/prompt-builder
 * @see {F42} — Agent bridge — platform-independent LLM integration
 */

import type { MCPToolDefinition } from './types.js';

/**
 * Build a system prompt from MCP tool definitions.
 *
 * The prompt instructs the LLM to:
 * 1. Use the available tools to render UI components
 * 2. Follow the GenicUI component lifecycle (find → render → update → subscribe)
 * 3. Provide structured responses
 *
 * @param tools — MCP tool definitions
 * @returns System prompt string
 */
export function buildSystemPrompt(tools: MCPToolDefinition[]): string {
  const toolDescriptions = tools
    .map((tool) => `- **${tool.name}**: ${tool.description}`)
    .join('\n');

  return [
    `You are a GenicUI agent that can render interactive UI components for the user.`,
    ``,
    `## Available Tools`,
    toolDescriptions,
    ``,
    `## How to Use Tools`,
    `1. **find_ui_component** — Search the component catalog to discover available UI components before rendering them.`,
    `2. **render_component** — Mount a component on the client. The server validates props and returns a componentId.`,
    `3. **update_component** — Update a mounted component using either JSON-Patch (patch) or shallow merge (merge).`,
    `4. **subscribe_to_events** — Subscribe to user interactions from mounted components.`,
    ``,
    `## Guidelines`,
    `- Always discover components with find_ui_component before rendering them.`,
    `- Provide valid props that match the component's schema.`,
    `- Use the returned componentId for subsequent updates and event subscriptions.`,
    `- Respond to component events with appropriate actions or follow-up tool calls.`,
  ].join('\n');
}
