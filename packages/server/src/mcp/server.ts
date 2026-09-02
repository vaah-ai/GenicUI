/**
 * MCP server bootstrap — creates and configures the McpServer with 4 public tools.
 *
 * @module @genicui/server/mcp/server
 * @see {F13} — MCP server with 4 public tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import { registerToolDefinitions } from './tool-registry.js';

/** Server identification. */
const SERVER_NAME = 'genicui';
const SERVER_VERSION = '0.1.0';

/**
 * Create an MCP server instance with 4 public tools registered.
 *
 * @returns Configured McpServer instance (not yet connected to a transport).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerToolDefinitions(server);
  return server;
}

/**
 * Create and start the MCP server on a stdio transport.
 * Used when the server runs as a standalone MCP process.
 *
 * @returns The running server instance.
 */
export async function startStdioMcpServer(): Promise<McpServer> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Logging to stderr only — stdout is MCP transport
  console.error('[MCP] Server started on stdio transport');
  return server;
}

/**
 * Handle a single JSON-RPC request using an in-memory transport.
 *
 * Each HTTP request gets its own McpServer + transport pair (stateless mode).
 * The client sends a JSON-RPC message (initialize, tools/list, tools/call),
 * and we return the corresponding response.
 *
 * @param message - The incoming JSON-RPC request.
 * @returns The JSON-RPC response, or undefined for notifications.
 */
export async function handleMcpRequest(
  message: JSONRPCMessage,
): Promise<JSONRPCMessage | undefined> {
  // Create a fresh server and transport for each request (stateless).
  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  // Connect the server to its half of the transport.
  await server.connect(serverTransport);

  return new Promise<JSONRPCMessage | undefined>((resolve) => {
    // Listen for the response on the client side.
    let responded = false;
    clientTransport.onmessage = async (msg: JSONRPCMessage) => {
      if (!responded) {
        responded = true;
        resolve(msg);
      }
    };

    // Send the incoming request to the server via the client transport.
    void clientTransport.send(message);
  });
}
