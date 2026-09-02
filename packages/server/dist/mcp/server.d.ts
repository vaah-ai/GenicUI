/**
 * MCP server bootstrap — creates and configures the McpServer with 4 public tools.
 *
 * @module @genicui/server/mcp/server
 * @see {F13} — MCP server with 4 public tools
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
/**
 * Create an MCP server instance with 4 public tools registered.
 *
 * @returns Configured McpServer instance (not yet connected to a transport).
 */
export declare function createMcpServer(): McpServer;
/**
 * Create and start the MCP server on a stdio transport.
 * Used when the server runs as a standalone MCP process.
 *
 * @returns The running server instance.
 */
export declare function startStdioMcpServer(): Promise<McpServer>;
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
export declare function handleMcpRequest(message: JSONRPCMessage): Promise<JSONRPCMessage | undefined>;
//# sourceMappingURL=server.d.ts.map