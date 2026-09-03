/**
 * Agent bridge type definitions.
 *
 * @module @genicui/agent-bridge/types
 * @see {F42} — Agent bridge — platform-independent LLM integration
 */

/** Supported LLM provider types. */
export type ProviderType = 'openai' | 'anthropic' | 'openai-compatible';

/** LLM provider configuration. */
export interface LLMProviderConfig {
  /** Provider type (openai, anthropic, openai-compatible). */
  provider: ProviderType;
  /** API key for the LLM provider. */
  apiKey: string;
  /** Model name (e.g., 'gpt-4o', 'claude-sonnet-4-20250514'). */
  model: string;
  /** Optional base URL (for openai-compatible providers or custom endpoints). */
  baseUrl?: string;
  /** Optional timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Optional additional request headers. */
  headers?: Record<string, string>;
}

/** Agent bridge options. */
export interface AgentBridgeOptions {
  /** Maximum number of tool call iterations. Defaults to 10. */
  maxToolChain?: number;
  /** Optional system prompt override. If not provided, built from tool definitions. */
  systemPrompt?: string;
}

/** Tool definition from MCP server. */
export interface MCPToolDefinition {
  /** Tool name. */
  name: string;
  /** Human-readable description. */
  description: string;
  /** JSON Schema for tool input. */
  inputSchema: unknown;
}

/** A tool call returned by the LLM. */
export interface LLMToolCall {
  /** Unique identifier for this tool call. */
  toolCallId: string;
  /** Tool name to invoke. */
  name: string;
  /** Tool arguments as a JSON object. */
  args: Record<string, unknown>;
}

/** Result of executing a tool call through MCP. */
export interface ToolCallResult {
  /** The tool call identifier. */
  toolCallId: string;
  /** Tool execution result text. */
  result: string;
  /** Error message if the tool call failed. */
  error?: string;
}

/** A message in the LLM conversation. */
export interface LLMMessage {
  /** Message role. */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Message content (text). */
  content: string;
  /** Tool call ID (for tool role messages). */
  toolCallId?: string;
  /** Tool name (for assistant role messages with tool calls). */
  toolName?: string;
  /** Tool calls made by the assistant. */
  toolCalls?: LLMToolCall[];
}

/**
 * Response from an LLM provider.
 */
export interface LLMResponse {
  /** Response text (if the LLM returned text). Undefined when only tool calls are returned. */
  text: string | undefined;
  /** Tool calls requested by the LLM. Undefined when the LLM returns a text response. */
  toolCalls: LLMToolCall[] | undefined;
}

/**
 * LLM provider interface.
 * Implementations handle the conversion between MCP tool definitions and
 * the provider's native tool format, and manage the HTTP API call.
 */
export interface LLMProvider {
  /**
   * Send a chat request to the LLM provider.
   * @param messages — conversation messages
   * @param tools — MCP tool definitions to send to the LLM
   * @returns LLM response with text and/or tool calls
   */
  chat(messages: LLMMessage[], tools: MCPToolDefinition[]): Promise<LLMResponse>;
}

/**
 * MCP client interface.
 * Wraps the MCP SDK client to provide a simplified API for the agent bridge.
 */
export interface MCPClient {
  /**
   * Connect to the MCP endpoint.
   * @param url — MCP endpoint URL (e.g., http://localhost:3040/mcp)
   */
  connect(url: string): Promise<void>;
  /**
   * List available tools from the MCP server.
   * @returns Array of MCP tool definitions
   */
  listTools(): Promise<MCPToolDefinition[]>;
  /**
   * Call a tool on the MCP server.
   * @param name — tool name
   * @param arguments — tool arguments
   * @returns Tool result text
   */
  callTool(name: string, args: Record<string, unknown>): Promise<string>;
  /**
   * Close the MCP client connection.
   */
  close(): Promise<void>;
}
