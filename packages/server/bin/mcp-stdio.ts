#!/usr/bin/env bun
/**
 * GenicUI MCP server — stdio transport entry point.
 *
 * Runs the GenicUI MCP server on stdin/stdout JSON-RPC. Designed to be
 * spawned directly by MCP clients (Claude Code, Cursor, etc.) via
 * `.mcp.json` — no OAuth, no HTTP bridge, no `mcp-remote`.
 *
 * Why stdio (not HTTP):
 *
 *   The GenicUI server also exposes the same 4 MCP tools over
 *   streamable HTTP at `/mcp`, but the standard MCP stdio-to-HTTP
 *   bridge (`mcp-remote`) insists on OAuth 2.0 by default and probes
 *   `/.well-known/oauth-*` metadata URLs. The GenicUI server does
 *   not implement OAuth — it returns 404 — so `mcp-remote` fails to
 *   connect silently and Claude Code never sees `render_component`
 *   in its toolset.
 *
 *   Running the MCP server directly on stdio side-steps the bridge
 *   entirely. The trade-off is that the MCP server and the GenicUI
 *   HTTP/WS server are two separate processes; tool calls land here,
 *   but the corresponding WS frames that mount the component in the
 *   browser are dispatched by the HTTP server. F13-AC4 documents
 *   the multi-process contract.
 *
 * Usage (in `.mcp.json`):
 *
 *   {
 *     "mcpServers": {
 *       "genicui": {
 *         "type": "stdio",
 *         "command": "bun",
 *         "args": ["run", "<repo>/packages/server/bin/mcp-stdio.ts"]
 *       }
 *     }
 *   }
 *
 * Logging: this entry point writes ONLY to stderr. stdout is the MCP
 * transport and any non-JSON-RPC noise corrupts the wire.
 *
 * @module @genicui/server/bin/mcp-stdio
 * @see {F13} — MCP server with 4 public tools
 * @see {M5-T6} — Render-component bridge for the playground
 */

import { startStdioMcpServer } from '../src/mcp/server.js';

const server = await startStdioMcpServer();

// Keep the process alive until the parent closes stdin. The MCP
// stdio transport signals shutdown by closing the readable side.
const keepAlive = new Promise<void>((resolve) => {
  process.stdin.on('close', () => resolve());
  process.stdin.on('end', () => resolve());
});

await keepAlive;

await server.close();
