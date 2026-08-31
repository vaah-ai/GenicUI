# GenicUI PoC

End-to-end demo of the [GenicUI](../docs/idea/README.md) concept, small enough to read in one sitting. Three components, one MCP server, one WebSocket bridge, and a single-page chat surface that drives Claude Code from the browser.

## What this proves

1. An agent can **semantically search** a component registry — `find_ui_component`
2. The agent can **render a real interactive component** in a chat — `render_component`
3. User clicks **bubble up as structured events** back to the agent — `component_action`
4. The agent can **update a live component** in place — `update_component`
5. The agent can **read component state** to resolve voice-style references like "remove the first item" — `get_component_state`
6. A user can **drive the entire agent loop from the browser**, with components and Claude's text streaming in one unified transcript.

## Three components

| Component | What it does | Actions | Has voice resolution |
|---|---|---|---|
| **Counter** | Label + numeric value with +/- buttons | `increment`, `decrement`, `reset` | — |
| **TodoList** | Checklist with add/toggle/remove | `item_added`, `item_toggled`, `item_removed`, `clear_completed` | — |
| **CartViewer** | Shopping cart with totals + checkout | `item_removed`, `quantity_changed`, `checkout_requested`, `clear_cart_requested` | ✅ |

## Run it

The fastest path is `start.sh`, which boots all three services with the right env vars:

```sh
bash start.sh        # stops any stale processes, then starts static + MCP server
```

Once it's up:

```
🟢 Chat Surface  → http://localhost:8080/poc/web/
🟢 MCP HTTP       → http://localhost:9877/mcp
🟢 Chat API       → http://localhost:9877/chat/sessions
🟢 WebSocket      → ws://localhost:9876
```

Open the chat surface. Type a prompt — the chat backend spawns `claude --print --mcp-config .mcp.json --resume <sid> -- <prompt>` for each turn, streams its output to the page via SSE, and renders any GenicUI components inline in the transcript.

### Manual setup (if you don't want to use start.sh)

```sh
npm install
npm run poc:smoke  # 15 in-process assertions
```

Then in two terminals:

```sh
# terminal 1 — static chat surface (port 8080)
python3 -m http.server 8080 --directory .

# terminal 2 — MCP server + chat backend (ports 9876 + 9877)
GENICUI_TRANSPORT=http \
GENICUI_BRIDGE_PORT=9876 \
GENICUI_HTTP_PORT=9877 \
GENICUI_MCP_CONFIG="$PWD/.mcp.json" \
node poc/server/index.mjs
```

The chat backend spawns `claude` per turn, so `claude` must be on `PATH`.

### Optional: drive from a Claude Code terminal too

The new flow does not break the existing one — you can still attach a Claude Code REPL to the same MCP server:

```sh
claude --dangerously-skip-permissions --mcp-config "$(pwd)/.mcp.json"
```

Both flows share the WebSocket bridge, so components rendered from the terminal also appear in the browser.

## Try these prompts

### Counter (basic flow)
> "Show me a counter labelled 'Clicks' starting at 5."
You should see the chat transcript fill in: streaming `ai_text` → a `tool_call` card for `find_ui_component` → a `tool_call` card for `render_component` → the Counter component rendered inline. Click +, –, or reset — each click appears as a system message. When you're done interacting, click **Submit to Claude** below the component and the next agent turn will see the current state (e.g. "Counter \"Clicks\" current value: 7") and react — usually by calling `update_component` to confirm or by asking a follow-up question.

### TodoList (array props)
> "Give me a todo list with two items: buy milk, walk dog."
The agent renders the TodoList. Click items to toggle, type to add.

### CartViewer + voice resolution (the key demo)
1. > "Show a cart with Laptop ($999 × 1) and Mouse ($29 × 2)."
2. Click the × next to Mouse, then click **Submit to Claude**.
The agent reads the submitted state, sees Mouse is gone, and calls `update_component` to mirror the change — or asks a follow-up if the change is ambiguous.

### Error path
> "Show me a map of the local coffee shops."
The agent calls `find_ui_component("map")`, gets "No matching component found", and describes the situation conversationally.

## File tour

```
poc/
├── README.md                ← this file
├── server/
│   ├── index.mjs            ← MCP server + chat HTTP routes
│   ├── registry.mjs         ← component registry + keyword search
│   ├── lifecycle.mjs        ← mount/update/unmount/state tracking
│   ├── mcp-bridge.mjs       ← WebSocket server (browser ↔ MCP)
│   ├── chat-broadcaster.mjs ← per-session SSE event emitter
│   ├── chat-parser.mjs      ← stdout line → typed event mapper
│   ├── chat-handler.mjs     ← spawns claude --print per turn
│   └── smoke-test.mjs       ← 15 in-process assertions
├── adaptors/
│   ├── base-adaptor.mjs     ← shared validateProps + structure
│   ├── counter.mjs          ← simplest component
│   ├── todo-list.mjs        ← array props + item actions
│   └── cart-viewer.mjs      ← composite + voice-resolution demo
└── web/
    ├── index.html           ← chat surface (single page)
    ├── app.mjs               ← EventSource client + composer + DOM mounting
    └── styles.css           ← chat + component styling
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:8080/poc/web/)                    │
│                                                              │
│  • SSE EventSource ──► /chat/sessions/:id/stream             │
│  • Composer (form)   ──► POST /chat/sessions/:id/messages    │
│  • WebSocket         ──► ws://localhost:9876 (component HTML) │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  GenicUI Server (node poc/server/index.mjs, port 9877)      │
│                                                              │
│  • /mcp                — JSON-RPC for Claude Code            │
│  • /chat/*             — chat session CRUD + SSE stream      │
│  • chat-broadcaster    — per-session EventEmitter            │
│  • chat-handler        — spawns `claude --print` per turn    │
│  • chat-parser         — stdout line → typed event           │
│  • mcp-bridge (9876)   — pushes rendered components to WS    │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌────────────────────┐
                │  claude --print    │
                │  --mcp-config …    │
                │  --resume <sid>    │
                └────────────────────┘
```

The chat backend spawns Claude Code with `--mcp-config .mcp.json`, so the same GenicUI MCP server serves both the chat backend (browser-driven turns) and any standalone Claude Code terminal session.

## Known limitations (PoC scope)

- **Naive search.** Keyword scoring, not real semantic embeddings. Fine for 3 components.
- **No diffed updates.** `update_component` re-renders the whole HTML on every call. Real impl would diff or stream props.
- **Single browser tab.** The bridge holds one `browser` reference; first tab wins. Multi-tab would need room IDs.
- **No auth.** Don't expose the bridge to anything beyond `localhost`.
- **In-memory chat sessions.** Restarting the server drops active sessions — fine for a PoC.
- **Action ack is fire-and-forget for `update`.** Only `render` round-trips an ack.
- **Requires `claude` on PATH.** The chat backend shells out to `claude --print` per turn; no `claude` means no chat. Override with `GENICUI_CLAUDE_BIN=/path/to/claude`.
