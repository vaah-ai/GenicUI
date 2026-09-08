# GenicUI — Agent Protocol

## Overview

Agents discover and invoke GenicUI components through an **MCP server**. Instead of the agent knowing about 50+ individual component tools, it uses **two primary tools** backed by semantic search:

1. `find_ui_component` — discover the right component for the intent
2. `render_component` — render it with the correct props

Additional tools manage the component lifecycle: `update_component`, `unmount_component`, `get_component_state`, `invoke_action`.

---

## MCP Server: Tool Definitions

### 1. `find_ui_component`

**Purpose**: Search the component registry to find the best component for the agent's intent.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "intent": {
      "type": "string",
      "description": "Natural language description of what you want to show. " +
                     "Examples: 'show a list of orders', 'display a sales chart', " +
                     "'collect user shipping address'"
    },
    "data_shape": {
      "type": "object",
      "description": "Description of the data you want to display. " +
                     "Helps choose between List, Table, Chart, etc.",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["array", "object", "scalar", "nested"],
          "description": "Shape of your data"
        },
        "description": {
          "type": "string",
          "description": "Describe the data: 'array of order objects with id, date, total'"
        }
      }
    },
    "layout": {
      "type": "string",
      "enum": ["single", "grid", "side-by-side", "stacked"],
      "description": "How the component should be laid out relative to others"
    }
  },
  "required": ["intent"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "component": {
      "type": "string",
      "description": "Component name to use with render_component"
    },
    "description": {
      "type": "string",
      "description": "What this component does"
    },
    "input_schema": {
      "type": "object",
      "description": "JSON schema of the props this component accepts"
    },
    "actions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Actions this component can emit"
    },
    "confidence": {
      "type": "number",
      "description": "Match confidence (0.0 - 1.0)"
    },
    "alternatives": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "component": { "type": "string" },
          "confidence": { "type": "number" }
        }
      },
      "description": "Other components that might fit"
    }
  }
}
```

**Example**:
```json
// Request
{
  "intent": "show my shopping cart with items, quantities, and total price",
  "data_shape": {
    "type": "array",
    "description": "array of items with name, quantity, price, image"
  }
}

// Response
{
  "component": "CartViewer",
  "description": "Displays the shopping cart with items, quantities, prices, and total. " +
                 "Supports quantity changes and item removal.",
  "input_schema": {
    "items": {
      "type": "array",
      "items": {
        "name": "string",
        "quantity": "number",
        "price": "number",
        "image": "string"
      }
    },
    "showRecommendations": { "type": "boolean" },
    "onEmptyMessage": { "type": "string" }
  },
  "actions": ["item_removed", "quantity_changed", "checkout_requested"],
  "confidence": 0.97,
  "alternatives": [
    { "component": "DataTable", "confidence": 0.65 },
    { "component": "List", "confidence": 0.50 }
  ]
}
```

---

### 2. `render_component`

**Purpose**: Instantiate a component in the conversation surface with specific props.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentName": {
      "type": "string",
      "description": "Component name from find_ui_component or registry. " +
                     "Examples: 'DataTable', 'Chart', 'Form', 'CartViewer'"
    },
    "props": {
      "type": "object",
      "description": "Props to pass to the component. Must match the component's input schema."
    },
    "layout": {
      "type": "string",
      "enum": ["default", "compact", "fullscreen", "side-by-side"],
      "description": "Layout hint for how the component should render"
    },
    "slotId": {
      "type": "string",
      "description": "Optional slot identifier for multi-component layouts"
    }
  },
  "required": ["componentName", "props"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "description": "Unique identifier for this component instance. Use with update_component, unmount_component, get_component_state."
    },
    "status": {
      "type": "string",
      "enum": ["rendered", "error"],
      "description": "Render status"
    },
    "error": {
      "type": "string",
      "description": "Error message if rendering failed"
    }
  }
}
```

**Example**:
```json
// Request
{
  "componentName": "DataTable",
  "props": {
    "title": "Recent Orders",
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
    "pagination": true,
    "selection": true
  }
}

// Response
{
  "componentId": "dt-7f3a9b2c",
  "status": "rendered"
}
```

---

### 3. `update_component`

**Purpose**: Update the props of an already-rendered component.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "description": "The componentId returned by render_component"
    },
    "props": {
      "type": "object",
      "description": "New props to merge into the component. Only changed props need to be passed."
    }
  },
  "required": ["componentId", "props"]
}
```

**Output**:
```json
{
  "status": "updated"
}
```

**Example**:
```json
// Agent wants to refresh the table after a deletion
{
  "componentId": "dt-7f3a9b2c",
  "props": {
    "data": [
      { "id": "ORD-002", "date": "2025-07-22", "status": "Shipped", "total": 89.50 }
    ]
  }
}
```

---

### 4. `unmount_component`

**Purpose**: Remove a component from the conversation surface.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "description": "The componentId to remove"
    }
  },
  "required": ["componentId"]
}
```

**Example**:
```json
// Agent dismisses a toast notification
{
  "componentId": "toast-xyz123"
}
```

---

### 5. `get_component_state`

**Purpose**: Query the current state of a component. Used for voice resolution and debugging.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "description": "The componentId to query"
    }
  },
  "required": ["componentId"]
}
```

**Output**:
```json
{
  "componentName": "DataTable",
  "state": {
    "rows": [
      { "index": 0, "id": "ORD-001", "date": "2025-07-15", "status": "Delivered", "total": 149.99 },
      { "index": 1, "id": "ORD-002", "date": "2025-07-22", "status": "Shipped", "total": 89.50 }
    ],
    "selectedRow": null,
    "currentPage": 0,
    "totalPages": 1,
    "sortColumn": "date",
    "sortDirection": "asc"
  }
}
```

**Voice Resolution Example**:
```
User says: "Remove the first order"

Agent calls get_component_state("dt-7f3a9b2c")
→ Receives rows array, first row has index 0, id "ORD-001"
→ Agent resolves "first" → ORD-001
→ Agent calls application logic to delete ORD-001
→ Agent calls update_component with new data
```

---

### 6. `invoke_action`

**Purpose**: Programmatically trigger a component action from the agent (e.g., select a row).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "componentId": {
      "type": "string",
      "description": "The componentId"
    },
    "action": {
      "type": "string",
      "description": "Action name to trigger"
    },
    "payload": {
      "type": "object",
      "description": "Action-specific payload"
    }
  },
  "required": ["componentId", "action"]
}
```

**Example**:
```json
// Agent wants to programmatically select a row after voice input
{
  "componentId": "dt-7f3a9b2c",
  "action": "select_row",
  "payload": { "index": 0 }
}
```

---

## Component Event Flow (UI → Agent)

When the user interacts with a component, the adaptor emits a structured event. The MCP server delivers this to the agent as a message:

```
User clicks row 0 in DataTable
    ↓
DataTable Adaptor intercepts click
    ↓
Formats event:
{
  "type": "component_action",
  "componentId": "dt-7f3a9b2c",
  "componentName": "DataTable",
  "action": "row_selected",
  "payload": {
    "rowIndex": 0,
    "rowData": { "id": "ORD-001", "date": "2025-07-15", ... }
  }
}
    ↓
MCP Server sends to agent as a tool result / message
    ↓
Agent receives and continues conversation:
"You selected ORD-001 from July 15th. Want to track this order?"
```

---

## Agent System Prompt

The agent's system prompt includes instructions for component usage:

```
You are an AI agent in an e-commerce application. You can render UI components
in the conversation. To do this:

STEP 1: Call find_ui_component with your intent
  - Describe what you want to show in natural language
  - Include the data shape if relevant
  - The response tells you which component to use

STEP 2: Call render_component with the component name and props
  - Build props according to the component's input schema
  - Store the componentId from the response — you'll need it to update or remove the component

STEP 3: When the user interacts with a component, you'll receive a component_action event
  - Read the action and payload
  - Respond appropriately in conversation
  - Call update_component if the component needs fresh data
  - Call unmount_component if the component is no longer needed

STEP 4: For voice commands that reference specific items ("remove the first item")
  - Call get_component_state to see the current component state
  - Resolve the reference (e.g., "first" → index 0)
  - Take the appropriate action

Available component categories:
  - data-display: DataTable, List, Card, Timeline
  - visualization: Chart, Gauge, ProgressBar
  - input: Form, Dialog, SearchBar
  - layout: Breadcrumb, TabView, Accordion
  - feedback: Toast, Message, ConfirmationDialog
  - ecommerce: CartViewer, ProductCard, CheckoutSummary

Guidelines:
  - Always call find_ui_component before render_component unless you're certain of the component name
  - Prefer simpler components when possible (List over DataTable for small datasets)
  - Use Toast for brief confirmations, Dialog for confirmations that require user input
  - For voice: always call get_component_state before acting on ambiguous references
  - Components should complement your text, not replace it. Always explain what the user is seeing
```

---

## Conversation Transcript Example

```json
[
  // User message
  {
    "role": "user",
    "content": "Show me my cart"
  },

  // Agent: find the right component
  {
    "role": "assistant",
    "content": null,
    "tool_use": {
      "name": "find_ui_component",
      "input": {
        "intent": "show the user's shopping cart with items and total"
      }
    }
  },

  // MCP Server: respond with component info
  {
    "role": "tool",
    "content": {
      "component": "CartViewer",
      "description": "...",
      "input_schema": { ... },
      "actions": ["item_removed", "quantity_changed", "checkout_requested"],
      "confidence": 0.97
    }
  },

  // Agent: render the component
  {
    "role": "assistant",
    "content": null,
    "tool_use": {
      "name": "render_component",
      "input": {
        "componentName": "CartViewer",
        "props": {
          "items": [
            { "name": "Laptop", "quantity": 1, "price": 999.00, "image": "/laptop.jpg" },
            { "name": "Mouse", "quantity": 2, "price": 29.00, "image": "/mouse.jpg" }
          ],
          "total": 1057.00
        }
      }
    }
  },

  // MCP Server: component rendered
  {
    "role": "tool",
    "content": {
      "componentId": "cv-abc123",
      "status": "rendered"
    }
  },

  // Agent: respond to user
  {
    "role": "assistant",
    "content": "Here's your cart. You have 3 items totaling $1,057.00."
  },

  // User clicks "Remove" on Mouse
  {
    "role": "user",
    "content": {
      "type": "component_action",
      "componentId": "cv-abc123",
      "action": "item_removed",
      "payload": { "itemId": "mouse", "name": "Mouse" }
    }
  },

  // Agent: acknowledge and update
  {
    "role": "assistant",
    "content": "Mouse removed from your cart. You now have 1 item — the Laptop — totaling $999.00."
  },

  // Agent: update the component
  {
    "role": "assistant",
    "content": null,
    "tool_use": {
      "name": "update_component",
      "input": {
        "componentId": "cv-abc123",
        "props": {
          "items": [
            { "name": "Laptop", "quantity": 1, "price": 999.00, "image": "/laptop.jpg" }
          ],
          "total": 999.00
        }
      }
    }
  }
]
```

---

## Error Handling

### Component Not Found

```json
{
  "componentName": "NonExistentComponent",
  "error": "Component 'NonExistentComponent' not found in registry. " +
           "Call find_ui_component to discover available components."
}
```

### Invalid Props

```json
{
  "error": "Props validation failed for DataTable:",
  "details": [
    { "path": "columns[0]", "message": "Missing required property: field" },
    { "path": "data", "message": "Expected array, got object" }
  ]
}
```

### Component State Unavailable

```json
{
  "error": "Component 'toast-xyz123' is no longer mounted. " +
           "It may have been automatically dismissed."
}
```

---

## Multi-Component Layouts

The agent can render multiple components simultaneously:

```json
// Render products alongside a chart
{
  "tool_use": {
    "name": "render_component",
    "input": {
      "componentName": "DataTable",
      "props": { ... },
      "layout": "side-by-side",
      "slotId": "left"
    }
  }
}

{
  "tool_use": {
    "name": "render_component",
    "input": {
      "componentName": "Chart",
      "props": { ... },
      "layout": "side-by-side",
      "slotId": "right"
    }
  }
}
```

The conversation surface arranges them based on the layout hint.
