/**
 * Agent Bridge — connects any LLM provider to GenicUI MCP tools.
 *
 * Flow: connect(MCP endpoint) → fetch tools → call LLM → route tool calls → return results.
 *
 * @module @genicui/agent-bridge/agent-bridge
 * @see {F42} — Agent bridge — platform-independent LLM integration
 */

import type {
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  AgentBridgeOptions,
  MCPClient,
  MCPToolDefinition,
  LLMToolCall,
  ToolCallResult,
} from './types.js';

import { createLLMProvider } from './llm-provider.js';
import { MCPClientImpl } from './mcp-client.js';
import { buildSystemPrompt } from './prompt-builder.js';

/**
 * Agent Bridge — a thin wrapper that connects any LLM provider to GenicUI MCP tools.
 *
 * Usage:
 * ```ts
 * const bridge = await AgentBridge.connect(
 *   { provider: 'openai', apiKey: 'sk-...', model: 'gpt-4o' },
 *   'http://localhost:3040/mcp',
 * );
 * const response = await bridge.execute('Show me a data table with orders');
 * ```
 */
export class AgentBridge {
  #provider: LLMProvider;
  #mcpClient: MCPClient;
  #tools: MCPToolDefinition[] = [];
  #systemPrompt: string;
  #maxToolChain: number;
  #connected = false;

  private constructor(
    provider: LLMProvider,
    mcpClient: MCPClient,
    options: AgentBridgeOptions,
  ) {
    this.#provider = provider;
    this.#mcpClient = mcpClient;
    this.#maxToolChain = options.maxToolChain ?? 10;
    this.#systemPrompt = options.systemPrompt ?? '';
  }

  /**
   * Connect to an MCP endpoint and initialize the agent bridge.
   *
   * @param llmConfig — LLM provider configuration
   * @param mcpEndpoint — MCP server URL (e.g., http://localhost:3040/mcp)
   * @param options — optional agent bridge settings
   * @returns Connected AgentBridge instance
   */
  static async connect(
    llmConfig: LLMProviderConfig,
    mcpEndpoint: string,
    options?: AgentBridgeOptions,
  ): Promise<AgentBridge> {
    const provider = createLLMProvider(llmConfig);
    const mcpClient = new MCPClientImpl();

    // Connect to MCP server
    await mcpClient.connect(mcpEndpoint);

    // Fetch tool definitions from MCP server
    const tools = await mcpClient.listTools();

    const bridge = new AgentBridge(provider, mcpClient, options ?? {});
    bridge.#tools = tools;
    bridge.#connected = true;

    // Build system prompt if not overridden
    if (!options?.systemPrompt) {
      bridge.#systemPrompt = buildSystemPrompt(tools);
    }

    return bridge;
  }

  /**
   * Execute a prompt through the LLM, routing tool calls through MCP.
   *
   * The execution loop:
   * 1. Call LLM with messages + tools
   * 2. If LLM returns tool calls, execute each via MCP
   * 3. Add results to messages, repeat
   * 4. When LLM returns text (no tool calls), return as final response
   *
   * @param prompt — user prompt
   * @returns Final LLM response text
   */
  async execute(prompt: string): Promise<string> {
    if (!this.#connected) {
      throw new Error('AgentBridge not connected. Call connect() first.');
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: this.#systemPrompt },
      { role: 'user', content: prompt },
    ];

    let iterationCount = 0;
    while (iterationCount < this.#maxToolChain) {
      iterationCount++;

      // Call the LLM
      const response = await this.#provider.chat(messages, this.#tools);

      // If no tool calls, return the text response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response.text ?? '[No response from LLM]';
      }

      // Execute each tool call through MCP
      const toolResults: ToolCallResult[] = await this.#executeToolCalls(
        response.toolCalls,
      );

      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: '',
        toolCalls: response.toolCalls,
      });

      // Add tool results
      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: result.error ?? result.result,
          toolCallId: result.toolCallId,
        });
      }
    }

    throw new Error(
      `AgentBridge exceeded maximum tool chain (${this.#maxToolChain} iterations)`,
    );
  }

  /**
   * Execute LLM tool calls through the MCP client.
   * @param toolCalls — tool calls from the LLM
   * @returns results for each tool call
   */
  async #executeToolCalls(toolCalls: LLMToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const tc of toolCalls) {
      try {
        const result = await this.#mcpClient.callTool(tc.name, tc.args);
        results.push({
          toolCallId: tc.toolCallId,
          result,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          toolCallId: tc.toolCallId,
          result: '',
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Get the current tool definitions from the MCP server.
   * @returns list of tool definitions
   */
  getTools(): MCPToolDefinition[] {
    return [...this.#tools];
  }

  /**
   * Close the agent bridge and release resources.
   */
  async close(): Promise<void> {
    if (this.#connected) {
      await this.#mcpClient.close();
      this.#connected = false;
    }
  }
}
