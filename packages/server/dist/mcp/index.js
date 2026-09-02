/**
 * MCP module barrel export.
 *
 * @module @genicui/server/mcp
 * @see {F13} — MCP server with 4 public tools
 */
export { createMcpServer, startStdioMcpServer, handleMcpRequest } from './server.js';
export { registerToolDefinitions, GENICUI_ERROR_CODES } from './tool-registry.js';
// Trust-boundary validation (F14)
export { stripProtoKeys, hasProtoKeys, validateToolInput, checkToolInput, rejectOpenSchemas, RegistryValidationError, validatePatchPath, validatePatchOperations, } from '../validation/index.js';
//# sourceMappingURL=index.js.map