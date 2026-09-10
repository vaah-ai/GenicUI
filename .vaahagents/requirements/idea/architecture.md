# GenicUI — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI AGENT                                │
│  (Claude, GPT, or any LLM with tool-calling/MCP support)       │
│                                                                 │
│  System prompt includes:                                        │
│  - Component discovery tool (find_ui_component)                 │
│  - Component render tool (render_component)                     │
│  - Component update tool (update_component)                     │
│  - Application-specific tools (get_db_data, call_api, etc.)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol (JSON-RPC over stdio/SSE)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GENICUI MCP SERVER                          │
│                                                                 │
│  Tools exposed to agent:                                        │
│  ├── find_ui_component()   → semantic search over registry     │
│  ├── render_component()    → instantiate component in UI       │
│  ├── update_component()    → update props of live component    │
│  ├── unmount_component()   → remove component from UI          │
│  ├── get_component_state() → query component for voice resolve │
│  └── invoke_action()       → programmatically trigger action   │
│                                                                 │
│  Internal:                                                      │
│  ├── ComponentRegistry     → index of all adaptors             │
│  ├── SemanticSearchIndex   → embeddings for discovery          │
│  └── ComponentLifecycle    → manages mounted instances         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket / EventEmitter
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION SURFACE                          │
│  (The UI the user sees — chat messages + embedded components)   │
│                                                                 │
│  Renders:                                                       │
│  ├── Text messages (agent ↔ user)                              │
│  ├── Component instances (mounted by agent)                    │
│  └── System messages (loading, errors, etc.)                   │
│                                                                 │
│  Manages:                                                       │
│  ├── Component mounting/unmounting                             │
│  ├── Layout within conversation (stack, grid, etc.)            │
│  └── Scroll behavior, message ordering                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADAPTOR LAYER                               │
│                                                                 │
│  Each adaptor wraps an existing component:                      │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ DataTable    │   │ Chart        │   │ Form         │        │
│  │ Adaptor      │   │ Adaptor      │   │ Adaptor      │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │ wraps            │ wraps            │ wraps           │
│  ┌──────▼───────┐   ┌─────▼───────┐   ┌──────▼───────┐        │
│  │ PrimeVue     │   │ PrimeVue    │   │ PrimeVue     │        │
│  │ DataTable    │   │ Chart       │   │ FormField    │        │
│  └──────────────┘   └─────────────┘   └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Component Discovery

```
Agent receives user message: "Show me my orders"

Agent calls find_ui_component():
  {
    "intent": "show a list of orders with details",
    "data_shape": "array of objects with id, date, status, total"
  }

MCP Server responds:
  {
    "component": "DataTable",
    "name": "DataTable",
    "description": "Displays tabular data with sorting, filtering, pagination",
    "input_schema": { ... },
    "confidence": 0.95
  }

Agent now knows: "I should use DataTable"
```

### 2. Component Rendering

```
Agent calls render_component():
  {
    "componentName": "DataTable",
    "props": {
      "columns": [
        { "field": "id", "header": "Order #" },
        { "field": "date", "header": "Date" },
        { "field": "status", "header": "Status" },
        { "field": "total", "header": "Total" }
      ],
      "data": [
        { "id": "ORD-001", "date": "2025-07-15", "status": "Delivered", "total": 149.99 },
        { "id": "ORD-002", "date": "2025-07-22", "status": "Shipped", "total": 89.50 }
      ],
      "pagination": true
    }
  }

MCP Server:
  1. Looks up DataTable adaptor
  2. Validates props against input schema
  3. Generates unique componentId: "dt-abc123"
  4. Sends render command to conversation surface
  5. Returns: { componentId: "dt-abc123", status: "rendered" }

Conversation Surface:
  - Mounts DataTable adaptor with props
  - Adaptor renders PrimeVue DataTable
  - Component appears in chat
```

### 3. User Interaction

```
User clicks "Sort by Date" in the DataTable

DataTable Adaptor:
  - Intercepts column_sort event
  - Formats as structured action:
    {
      "componentId": "dt-abc123",
      "action": "column_sorted",
      "payload": { "column": "date", "direction": "asc" }
    }
  - Sends to MCP Server

MCP Server:
  - Routes to agent as new message
  - Agent receives: "DataTable component emitted column_sorted: date, asc"

Agent responds:
  "Here are your orders sorted by date. The earliest is ORD-001 from July 15th."

  May also call update_component() to refresh the data
```

### 4. Voice Resolution

```
User says: "Remove the first order"

Agent:
  1. Needs to know what "first" means
  2. Calls get_component_state("dt-abc123")

MCP Server returns:
  {
    "rows": [
      { "index": 0, "id": "ORD-001", "date": "2025-07-15", ... },
      { "index": 1, "id": "ORD-002", "date": "2025-07-22", ... }
    ],
    "selectedRow": null,
    "currentPage": 0
  }

Agent:
  3. Resolves "first" → index 0 → ORD-001
  4. Calls application logic to delete order
  5. Calls update_component() with new data
  6. Responds: "Removed ORD-001 from July 15th."
```

## Data Flow Diagrams

### Message Flow: Agent → UI

```
Agent → MCP Server → ComponentRegistry → Adaptor → Conversation Surface → Component
```

### Message Flow: UI → Agent

```
User action → Component → Adaptor (event bridge) → MCP Server → Agent
```

### State Query (Voice)

```
Agent → MCP Server → ComponentLifecycle → Adaptor (getState) → State response → Agent
```

## Layer Responsibilities

### MCP Server
- Tool registration and execution
- Semantic search over component registry
- Component lifecycle management (mount, update, unmount)
- Action routing (component events → agent)
- State queries (for voice resolution)

### Adaptor Layer
- Schema generation (what the agent sees)
- Component wrapping (PrimeVue/Vuetify/etc.)
- Event bridging (user actions → structured events)
- State reporting (current component state)
- Prop validation (against input schema)

### Conversation Surface
- Message rendering (text, components, system)
- Component mounting/unmounting
- Layout management within conversation
- Scroll and focus management
- Accessibility and screen reader support

### AI Agent
- Intent understanding (what component to use)
- Tool selection (find_ui_component → render_component)
- Prop construction (building correct data shapes)
- Action handling (responding to user interactions)
- Conversation management (narrative flow)

## Deployment Model

```
┌──────────────────────────────┐
│  Frontend (Browser)          │
│  ├── Conversation Surface    │
│  ├── Adaptor Layer           │
│  └── Component Library       │
│      (PrimeVue/Vuetify)      │
└──────────┬───────────────────┘
           │ WebSocket to MCP Server
           ▼
┌──────────────────────────────┐
│  MCP Server (Node.js)        │
│  ├── Tool handlers           │
│  ├── Semantic search index   │
│  └── Component lifecycle     │
└──────────┬───────────────────┘
           │ HTTP to LLM
           ▼
┌──────────────────────────────┐
│  LLM Provider (Claude API)   │
└──────────────────────────────┘
```

The MCP server runs as a backend service. The frontend connects via WebSocket for real-time component rendering. The LLM provider is called by the MCP server (or by the agent orchestrator).
