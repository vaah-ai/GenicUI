/**
 * UAT — User Acceptance Tests for @genicui/agent-bridge
 *
 * These tests connect to a real GenicUI server and verify:
 * 1. MCP endpoint responds with correct JSON-RPC protocol
 * 2. Tool definitions are fetched correctly
 * 3. Tool calls execute through the server
 * 4. AgentBridge can connect and list tools
 * 5. LLM provider integration (mocked) works end-to-end
 *
 * Run: cd packages/agent-bridge && bun test uat/
 * Prerequisite: GenicUI server running on port 3040
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { MCPClientImpl } from '../src/mcp-client.js';
import { createLLMProvider, AgentBridgeError } from '../src/llm-provider.js';
import { buildSystemPrompt } from '../src/prompt-builder.js';
import type { LLMMessage, LLMToolCall, LLMResponse, MCPToolDefinition } from '../src/types.js';

const SERVER_URL = 'http://localhost:3040';
const MCP_URL = `${SERVER_URL}/mcp`;

// ---------------------------------------------------------------------------
// Helper: Send raw JSON-RPC to MCP endpoint with timeout
// ---------------------------------------------------------------------------

async function mcpRpc(method: string, params: Record<string, unknown> = {}, id = 1): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MCP HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// UAT-1: Server Health
// ---------------------------------------------------------------------------

describe('UAT-1: Server Health', () => {
  it('GET /health returns { status: "ok" }', async () => {
    const res = await fetch(`${SERVER_URL}/health`);
    expect(res.ok).toBeTrue();
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /mcp returns 404 for non-POST requests', async () => {
    const res = await fetch(`${SERVER_URL}/mcp`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ---------------------------------------------------------------------------
// UAT-2: MCP Protocol Initialization (raw HTTP)
// ---------------------------------------------------------------------------

describe('UAT-2: MCP Protocol Initialization', () => {
  it('POST initialize returns capabilities', async () => {
    const data = await mcpRpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'uat-client', version: '0.1.0' },
    });

    expect(data).toHaveProperty('result');
    const result = data.result as Record<string, unknown>;
    expect(result).toHaveProperty('serverInfo');
    expect(result).toHaveProperty('capabilities');
    expect(result.serverInfo).toHaveProperty('name');
  });
});

// ---------------------------------------------------------------------------
// UAT-3: Tool Definitions (raw HTTP)
// ---------------------------------------------------------------------------

describe('UAT-3: Tool Definitions', () => {
  let tools: MCPToolDefinition[] = [];

  beforeAll(async () => {
    const data = await mcpRpc('tools/list', {}, 1);
    const result = data.result as Record<string, unknown>;
    const rawTools = result.tools as Array<Record<string, unknown>> | undefined;

    tools = (rawTools ?? []).map((t) => ({
      name: t.name as string,
      description: t.description as string,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  });

  it('returns at least 4 tools (render, update, subscribe, find)', () => {
    expect(tools.length).toBeGreaterThanOrEqual(4);
  });

  it('has render_component tool with valid schema', () => {
    const renderTool = tools.find((t) => t.name === 'render_component');
    expect(renderTool).toBeDefined();
    const desc = renderTool!.description.toLowerCase();
    expect(desc.includes('render') || desc.includes('component')).toBeTrue();

    const schema = renderTool!.inputSchema as Record<string, unknown>;
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
  });

  it('has update_component tool', () => {
    expect(tools.find((t) => t.name === 'update_component')).toBeDefined();
  });

  it('has subscribe_to_events tool', () => {
    expect(tools.find((t) => t.name === 'subscribe_to_events')).toBeDefined();
  });

  it('has find_ui_component tool', () => {
    expect(tools.find((t) => t.name === 'find_ui_component')).toBeDefined();
  });

  it('all tools have valid inputSchema with type "object"', () => {
    for (const tool of tools) {
      const schema = tool.inputSchema as Record<string, unknown>;
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    }
  });

  it('buildSystemPrompt generates valid prompt from real tools', () => {
    const prompt = buildSystemPrompt(tools);
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain('render_component');
    expect(prompt).toContain('update_component');
  });
});

// ---------------------------------------------------------------------------
// UAT-4: MCPClientImpl Integration
// ---------------------------------------------------------------------------

describe('UAT-4: MCPClientImpl Integration', () => {
  let client: MCPClientImpl;

  beforeAll(async () => {
    client = new MCPClientImpl();
    await client.connect(MCP_URL);
  });

  afterAll(async () => {
    try {
      await client.close();
    } catch {
      // ignore
    }
  });

  it('connects to real MCP endpoint', () => {
    expect(client).toBeDefined();
  });

  it('listTools returns GenicUI tools', async () => {
    const tools = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('description');
    expect(tools[0]).toHaveProperty('inputSchema');
  });

  it('callTool executes find_ui_component', async () => {
    const result = await client.callTool('find_ui_component', {
      query: 'a data table with sortable columns',
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('callTool with invalid tool name throws error', async () => {
    await expect(client.callTool('invalid_tool_name', { foo: 'bar' }))
      .rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// UAT-5: AgentBridge Full Flow
// ---------------------------------------------------------------------------

describe('UAT-5: AgentBridge Full Flow', () => {
  it('AgentBridge.connect returns instance with tools', async () => {
    const { AgentBridge } = await import('../src/agent-bridge.js');

    const instance = await AgentBridge.connect(
      { provider: 'openai', apiKey: 'sk-uat-placeholder', model: 'gpt-4o' },
      MCP_URL,
    );

    const tools = instance.getTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);

    await instance.close();
  });

  it('AgentBridge.connect with custom system prompt', async () => {
    const { AgentBridge } = await import('../src/agent-bridge.js');

    const instance = await AgentBridge.connect(
      { provider: 'openai', apiKey: 'sk-uat-placeholder', model: 'gpt-4o' },
      MCP_URL,
      { systemPrompt: 'Custom UAT prompt', maxToolChain: 5 },
    );

    const tools = instance.getTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);

    await instance.close();
  });
});

// ---------------------------------------------------------------------------
// UAT-6: LLM Provider Abstraction
// ---------------------------------------------------------------------------

describe('UAT-6: LLM Provider Abstraction', () => {
  it('creates OpenAI provider with default config', () => {
    const provider = createLLMProvider({
      provider: 'openai',
      apiKey: 'sk-uat-test',
      model: 'gpt-4o',
    });
    expect(provider).toBeDefined();
    expect(typeof provider.chat).toBe('function');
  });

  it('creates Anthropic provider with default config', () => {
    const provider = createLLMProvider({
      provider: 'anthropic',
      apiKey: 'sk-ant-uat-test',
      model: 'claude-sonnet-5',
    });
    expect(provider).toBeDefined();
    expect(typeof provider.chat).toBe('function');
  });

  it('creates OpenAI-compatible provider with custom baseUrl', () => {
    const provider = createLLMProvider({
      provider: 'openai-compatible',
      apiKey: 'sk-custom',
      model: 'custom-model',
      baseUrl: 'https://api.custom.com',
      timeoutMs: 15_000,
    });
    expect(provider).toBeDefined();
  });

  it('OpenAI provider rejects invalid API key', async () => {
    const provider = createLLMProvider({
      provider: 'openai',
      apiKey: 'sk-invalid',
      model: 'gpt-4o',
    });

    await expect(provider.chat(
      [{ role: 'user', content: 'hello' }],
      [],
    )).rejects.toThrow();
  });

  it('Anthropic provider rejects invalid API key', async () => {
    const provider = createLLMProvider({
      provider: 'anthropic',
      apiKey: 'sk-invalid',
      model: 'claude-sonnet-5',
    });

    await expect(provider.chat(
      [{ role: 'user', content: 'hello' }],
      [],
    )).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// UAT-7: Error Handling and Edge Cases
// ---------------------------------------------------------------------------

describe('UAT-7: Error Handling and Edge Cases', () => {
  it('MCPClient throws on bad URL', async () => {
    const client = new MCPClientImpl();
    await expect(client.connect('http://localhost:9999/mcp')).rejects.toThrow();
  });

  it('AgentBridgeError carries provider info', () => {
    const err = new AgentBridgeError('openai', 'test error');
    expect(err.message).toBe('test error');
    expect(err.provider).toBe('openai');
    expect(err.name).toBe('AgentBridgeError');
  });

  it('MCPClient handles 500 errors gracefully', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response('Internal Server Error', { status: 500 }),
    });

    const client = new MCPClientImpl();
    await expect(client.connect(`http://localhost:${server.port}/mcp`)).rejects
      .toThrow('500');
    server.stop();
  });
});

// ---------------------------------------------------------------------------
// UAT-8: Type Safety and Interface Compliance
// ---------------------------------------------------------------------------

describe('UAT-8: Type Safety and Interface Compliance', () => {
  it('MCPToolDefinition has required fields', () => {
    const tool: MCPToolDefinition = {
      name: 'test',
      description: 'test tool',
      inputSchema: { type: 'object', properties: {} },
    };
    expect(tool.name).toBe('test');
    expect(tool.description).toBe('test tool');
    expect(tool.inputSchema).toBeDefined();
  });

  it('LLMMessage supports all roles', () => {
    const systemMsg: LLMMessage = { role: 'system', content: 'You are a bot' };
    const userMsg: LLMMessage = { role: 'user', content: 'Hello' };
    const assistantMsg: LLMMessage = { role: 'assistant', content: 'Hi there' };
    const toolMsg: LLMMessage = { role: 'tool', content: 'result', toolCallId: 'abc' };

    expect(systemMsg.role).toBe('system');
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
    expect(toolMsg.role).toBe('tool');
    expect(toolMsg.toolCallId).toBe('abc');
  });

  it('LLMToolCall has required fields', () => {
    const tc: LLMToolCall = {
      toolCallId: 'call_123',
      name: 'render_component',
      args: { componentName: 'Counter' },
    };
    expect(tc.toolCallId).toBe('call_123');
    expect(tc.name).toBe('render_component');
    expect('componentName' in tc.args).toBeTrue();
  });

  it('LLMResponse supports text and toolCalls', () => {
    const textResponse: LLMResponse = {
      text: 'Here is your component',
      toolCalls: undefined,
    };
    expect(textResponse.text).toBe('Here is your component');
    expect(textResponse.toolCalls).toBeUndefined();

    const toolResponse: LLMResponse = {
      text: undefined,
      toolCalls: [{ toolCallId: '1', name: 'test', args: {} }],
    };
    expect(toolResponse.text).toBeUndefined();
    expect(toolResponse.toolCalls?.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// UAT-9: End-to-End Tool Call Flow
// ---------------------------------------------------------------------------

describe('UAT-9: End-to-End Tool Call Flow', () => {
  let client: MCPClientImpl;

  beforeAll(async () => {
    client = new MCPClientImpl();
    await client.connect(MCP_URL);
  });

  afterAll(async () => {
    try {
      await client.close();
    } catch {
      // ignore
    }
  });

  it('find_ui_component returns results', async () => {
    const findResult = await client.callTool('find_ui_component', {
      query: 'a counter with increment and decrement buttons',
    });
    expect(findResult.length).toBeGreaterThan(0);
  });

  it('multiple concurrent tool calls work', async () => {
    const findResult1 = client.callTool('find_ui_component', { query: 'counter' });
    const findResult2 = client.callTool('find_ui_component', { query: 'table' });

    const [result1, result2] = await Promise.all([findResult1, findResult2]);

    expect(result1.length).toBeGreaterThan(0);
    expect(result2.length).toBeGreaterThan(0);
  });

  it('listTools returns consistent results', async () => {
    const tools1 = await client.listTools();
    const tools2 = await client.listTools();

    expect(tools1.length).toBe(tools2.length);
    expect(tools1[0].name).toBe(tools2[0].name);
  });
});
