/**
 * Tool registry — registers MCP tool definitions with stub handlers on the McpServer.
 *
 * Uses Zod schemas for the MCP surface (required by @modelcontextprotocol/sdk).
 * TypeBox schemas in tool-schemas.ts are used for the server-level trust-boundary
 * validation (see F14 — trust-boundary validation).
 *
 * @module @genicui/server/mcp/tool-registry
 * @see {F13} — MCP server with 4 public tools
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * GenicUI-specific JSON-RPC error codes.
 * -32001..-32010
 *
 * @see {consolidated-requirements.md #D} — Error Code Namespace
 */
export declare const GENICUI_ERROR_CODES: {
    /** -32001: The requested component was not found. */
    readonly component_not_found: -32001;
    /** -32002: The component is already mounted with this ID. */
    readonly component_already_mounted: -32002;
    /** -32003: The provided props or input are invalid. */
    readonly props_invalid: -32003;
    /** -32004: The JSON-Patch operations are invalid. */
    readonly patch_invalid: -32004;
    /** -32005: Rate limit exceeded. */
    readonly rate_limited: -32005;
    /** -32006: Quota exceeded for this API key. */
    readonly quota_exceeded: -32006;
    /** -32007: Authentication failed or token invalid. */
    readonly auth_invalid: -32007;
    /** -32008: The requested surface is unavailable. */
    readonly surface_unavailable: -32008;
    /** -32009: Region mismatch — request routed to wrong region. */
    readonly region_mismatch: -32009;
    /** -32010: Internal server error. */
    readonly internal: -32010;
};
/**
 * A GenicUI error code value (-32001 to -32010).
 */
export type GenicUIErrorCode = (typeof GENICUI_ERROR_CODES)[keyof typeof GENICUI_ERROR_CODES];
/**
 * Register all 4 public MCP tool definitions on the given McpServer.
 *
 * Stub handlers return a placeholder response. Real implementations are
 * added in M3-T3 (find_ui_component), M3-T4 (render_component),
 * M3-T5 (update_component), and M3-T6 (subscribe_to_events).
 */
export declare function registerToolDefinitions(server: McpServer): void;
//# sourceMappingURL=tool-registry.d.ts.map