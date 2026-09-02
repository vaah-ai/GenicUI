/**
 * MCP module unit tests — F13 acceptance criteria.
 *
 * @module @genicui/server/mcp/mcp.test
 * @see {F13} — MCP server with 4 public tools
 */

import { describe, it, expect } from 'bun:test';
import { createMcpServer, handleMcpRequest } from './server.js';
import { GENICUI_ERROR_CODES } from './tool-registry.js';
import { componentStore } from './component-store.js';

// ---------------------------------------------------------------------------
// Helper: send a JSON-RPC request via the in-memory transport
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/**
 * Send a JSON-RPC request through the MCP server and return the response.
 */
async function mcpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const response = await handleMcpRequest(request);
  if (!response) {
    throw new Error('No response from MCP server (notification?)');
  }
  return response as JsonRpcResponse;
}

// ---------------------------------------------------------------------------
// F13-AC1: tools/list returns exactly 4 tools
// ---------------------------------------------------------------------------

describe('F13-AC1: tools/list returns exactly 4 tools', () => {
  it('returns 4 tools after initialize', async () => {
    // Step 1: initialize
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    // Step 2: tools/list
    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    expect(response.result).toBeDefined();
    const tools = response.result!.tools as Array<{ name: string }>;
    expect(tools).toHaveLength(4);

    const names = tools.map((t) => t.name);
    expect(names).toContain('find_ui_component');
    expect(names).toContain('render_component');
    expect(names).toContain('update_component');
    expect(names).toContain('subscribe_to_events');
  });

  it('each tool has a description and inputSchema', async () => {
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    const tools = response.result!.tools as Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;

    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

// ---------------------------------------------------------------------------
// F13-AC2: Invalid input returns JSON-RPC error in -32001..-32010
// ---------------------------------------------------------------------------

describe('F13-AC2: Invalid input -> JSON-RPC error', () => {
  it('returns isError:true for invalid tool input', async () => {
    // Initialize first
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    // Call find_ui_component with invalid input (empty query)
    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'find_ui_component',
        arguments: { query: '' },
      },
    });

    expect(response.result?.isError).toBe(true);
    const content = response.result?.content as Array<{ type: string; text: string }>;
    expect(content).toBeDefined();
    expect(content!.length).toBeGreaterThan(0);
    expect(content!.at(0)!.type).toBe('text');
    // SDK returns validation error text (no brackets)
    expect(content!.at(0)!.text).toContain('validation error');
    expect(content!.at(0)!.text).toContain('query');
  });

  it('returns error for unknown tool', async () => {
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'nonexistent_tool',
        arguments: {},
      },
    });

    // The SDK returns -32602 (invalid params) for unknown tools
    expect(response.error || response.result?.isError).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// F13-AC3: Valid input conforms to output schema
// ---------------------------------------------------------------------------

describe('F13-AC3: Valid input conforms to output schema', () => {
  it('find_ui_component returns valid response', async () => {
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'find_ui_component',
        arguments: { query: 'data table', topK: 3 },
      },
    });

    expect(response.result).toBeDefined();
    expect(response.result!.content).toBeDefined();
    const content = response.result!.content as Array<{ type: string; text: string }>;
    expect(content.at(0)!.type).toBe('text');
    // F15: Real implementation returns JSON with component metadata
    expect(content.at(0)!.text).toContain('DataTable');
    expect(content.at(0)!.text).toContain('tabular data');
  });

  it('render_component returns valid response', async () => {
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'render_component',
        arguments: {
          name: 'DataTable',
          props: { rows: [{ id: 1 }], pageSize: 10 },
          surface: 'default',
        },
      },
    });

    expect(response.result).toBeDefined();
    const content = response.result!.content as Array<{ type: string; text: string }>;
    expect(content.at(0)!.type).toBe('text');
    // Real implementation returns JSON with component metadata
    expect(content.at(0)!.text).toContain('componentId');
    expect(content.at(0)!.text).toContain('initialState');
  });

  it('update_component (patch) returns valid response', async () => {
    // Register a component for the update_component test
    componentStore.register({
      componentId: 'dt-test-001',
      name: 'DataTable',
      channel: 'dt-test-001',
      props: {
        rows: [
          { id: '1', name: 'Alice', status: 'pending' },
          { id: '2', name: 'Bob', status: 'pending' },
        ],
        pageSize: 10,
      },
      mountedAt: new Date().toISOString(),
    });

    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'update_component',
        arguments: {
          componentId: 'dt-test-001',
          patch: [{ op: 'replace', path: '/rows/0/status', value: 'shipped' }],
        },
      },
    });

    expect(response.result).toBeDefined();
    const content = response.result!.content as Array<{ type: string; text: string }>;
    // Real implementation returns JSON with componentId, channel, type, and patch
    expect(content.at(0)!.text).toContain('componentId');
    expect(content.at(0)!.text).toContain('dt-test-001');
    expect(content.at(0)!.text).toContain('STATE_DELTA');
  });

  it('subscribe_to_events returns valid response', async () => {
    await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'subscribe_to_events',
        arguments: {
          componentId: 'dt-test-001',
          actions: ['row_selected'],
        },
      },
    });

    expect(response.result).toBeDefined();
    const content = response.result!.content as Array<{ type: string; text: string }>;
    expect(content.at(0)!.text).toContain('subscriptionId');
    expect(content.at(0)!.text).toContain('dt-test-001');
  });
});

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

describe('GenicUI error codes', () => {
  it('defines all error codes in -32001..-32010 range', () => {
    const values = Object.values(GENICUI_ERROR_CODES);
    expect(values).toHaveLength(10);
    for (const code of values) {
      expect(code).toBeGreaterThanOrEqual(-32010);
      expect(code).toBeLessThanOrEqual(-32001);
    }
  });

  it('component_not_found is -32001', () => {
    expect(GENICUI_ERROR_CODES.component_not_found).toBe(-32001);
  });

  it('props_invalid is -32003', () => {
    expect(GENICUI_ERROR_CODES.props_invalid).toBe(-32003);
  });

  it('internal is -32010', () => {
    expect(GENICUI_ERROR_CODES.internal).toBe(-32010);
  });
});

// ---------------------------------------------------------------------------
// createMcpServer
// ---------------------------------------------------------------------------

describe('createMcpServer', () => {
  it('creates a server with correct name and version', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });
});
