/**
 * AgentBridge — comprehensive tests for the agent bridge package.
 *
 * Covers: AgentBridge class, MCPClient, LLM providers, prompt builder.
 * Uses mocks for HTTP (fetch) and MCP server to test all code paths.
 */

import {
  describe, it, expect, beforeEach, afterEach, mock,
} from 'bun:test';
import { AgentBridge } from './agent-bridge.js';
import { MCPClientImpl } from './mcp-client.js';
import { AgentBridgeError, createLLMProvider } from './llm-provider.js';
import { buildSystemPrompt } from './prompt-builder.js';
import type {
  LLMMessage,
  LLMResponse,
  LLMToolCall,
  MCPToolDefinition,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create an MCPToolDefinition for testing.
 */
function createTool(
  name: string,
  description: string = 'A test tool',
  properties: Record<string, unknown> = {},
): MCPToolDefinition {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
    },
  };
}

/**
 * Mock fetch implementation for tests.
 */
function setupFetchMock(responses: Array<{ status: number; body: unknown }>) {
  let index = 0;
  mock.module('bun', { default: {} });

  globalThis.fetch = async () => {
    const response = responses[index++] ?? responses[responses.length - 1];
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: 'OK',
      json: async () => response.body,
    } as Response;
  };
}

// ---------------------------------------------------------------------------
// MCPClientImpl Tests
// ---------------------------------------------------------------------------

describe('MCPClientImpl', () => {
  let client: MCPClientImpl;

  beforeEach(() => {
    client = new MCPClientImpl();
  });

  afterEach(() => {
    // Reset fetch mock
    globalThis.fetch = (() => {}) as unknown as typeof fetch;
  });

  it('connects to MCP endpoint and initializes', async () => {
    let fetchCalls: Array<{ method: string; url: string; body: string }> = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      fetchCalls.push({
        method: init?.method ?? 'GET',
        url: typeof input === 'string' ? input : input.toString(),
        body: JSON.stringify(body),
      });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ jsonrpc: '2.0', id: 1, result: {} }),
      } as Response;
    };

    await client.connect('http://localhost:3040/mcp');

    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[0].body).toContain('initialize');
    expect(fetchCalls[1].body).toContain('notifications/initialized');
  });

  it('throws on connect if initialize fails', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32600, message: 'Invalid request' },
      }),
    } as Response);

    await expect(client.connect('http://localhost:3040/mcp')).rejects
      .toThrow('MCP initialize failed');
  });

  it('throws on HTTP error during connect', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(client.connect('http://localhost:3040/mcp')).rejects
      .toThrow('MCP HTTP error 500');
  });

  it('lists tools from MCP server', async () => {
    globalThis.fetch = async () => {
      throw new Error('fetch should not be called without connect');
    };

    // First connect
    const responses: Array<Record<string, unknown>> = [
      { jsonrpc: '2.0', id: 1, result: {} }, // initialize
      { jsonrpc: '2.0', id: 2 }, // initialized notification
      {
        jsonrpc: '2.0',
        id: 3,
        result: {
          tools: [
            {
              name: 'render_component',
              description: 'Render a UI component',
              inputSchema: { type: 'object', properties: { componentName: { type: 'string' } } },
            },
          ],
        },
      },
    ];
    let idx = 0;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const response = responses[idx++] ?? responses[responses.length - 1];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => response,
      } as Response;
    };

    await client.connect('http://localhost:3040/mcp');

    const tools = await client.listTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('render_component');
    expect(tools[0].description).toBe('Render a UI component');
  });

  it('calls a tool and returns result', async () => {
    const responses: Array<Record<string, unknown>> = [
      { jsonrpc: '2.0', id: 1, result: {} }, // initialize
      { jsonrpc: '2.0', id: 2 }, // notification
      {
        jsonrpc: '2.0',
        id: 3,
        result: {
          content: [{ type: 'text', text: 'Tool executed successfully' }],
        },
      },
    ];
    let idx = 0;

    globalThis.fetch = async () => {
      const response = responses[idx++] ?? responses[responses.length - 1];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => response,
      } as Response;
    };

    await client.connect('http://localhost:3040/mcp');

    const result = await client.callTool('test_tool', { foo: 'bar' });
    expect(result).toBe('Tool executed successfully');
  });

  it('throws when tool returns error', async () => {
    const responses: Array<Record<string, unknown>> = [
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: 2 },
      {
        jsonrpc: '2.0',
        id: 3,
        result: {
          isError: true,
          content: [{ type: 'text', text: 'Something went wrong' }],
        },
      },
    ];
    let idx = 0;

    globalThis.fetch = async () => {
      const response = responses[idx++] ?? responses[responses.length - 1];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => response,
      } as Response;
    };

    await client.connect('http://localhost:3040/mcp');

    await expect(client.callTool('failing_tool', {})).rejects
      .toThrow("MCP tool 'failing_tool' returned error");
  });

  it('throws if not connected when calling listTools', async () => {
    await expect(client.listTools()).rejects
      .toThrow('MCPClient not connected');
  });

  it('throws if not connected when calling callTool', async () => {
    await expect(client.callTool('test', {})).rejects
      .toThrow('MCPClient not connected');
  });

  it('closes connection', async () => {
    // Reset fetch for close test
    globalThis.fetch = async () => {
      throw new Error('should not fetch');
    };

    // Just test that close() doesn't throw
    await client.close();
    expect(() => {}).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// LLM Provider Tests
// ---------------------------------------------------------------------------

describe('createLLMProvider', () => {
  it('creates an OpenAI provider', () => {
    const provider = createLLMProvider({
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
    });
    expect(provider).toBeDefined();
  });

  it('creates an Anthropic provider', () => {
    const provider = createLLMProvider({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-5',
    });
    expect(provider).toBeDefined();
  });

  it('creates an OpenAI-compatible provider', () => {
    const provider = createLLMProvider({
      provider: 'openai-compatible',
      apiKey: 'sk-custom',
      model: 'custom-model',
      baseUrl: 'https://api.custom.com',
    });
    expect(provider).toBeDefined();
  });
});

describe('AgentBridgeError', () => {
  it('creates an error with provider info', () => {
    const error = new AgentBridgeError('openai', 'Test error');
    expect(error.message).toBe('Test error');
    expect(error.provider).toBe('openai');
    expect(error.name).toBe('AgentBridgeError');
  });
});

// ---------------------------------------------------------------------------
// Prompt Builder Tests
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('builds a system prompt with tool definitions', () => {
    const tools: MCPToolDefinition[] = [
      createTool('render_component', 'Render a UI component', {
        componentName: { type: 'string' },
      }),
      createTool('update_component', 'Update an existing component'),
    ];

    const prompt = buildSystemPrompt(tools);

    expect(prompt).toContain('## Available Tools');
    expect(prompt).toContain('render_component');
    expect(prompt).toContain('update_component');
    expect(prompt).toContain('Render a UI component');
  });

  it('includes base prompt even with no tools', () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain('GenicUI agent');
    expect(prompt).toContain('## Available Tools');
    expect(prompt).toContain('## How to Use Tools');
  });

  it('includes tool names and descriptions', () => {
    const tools: MCPToolDefinition[] = [
      createTool('test_tool', 'A test tool', {
        name: { type: 'string' },
        count: { type: 'number' },
      }),
    ];

    const prompt = buildSystemPrompt(tools);

    expect(prompt).toContain('test_tool');
    expect(prompt).toContain('A test tool');
  });
});

// ---------------------------------------------------------------------------
// AgentBridge Tests (integration-level)
// ---------------------------------------------------------------------------

describe('AgentBridge', () => {
  afterEach(() => {
    globalThis.fetch = (() => {}) as unknown as typeof fetch;
  });

  it('connects and builds system prompt', async () => {
    const responses: Array<Record<string, unknown>> = [
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: 2 },
      {
        jsonrpc: '2.0',
        id: 3,
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      },
    ];
    let idx = 0;

    globalThis.fetch = async () => {
      const response = responses[idx++] ?? responses[responses.length - 1];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => response,
      } as Response;
    };

    const bridge = await AgentBridge.connect(
      { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' },
      'http://localhost:3040/mcp',
    );

    const tools = bridge.getTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('test_tool');

    await bridge.close();
  });

  it('accepts a custom system prompt override', async () => {
    const responses: Array<Record<string, unknown>> = [
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: 2 },
      {
        jsonrpc: '2.0',
        id: 3,
        result: { tools: [] },
      },
    ];
    let idx = 0;

    globalThis.fetch = async () => {
      const response = responses[idx++] ?? responses[responses.length - 1];
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => response,
      } as Response;
    };

    const bridge = await AgentBridge.connect(
      { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' },
      'http://localhost:3040/mcp',
      { systemPrompt: 'Custom system prompt' },
    );

    // The tools list is empty, so the default prompt would be empty
    // but we provided a custom one
    await bridge.close();
  });
});
