/**
 * @genicui/agent-bridge — platform-agnostic LLM integration via MCP.
 *
 * Connects any LLM provider (OpenAI, Anthropic, OpenAI-compatible) to
 * GenicUI MCP tools. Uses the MCP SDK as the transport layer.
 *
 * @module @genicui/agent-bridge
 * @see {F42} — Agent bridge — platform-independent LLM integration
 *
 * @example
 * ```ts
 * import { AgentBridge } from '@genicui/agent-bridge';
 *
 * const bridge = await AgentBridge.connect(
 *   { provider: 'openai', apiKey: 'sk-...', model: 'gpt-4o' },
 *   'http://localhost:3040/mcp',
 * );
 *
 * const response = await bridge.execute('Show me a data table with orders');
 * console.log(response);
 *
 * await bridge.close();
 * ```
 */

export { AgentBridge } from './agent-bridge.js';
export { AgentBridgeError, createLLMProvider } from './llm-provider.js';
export { buildSystemPrompt } from './prompt-builder.js';
export { MCPClientImpl } from './mcp-client.js';

// Re-export types
export type {
  LLMProvider,
  LLMProviderConfig,
  AgentBridgeOptions,
  MCPToolDefinition,
  LLMMessage,
  LLMResponse,
  LLMToolCall,
  ToolCallResult,
  MCPClient,
  ProviderType,
} from './types.js';
