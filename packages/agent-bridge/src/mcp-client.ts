/**
 * MCP client wrapper — connects to a GenicUI server via MCP Streamable HTTP.
 *
 * Provides a simplified interface: connect, listTools, callTool, close.
 * Uses fetch-based JSON-RPC calls to the MCP endpoint.
 *
 * @module @genicui/agent-bridge/mcp-client
 * @see {F42} — Agent bridge — platform-independent LLM integration
 */

import type { MCPClient, MCPToolDefinition } from './types.js';

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

/**
 * JSON-RPC request with an ID for response matching.
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC response with a matching ID.
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/** Request ID counter. */
let _requestId = 1;

// ---------------------------------------------------------------------------
// MCPClient implementation using fetch-based JSON-RPC
// ---------------------------------------------------------------------------

/**
 * MCP client that connects to a GenicUI server via Streamable HTTP transport.
 *
 * Uses fetch to POST JSON-RPC requests to the MCP endpoint.
 * The server returns responses as JSON, which we parse into our types.
 *
 * This avoids depending on @modelcontextprotocol/client SDK directly
 * and instead uses the simpler fetch-based approach for HTTP transport.
 */
export class MCPClientImpl implements MCPClient {
  #url: string = '';
  #connected = false;
  #initialized = false;

  /**
   * Connect to the MCP endpoint.
   *
   * Performs MCP protocol initialization: sends an initialize request,
   * then an initialized notification, then the client is ready for tool calls.
   *
   * @param url — MCP endpoint URL (e.g., http://localhost:3040/mcp)
   */
  async connect(url: string): Promise<void> {
    this.#url = url;

    // MCP initialize request
    const initResponse = await this.#post<JsonRpcRequest, JsonRpcResponse>({
      jsonrpc: '2.0',
      id: _requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'genicui-agent-bridge', version: '0.1.0' },
      },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialize failed: ${initResponse.error.message}`);
    }

    // Send initialized notification — fire and forget, no response expected
    // for notifications. The server may not respond, so we don't await.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetch(this.#url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      }),
    });

    this.#connected = true;
    this.#initialized = true;
  }

  /**
   * List available tools from the MCP server.
   *
   * Sends a tools/list request and parses the response into MCPToolDefinition[].
   *
   * @returns Array of MCP tool definitions
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.#connected) {
      throw new Error('MCPClient not connected. Call connect() first.');
    }

    const response = await this.#post<JsonRpcRequest, JsonRpcResponse>({
      jsonrpc: '2.0',
      id: _requestId++,
      method: 'tools/list',
      params: {},
    });

    if (response.error) {
      throw new Error(`MCP tools/list failed: ${response.error.message}`);
    }

    const result = response.result as Record<string, unknown>;
    const tools = result.tools as Array<Record<string, unknown>> | undefined;

    return (tools ?? []).map((t) => ({
      name: t.name as string,
      description: t.description as string,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  /**
   * Call a tool on the MCP server.
   *
   * Sends a tools/call request and returns the text result.
   *
   * @param name — tool name
   * @param args — tool arguments
   * @returns Tool result text
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.#connected) {
      throw new Error('MCPClient not connected. Call connect() first.');
    }

    const response = await this.#post<JsonRpcRequest, JsonRpcResponse>({
      jsonrpc: '2.0',
      id: _requestId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    });

    if (response.error) {
      throw new Error(`MCP tools/call failed: ${response.error.message}`);
    }

    const result = response.result as Record<string, unknown>;
    const content = result.content as Array<Record<string, unknown>> | undefined;

    if (result.isError as boolean) {
      const errorText = (content ?? [])
        .map((c) => c.text as string)
        .join('\n');
      throw new Error(`MCP tool '${name}' returned error: ${errorText}`);
    }

    return (content ?? [])
      .map((c) => c.text as string)
      .join('\n');
  }

  /**
   * Close the MCP client connection.
   */
  async close(): Promise<void> {
    this.#connected = false;
    this.#initialized = false;
  }

  // -----------------------------------------------------------------------
  // Internal: HTTP POST helper
  // -----------------------------------------------------------------------

  /**
   * Send a JSON-RPC POST request to the MCP endpoint.
   *
   * @param request — the JSON-RPC request
   * @returns parsed response of type T
   */
  async #post<_, T>(request: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.#url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
