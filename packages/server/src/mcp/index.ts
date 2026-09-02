/**
 * MCP module barrel export.
 *
 * @module @genicui/server/mcp
 * @see {F13} — MCP server with 4 public tools
 */

export { createMcpServer, startStdioMcpServer, handleMcpRequest } from './server.js';
export { registerToolDefinitions, GENICUI_ERROR_CODES } from './tool-registry.js';
export type { GenicUIErrorCode } from './tool-registry.js';
