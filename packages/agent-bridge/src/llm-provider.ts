/**
 * LLM provider abstraction — connects GenicUI MCP tools to any LLM provider.
 *
 * Each provider converts MCP tool definitions into the provider's native format,
 * sends the API request, and parses the response into a unified LLMResponse.
 *
 * @module @genicui/agent-bridge/llm-provider
 * @see {F42} — Agent bridge — platform-independent LLM integration
 */

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMMessage,
  LLMResponse,
  LLMToolCall,
  MCPToolDefinition,
} from './types.js';

// ---------------------------------------------------------------------------
// OpenAI function calling format
// ---------------------------------------------------------------------------

interface OpenAIFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface OpenAIRequest {
  model: string;
  messages: Record<string, unknown>[];
  tools?: OpenAIFunction[];
}

interface OpenAIChoice {
  message: {
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
}

/**
 * Convert MCP tool definitions to OpenAI function calling format.
 */
function toOpenAITools(tools: MCPToolDefinition[]): OpenAIFunction[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema as Record<string, unknown>,
  }));
}

/**
 * Convert LLM messages to OpenAI message format.
 */
function toOpenAIMessages(messages: LLMMessage[]): Record<string, unknown>[] {
  return messages.map((msg) => {
    const base = { role: msg.role, content: msg.content };
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        ...base,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.toolCallId,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
        })),
      };
    }
    if (msg.role === 'tool') {
      return {
        ...base,
        tool_call_id: msg.toolCallId,
      };
    }
    return base;
  });
}

/**
 * Parse OpenAI response into unified LLMResponse.
 */
function parseOpenAIResponse(choice: OpenAIChoice): LLMResponse {
  const toolCalls: LLMToolCall[] | undefined = choice.message.tool_calls?.map(
    (tc) => ({
      toolCallId: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }),
  );

  return {
    text: choice.message.content ?? undefined,
    toolCalls: toolCalls?.length ? toolCalls : undefined,
  };
}

// ---------------------------------------------------------------------------
// Anthropic tool calling format
// ---------------------------------------------------------------------------

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicRequest {
  model: string;
  messages: Array<{ role: string; content: string | Array<{ type: string; [key: string]: unknown }> }>;
  tools?: AnthropicTool[];
  max_tokens: number;
}

interface AnthropicToolUseBlock {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Convert MCP tool definitions to Anthropic tool format.
 */
function toAnthropicTools(tools: MCPToolDefinition[]): AnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Record<string, unknown>,
  }));
}

/**
 * Convert LLM messages to Anthropic message format.
 */
function toAnthropicMessages(messages: LLMMessage[]): AnthropicRequest['messages'] {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.toolCallId,
            content: msg.content,
          },
        ],
      };
    }
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: msg.toolCalls.map((tc) => ({
          type: 'tool_use',
          id: tc.toolCallId,
          name: tc.name,
          input: tc.args,
        })),
      };
    }
    return {
      role: msg.role,
      content: msg.content,
    };
  });
}

/**
 * Parse Anthropic response into unified LLMResponse.
 */
function parseAnthropicResponse(
  content: Array<{ type: string; [key: string]: unknown }>,
): LLMResponse {
  const toolCalls: LLMToolCall[] = [];
  let text: string | undefined;

  for (const block of content) {
    if (block.type === 'text') {
      text = (block.text as string) ?? text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        toolCallId: (block.id as string) ?? '',
        name: (block.name as string) ?? '',
        args: ((block.input as Record<string, unknown>) ?? {}) as Record<string, unknown>,
      });
    }
  }

  return {
    text: text?.trim() ? text : undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

/**
 * OpenAI provider using fetch-based API calls.
 */
class OpenAIProvider implements LLMProvider {
  #apiKey: string;
  #model: string;
  #baseUrl: string;
  #timeoutMs: number;

  constructor(config: LLMProviderConfig) {
    this.#apiKey = config.apiKey;
    this.#model = config.model;
    this.#baseUrl = config.baseUrl ?? 'https://api.openai.com';
    this.#timeoutMs = config.timeoutMs ?? 30_000;
  }

  async chat(messages: LLMMessage[], tools: MCPToolDefinition[]): Promise<LLMResponse> {
    const body: OpenAIRequest = {
      model: this.#model,
      messages: toOpenAIMessages(messages),
      tools: toOpenAITools(tools),
    };

    const response = await this.#fetch(
      `${this.#baseUrl}/v1/chat/completions`,
      body as unknown as Record<string, unknown>,
    );

    const data = response as { choices?: OpenAIChoice[] };
    if (!data.choices?.length) {
      throw new AgentBridgeError('openai', 'No choices returned from OpenAI API');
    }
    const firstChoice = data.choices[0];
    if (!firstChoice) {
      throw new AgentBridgeError('openai', 'First choice is undefined');
    }

    return parseOpenAIResponse(firstChoice);
  }

  async #fetch(url: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.#apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = await response.json() as Record<string, unknown>;
        throw new AgentBridgeError(
          'openai',
          `OpenAI API error ${response.status}: ${(error.error as Record<string, string>)?.message ?? response.statusText}`,
        );
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Anthropic provider using fetch-based API calls.
 */
class AnthropicProvider implements LLMProvider {
  #apiKey: string;
  #model: string;
  #baseUrl: string;
  #timeoutMs: number;
  #maxTokens: number;

  constructor(config: LLMProviderConfig) {
    this.#apiKey = config.apiKey;
    this.#model = config.model;
    this.#baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
    this.#timeoutMs = config.timeoutMs ?? 30_000;
    this.#maxTokens = 8192;
  }

  async chat(messages: LLMMessage[], tools: MCPToolDefinition[]): Promise<LLMResponse> {
    const body: AnthropicRequest = {
      model: this.#model,
      messages: toAnthropicMessages(messages),
      tools: toAnthropicTools(tools),
      max_tokens: this.#maxTokens,
    };

    const response = await this.#fetch(
      `${this.#baseUrl}/v1/messages`,
      body as unknown as Record<string, unknown>,
    );

    const data = response as { content?: Array<{ type: string; [key: string]: unknown }> };
    if (!data.content) {
      throw new AgentBridgeError('anthropic', 'No content returned from Anthropic API');
    }

    return parseAnthropicResponse(data.content);
  }

  async #fetch(url: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.#apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = await response.json() as Record<string, unknown>;
        const errorType = (error.type as string) ?? '';
        const errorMessage = (error.error as Record<string, string>)?.message ?? response.statusText;
        throw new AgentBridgeError('anthropic', `Anthropic API error: ${errorType}: ${errorMessage}`);
      }
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Error thrown by the agent bridge for LLM provider failures.
 */
export class AgentBridgeError extends Error {
  /** The provider that caused this error. */
  readonly provider: string;

  constructor(provider: string, message: string) {
    super(message);
    this.name = 'AgentBridgeError';
    this.provider = provider;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an LLM provider from configuration.
 * @param config — LLM provider configuration
 * @returns LLMProvider instance
 */
export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
    case 'openai-compatible':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
  }
}
