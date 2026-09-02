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
import { z } from 'zod';
import { stripProtoKeys } from '../validation/strip-proto-keys.js';
/**
 * GenicUI-specific JSON-RPC error codes.
 * -32001..-32010
 *
 * @see {consolidated-requirements.md #D} — Error Code Namespace
 */
export const GENICUI_ERROR_CODES = {
    /** -32001: The requested component was not found. */
    component_not_found: -32001,
    /** -32002: The component is already mounted with this ID. */
    component_already_mounted: -32002,
    /** -32003: The provided props or input are invalid. */
    props_invalid: -32003,
    /** -32004: The JSON-Patch operations are invalid. */
    patch_invalid: -32004,
    /** -32005: Rate limit exceeded. */
    rate_limited: -32005,
    /** -32006: Quota exceeded for this API key. */
    quota_exceeded: -32006,
    /** -32007: Authentication failed or token invalid. */
    auth_invalid: -32007,
    /** -32008: The requested surface is unavailable. */
    surface_unavailable: -32008,
    /** -32009: Region mismatch — request routed to wrong region. */
    region_mismatch: -32009,
    /** -32010: Internal server error. */
    internal: -32010,
};
/**
 * Create a tool error result with the given error code and message.
 *
 * The result conforms to the MCP CallToolResult shape:
 * `{ content: [{ type: 'text', text: '[code] message' }], isError: true }`
 */
function createErrorResult(code, message) {
    return {
        isError: true,
        content: [{ type: 'text', text: `[${code}] ${message}` }],
    };
}
/**
 * Create a success tool result.
 */
function createSuccessResult(text) {
    return {
        content: [{ type: 'text', text }],
    };
}
/**
 * Wrap a tool handler with trust-boundary validation (F14).
 *
 * Applies `stripProtoKeys` to sanitize the input before the handler
 * processes it, preventing prototype pollution attacks.
 *
 * @param handler — the original tool handler
 * @returns wrapped handler with validation middleware
 */
function wrapWithValidation(handler) {
    return async (input) => {
        // F14-AC1: Strip prototype pollution keys from inbound input
        const sanitized = stripProtoKeys(input);
        return handler(sanitized);
    };
}
// ---------------------------------------------------------------------------
// Zod input schemas for the MCP surface
// (TypeBox schemas in tool-schemas.ts are used for server-level validation)
// ---------------------------------------------------------------------------
const FindUiComponentInputSchema = z.object({
    query: z.string().min(1).max(512).describe('Search query string'),
    topK: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(5)
        .describe('Maximum number of results to return'),
});
const RenderComponentInputSchema = z.object({
    name: z.string().min(1).max(128).describe('Component name (e.g., DataTable)'),
    props: z.record(z.string(), z.unknown()).describe('Component props'),
    surface: z.string().optional().describe('Rendering surface'),
    idempotencyKey: z.string().optional().describe('Idempotency key for re-render safety'),
    parentComponentId: z.string().optional().describe('Parent component ID for nested rendering'),
    replaceComponentId: z.string().optional().describe('Replace an existing component'),
    transition: z.record(z.string(), z.unknown()).optional().describe('Transition animation config'),
    render_mode: z.enum(['inline', 'iframe']).optional().describe('Render mode: inline or iframe'),
});
const JsonPatchOperationSchema = z.union([
    // 'add', 'replace', 'test' — require value
    z.object({
        op: z.enum(['add', 'replace', 'test']).describe('Operation type'),
        path: z.string().describe('JSON Pointer path'),
        value: z.unknown().describe('Value to add/replace/test'),
    }),
    // 'remove' — no value
    z.object({
        op: z.literal('remove'),
        path: z.string().describe('JSON Pointer path'),
    }),
    // 'move', 'copy' — require from
    z.object({
        op: z.enum(['move', 'copy']).describe('Operation type'),
        from: z.string().describe('Source JSON Pointer path'),
        path: z.string().describe('Destination JSON Pointer path'),
    }),
]);
const UpdateComponentPatchInputSchema = z.object({
    componentId: z.string().min(1).max(128).describe('Component ID to update'),
    patch: z.array(JsonPatchOperationSchema).min(1).describe('JSON-Patch operations (RFC 6902)'),
});
const UpdateComponentMergeInputSchema = z.object({
    componentId: z.string().min(1).max(128).describe('Component ID to update'),
    merge: z.record(z.string(), z.unknown()).describe('Shallow merge object'),
});
const UpdateComponentInputSchema = z.union([
    UpdateComponentPatchInputSchema,
    UpdateComponentMergeInputSchema,
]).describe('Input for update_component: either patch (JSON-Patch) or merge (shallow), not both');
const SubscribeToEventsInputSchema = z.object({
    componentId: z.string().min(1).max(128).optional().describe('Component ID to subscribe to'),
    actions: z.array(z.string().min(1)).min(1).optional().describe('Action names to subscribe to'),
    sessionId: z.string().min(1).max(128).optional().describe('Session ID for scoped subscriptions'),
    expiresAt: z.string().datetime().optional().describe('Expiration timestamp (ISO 8601)'),
});
// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------
/**
 * Register all 4 public MCP tool definitions on the given McpServer.
 *
 * Stub handlers return a placeholder response. Real implementations are
 * added in M3-T3 (find_ui_component), M3-T4 (render_component),
 * M3-T5 (update_component), and M3-T6 (subscribe_to_events).
 */
export function registerToolDefinitions(server) {
    // find_ui_component — search catalog for UI components
    server.registerTool('find_ui_component', {
        description: 'Search the component catalog and return top-K matches. Use this to discover available UI components before rendering them.',
        inputSchema: FindUiComponentInputSchema,
    }, wrapWithValidation(async (input) => {
        // Stub — real impl in M3-T3 (F15)
        return createSuccessResult(`[find_ui_component] Stub: search for "${input.query}" (topK=${input.topK})`);
    }));
    // render_component — mount a component on the connected client
    server.registerTool('render_component', {
        description: 'Render a UI component on the connected client. Returns a componentId for subsequent updates and event subscriptions.',
        inputSchema: RenderComponentInputSchema,
    }, wrapWithValidation(async (input) => {
        // Stub — real impl in M3-T4 (F16)
        return createSuccessResult(`[render_component] Stub: render "${input.name}" on surface "${input.surface ?? 'default'}"`);
    }));
    // update_component — mutate live component state
    server.registerTool('update_component', {
        description: 'Update a mounted component. Provide either a JSON-Patch array (patch) or a shallow merge object (merge), not both.',
        inputSchema: UpdateComponentInputSchema,
    }, wrapWithValidation(async (input) => {
        // Stub — real impl in M3-T5 (F17)
        const isPatch = 'patch' in input && !('merge' in input);
        if (isPatch) {
            const patchArr = input.patch;
            return createSuccessResult(`[update_component] Stub: apply ${patchArr.length} patches to "${input.componentId}"`);
        }
        return createSuccessResult(`[update_component] Stub: merge into "${input.componentId}"`);
    }));
    // subscribe_to_events — listen for component events
    server.registerTool('subscribe_to_events', {
        description: 'Subscribe to events from a mounted component. Specify componentId, actions, and optional session/expiration.',
        inputSchema: SubscribeToEventsInputSchema,
    }, wrapWithValidation(async (input) => {
        // Stub — real impl in M3-T6 (F18)
        const parts = [];
        if (input.componentId)
            parts.push(`componentId=${input.componentId}`);
        if (input.actions?.length)
            parts.push(`actions=${input.actions.join(',')}`);
        if (input.sessionId)
            parts.push(`sessionId=${input.sessionId}`);
        if (input.expiresAt)
            parts.push(`expiresAt=${input.expiresAt}`);
        return createSuccessResult(`[subscribe_to_events] Stub: subscribe (${parts.join('; ') || 'all events'})`);
    }));
}
//# sourceMappingURL=tool-registry.js.map