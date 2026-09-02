/**
 * MCP module types — shared types for MCP tool definitions and error handling.
 *
 * @module @genicui/server/mcp/types
 * @see {F13} — MCP server with 4 public tools
 */
/**
 * Tool result content item — text response.
 * Matches the MCP SDK's content block type.
 */
export interface TextContentItem {
    /** Always 'text'. */
    readonly type: 'text';
    /** The text payload. */
    readonly text: string;
}
/**
 * Tool result shape returned by MCP tool handlers.
 * Matches the MCP SDK's CallToolResult structure.
 */
export interface ToolResult {
    /** Array of content items. */
    readonly content: TextContentItem[];
    /** True if the result represents an error. */
    readonly isError?: boolean;
}
//# sourceMappingURL=types.d.ts.map