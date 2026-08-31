# GenicUI — Examples

Working code examples showing how agents, adaptors, and the MCP server interact in common scenarios.

---

## Example 1: E-Commerce — "Show Me My Cart"

### Full Conversation Flow

```
User: "Show me my cart"

┌─────────────────────────────────────────────────────┐
│  Agent: find_ui_component                            │
│  {                                                   │
│    "intent": "show the user's shopping cart",        │
│    "data_shape": {                                   │
│      "type": "array",                                │
│      "description": "items with name, quantity, price"│
│    }                                                 │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  MCP Server Response:                                │
│  {                                                   │
│    "component": "CartViewer",                        │
│    "confidence": 0.97,                               │
│    "input_schema": { ... },                          │
│    "actions": ["item_removed", "quantity_changed",   │
│                 "checkout_requested"]                │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent: render_component                             │
│  {                                                   │
│    "componentName": "CartViewer",                    │
│    "props": {                                        │
│      "items": [                                      │
│        { "id": "laptop", "name": "Laptop",           │
│          "quantity": 1, "price": 999.00,             │
│          "image": "/laptop.jpg" },                   │
│        { "id": "mouse", "name": "Mouse",             │
│          "quantity": 2, "price": 29.00,              │
│          "image": "/mouse.jpg" }                     │
│      ],                                              │
│      "subtotal": 1057.00,                            │
│      "tax": 84.56,                                   │
│      "shipping": 0                                   │
│    }                                                 │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  UI renders:                                         │
│  ╔═══════════════════════════════════════════════╗  │
│  ║  CartViewer                                    ║  │
│  ║                                               ║  │
│  ║  ┌──────────┬──────────┬──────────────────┐  ║  │
│  ║  │ Image    │ Name     │ Qty  Price  Total│  ║  │
│  ║  ├──────────┼──────────┼──────────────────┤  ║  │
│  ║  │ [img]    │ Laptop   │ 1    $999  $999  │  ║  │
│  ║  │ [img]    │ Mouse    │ 2    $29   $58   │  ║  │
│  ║  └──────────┴──────────┴──────────────────┘  ║  │
│  ║                                               ║  │
│  ║  Subtotal: $1,057.00                          ║  │
│  ║  Tax:      $84.56                             ║  │
│  ║  Total:    $1,141.56                          ║  │
│  ║                                               ║  │
│  ║  [Clear Cart]  [Checkout →]                   ║  │
│  ╚═══════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────┘

Agent: "Here's your cart. You have 3 items (1 laptop, 2 mice)
        totaling $1,141.56 including tax."
```

### User Removes an Item

```
User clicks "Remove" on the Mouse row

┌─────────────────────────────────────────────────────┐
│  Component Action (UI → Agent):                      │
│  {                                                   │
│    "type": "component_action",                        │
│    "componentId": "cv-abc123",                       │
│    "componentName": "CartViewer",                    │
│    "action": "item_removed",                         │
│    "payload": {                                      │
│      "itemId": "mouse",                              │
│      "itemName": "Mouse"                             │
│    }                                                 │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent responds:                                     │
│  "Mouse removed. Your cart now has 1 item — the     │
│   Laptop — totaling $1,083.56 including tax."        │
│                                                      │
│  Agent calls: update_component                       │
│  {                                                   │
│    "componentId": "cv-abc123",                       │
│    "props": {                                       │
│      "items": [                                      │
│        { "id": "laptop", "name": "Laptop",           │
│          "quantity": 1, "price": 999.00 }            │
│      ],                                             │
│      "subtotal": 999.00,                             │
│      "tax": 79.92,                                   │
│      "shipping": 0                                   │
│    }                                                 │
│  }                                                   │
└─────────────────────────────────────────────────────┘

UI updates the CartViewer component in place.
```

---

## Example 2: Voice — "Remove the First Order"

### Voice Resolution Flow

```
User (voice): "Show me my orders"

Agent → render_component("DataTable", orders_data)
UI → renders table of orders

User (voice): "Remove the first one"

┌─────────────────────────────────────────────────────┐
│  Step 1: Agent queries component state              │
│  get_component_state("dt-xyz789")                    │
│                                                      │
│  Response:                                           │
│  {                                                   │
│    "data": {                                         │
│      "rows": [                                       │
│        { "index": 0, "id": "ORD-001",                │
│          "date": "2025-07-15",                        │
│          "status": "Delivered", "total": 149.99 },   │
│        { "index": 1, "id": "ORD-002",                │
│          "date": "2025-07-22",                        │
│          "status": "Shipped", "total": 89.50 }       │
│      ]                                               │
│    },                                                │
│    "metadata": {                                     │
│      "totalItems": 2,                                │
│      "currentPage": 0                                │
│    }                                                 │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Step 2: Agent resolves "first" → index 0 → ORD-001 │
│                                                      │
│  Step 3: Agent calls application logic to delete    │
│  the order (via its own tools, not GenicUI)          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Step 4: Agent updates the component                 │
│  update_component("dt-xyz789", {                     │
│    "data": [                                         │
│      { "id": "ORD-002", "date": "2025-07-22",       │
│        "status": "Shipped", "total": 89.50 }        │
│    ]                                                 │
│  })                                                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent responds:                                     │
│  "I removed order ORD-001 from July 15th.           │
│   You have one order remaining: ORD-002,            │
│   shipped on July 22nd, totaling $89.50."           │
└─────────────────────────────────────────────────────┘
```

---

## Example 3: Multi-Component — "Show Me Sales Data"

### Agent Renders Table + Chart Side by Side

```
User: "Show me this month's sales"

┌─────────────────────────────────────────────────────┐
│  Agent: find_ui_component                            │
│  { "intent": "show sales data in a table" }          │
│  → { component: "DataTable", confidence: 0.90 }     │
│                                                      │
│  Agent: find_ui_component                            │
│  { "intent": "visualize sales trend over time" }     │
│  → { component: "Chart", confidence: 0.92 }         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent: render_component (side-by-side layout)       │
│  {                                                   │
│    "componentName": "DataTable",                     │
│    "props": { ... sales data ... },                  │
│    "layout": "side-by-side",                         │
│    "slotId": "left"                                  │
│  }                                                   │
│  → { "componentId": "dt-aaa111" }                   │
│                                                      │
│  Agent: render_component                             │
│  {                                                   │
│    "componentName": "Chart",                         │
│    "props": {                                        │
│      "type": "bar",                                  │
│      "title": "Daily Sales",                         │
│      "labels": ["Jul 1", "Jul 2", "Jul 3", ...],   │
│      "datasets": [{                                 │
│        "label": "Revenue",                            │
│        "data": [1200, 980, 1500, ...]                │
│      }]                                              │
│    },                                               │
│    "layout": "side-by-side",                         │
│    "slotId": "right"                                 │
│  }                                                   │
│  → { "componentId": "chart-bbb222" }                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  UI renders side-by-side:                            │
│  ╔═══════════════════════╗ ╔═══════════════════════╗│
│  ║ DataTable             ║ ║ Chart (bar)           ║│
│  ║                       ║ ║                       ║│
│  ║ Date    │ Sales       ║ ║  █ █  █  █           ║│
│  ║──────────────────────║ ║  █ █  █  █           ║│
│  ║ Jul 1   │ $1,200     ║ ║  █ █  █  █  █        ║│
│  ║ Jul 2   │ $980       ║ ║  █ █  █  █  █        ║│
│  ║ Jul 3   │ $1,500     ║ ║  └──────┴──────┴────  ║│
│  ║ ...     │ ...        ║ ║  1   2    3    4     ║│
│  ╚═══════════════════════╝ ╚═══════════════════════╝│
└─────────────────────────────────────────────────────┘

Agent: "Here's your sales data for this month. The table shows
        daily breakdowns, and the chart visualizes the trend.
        You can see a dip on July 2nd — would you like to
        investigate that?"
```

---

## Example 4: Form Interaction — "Collect Shipping Address"

```
User: "I want to check out"

┌─────────────────────────────────────────────────────┐
│  Agent: render_component("Dialog", {                 │
│    "title": "Confirm Checkout",                      │
│    "message": "You have 1 item in your cart.         │
│                Proceed to checkout?",                │
│    "options": ["Yes, proceed", "No, keep shopping"]  │
│  })                                                  │
│  → { "componentId": "dialog-confirm" }               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
User clicks "Yes, proceed"

┌─────────────────────────────────────────────────────┐
│  Action received:                                    │
│  {                                                   │
│    "componentId": "dialog-confirm",                  │
│    "action": "option_selected",                      │
│    "payload": { "option": "Yes, proceed" }           │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent: unmount_component("dialog-confirm")          │
│                                                      │
│  Agent: render_component("Form", {                    │
│    "title": "Shipping Address",                       │
│    "fields": [                                       │
│      { "name": "fullName", "label": "Full Name",      │
│        "type": "text", "required": true },            │
│      { "name": "address1", "label": "Address Line 1", │
│        "type": "text", "required": true },            │
│      { "name": "address2", "label": "Address Line 2", │
│        "type": "text" },                              │
│      { "name": "city", "label": "City",               │
│        "type": "text", "required": true },            │
│      { "name": "state", "label": "State",             │
│        "type": "select", "required": true,            │
│        "options": [                                   │
│          { "label": "California", "value": "CA" },   │
│          { "label": "New York", "value": "NY" },     │
│          ...                                          │
│        ]                                             │
│      },                                              │
│      { "name": "zip", "label": "ZIP Code",            │
│        "type": "text", "required": true },            │
│    ],                                                │
│    "submitLabel": "Continue to Payment"              │
│  })                                                  │
│  → { "componentId": "form-shipping" }                │
└─────────────────────────────────────────────────────┘

User fills form and clicks "Continue"

┌─────────────────────────────────────────────────────┐
│  Action received:                                    │
│  {                                                   │
│    "componentId": "form-shipping",                   │
│    "action": "submitted",                            │
│    "payload": {                                      │
│      "values": {                                     │
│        "fullName": "John Doe",                        │
│        "address1": "123 Main St",                    │
│        "city": "San Francisco",                       │
│        "state": "CA",                                 │
│        "zip": "94102"                                 │
│      }                                               │
│    }                                                 │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent: render_component("Toast", {                   │
│    "message": "Shipping address saved!",              │
│    "severity": "success"                             │
│  })                                                  │
│                                                      │
│  Agent: "Great! Your shipping address is set.        │
│          Next, let's set up payment."                │
│                                                      │
│  Agent: render_component("Form", { payment fields }) │
└─────────────────────────────────────────────────────┘
```

---

## Example 5: Error Handling — Component Fails to Render

```
User: "Show me the product map"

Agent calls: render_component("Map", { ... })

┌─────────────────────────────────────────────────────┐
│  MCP Server responds:                                │
│  {                                                   │
│    "status": "error",                                │
│    "error": "Map component requires API key.         │
│              Configure MAP_API_KEY to use this       │
│              component."                             │
│  }                                                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Agent handles the error conversationally:            │
│                                                      │
│  "I can't show the map right now because the map    │
│   service isn't configured. But I can tell you the   │
│   product is located at 123 Store St, San Francisco, │
│   CA 94102. Would you like me to show you driving    │
│   directions instead?"                               │
└─────────────────────────────────────────────────────┘
```

---

## Example 6: Writing a New Adaptor (Step by Step)

### Adding a PrimeVue `<Calendar>` as a GenicUI Component

**Step 1: Define the schema**

```typescript
import { Calendar } from 'primevue/calendar';
import { z } from 'zod';
import { BaseAdaptor } from './base-adaptor';

const CalendarAdaptor = new (class extends BaseAdaptor<CalendarProps, CalendarState, CalendarActions> {
  schema = {
    name: 'Calendar',
    description: 'Displays a date picker calendar. Allows the user to select a single date, ' +
                 'a range of dates, or multiple dates. Supports inline mode for embedded display.',
    whenToUse: [
      'let the user pick a date',
      'select a date range',
      'choose multiple dates',
      'show a calendar for event selection',
      'user says "pick a date" or "choose a date"',
    ],
    category: 'input',

    inputSchema: z.object({
      mode: z.enum(['single', 'range', 'multiple']).default('single'),
      title: z.string().optional(),
      defaultDate: z.string().optional().describe('ISO date string for initial selection'),
      minDate: z.string().optional().describe('Earliest selectable date (ISO)'),
      maxDate: z.string().optional().describe('Latest selectable date (ISO)'),
      inline: z.boolean().optional().default(false).describe('Render inline instead of as a popup'),
      disabledDates: z.array(z.string()).optional().describe('Dates that cannot be selected (ISO)'),
      disabledDays: z.array(z.number()).optional().describe('Days of week to disable (0=Sunday)'),
    }),

    actions: [
      {
        name: 'date_selected',
        description: 'User selected a date or date range',
        payload: {
          value: { type: 'string', description: 'Selected date(s) as ISO string(s)' },
        },
      },
    ],
  };

  component = wrapComponent(Calendar, {
    eventMap: {
      'change': 'date_selected',
    },
  });

  getState(instance: any, props: CalendarProps): ComponentState {
    return {
      data: {
        selectedDate: instance?.value,
        mode: props.mode,
      },
      metadata: {
        minDate: props.minDate,
        maxDate: props.maxDate,
      },
    };
  }

  wireActions(instance: any, onAction: (action: ComponentAction) => void): void {}
  cleanup(instance: any): void {}
})(undefined, undefined);

// Register it
registry.register(CalendarAdaptor);
```

**Step 2: Agent discovers it**

```
User: "Let me pick a delivery date"

Agent → find_ui_component("let user pick a delivery date")
  → { component: "Calendar", confidence: 0.88 }

Agent → render_component("Calendar", {
  "mode": "single",
  "minDate": "2025-08-01",
  "maxDate": "2025-12-31",
  "title": "Select Delivery Date"
})
  → { componentId: "cal-delivery" }

Agent: "Pick your preferred delivery date. Delivery is available
       from August through December."
```

**Step 3: User selects date**

```
User clicks September 15, 2025

Action → {
  "componentId": "cal-delivery",
  "action": "date_selected",
  "payload": { "value": "2025-09-15" }
}

Agent: "Great, September 15th! I'll schedule your delivery for that date.
       Anything else?"
```

---

## Example 7: Semantic Search — How find_ui_component Works

```typescript
// Inside the MCP server:

class SemanticSearch {
  private embeddings: Map<string, number[]> = new Map();

  constructor(registry: ComponentRegistry, embeddingModel: EmbeddingModel) {
    for (const adaptor of registry.getAllSchemas()) {
      // Create embedding from: name + description + whenToUse
      const text = [
        adaptor.name,
        adaptor.description,
        ...adaptor.whenToUse,
      ].join(' ');

      this.embeddings.set(adaptor.name, embeddingModel.embed(text));
    }
  }

  search(query: string, topK: number = 3): Array<{ name: string; score: number }> {
    const queryVector = embeddingModel.embed(query);
    const results: Array<{ name: string; score: number }> = [];

    for (const [name, vector] of this.embeddings) {
      const score = cosineSimilarity(queryVector, vector);
      results.push({ name, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

// Example search:
const search = new SemanticSearch(registry, embeddingModel);

search('show my orders in a table')
// → [
// →   { name: 'DataTable', score: 0.92 },
// →   { name: 'List', score: 0.68 },
// →   { name: 'Timeline', score: 0.45 }
// → ]

search('visualize revenue trend')
// → [
// →   { name: 'Chart', score: 0.95 },
// →   { name: 'Gauge', score: 0.32 },
// →   { name: 'ProgressBar', score: 0.20 }
// → ]

search('collect user address')
// → [
// →   { name: 'Form', score: 0.91 },
// →   { name: 'DataTable', score: 0.15 },
// → ]
```

---

## Example 8: MCP Server Implementation

```typescript
import { McpServer } from '@modelcontextprotocol/sdk';
import { ComponentRegistry } from './registry';
import { SemanticSearch } from './semantic-search';
import { ComponentLifecycle } from './lifecycle';

class GenicUIServer {
  private server: McpServer;
  private registry: ComponentRegistry;
  private search: SemanticSearch;
  private lifecycle: ComponentLifecycle;

  constructor() {
    this.registry = new ComponentRegistry();
    this.search = new SemanticSearch(this.registry, embeddingModel);
    this.lifecycle = new ComponentLifecycle();

    // Register all adaptors
    this.registry.register(DataTableAdaptor);
    this.registry.register(ChartAdaptor);
    this.registry.register(FormAdaptor);
    this.registry.register(CartViewerAdaptor);
    this.registry.register(CalendarAdaptor);
    // ... more adaptors

    this.server = new McpServer('genicui');
    this.registerTools();
  }

  private registerTools() {
    // 1. Component discovery
    this.server.registerTool({
      name: 'find_ui_component',
      description: 'Search for the best UI component to display information. ' +
                   'Describe what you want to show, and this returns the component ' +
                   'name, its props schema, and what actions it supports.',
      inputSchema: {
        intent: { type: 'string', description: 'What you want to show' },
        data_shape: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },

      async execute(args) {
        const results = this.search.search(args.intent, 3);

        const top = results[0];
        const adaptor = this.registry.get(top.name)!;

        return {
          component: top.name,
          description: adaptor.schema.description,
          input_schema: adaptor.schema.inputSchema,
          actions: adaptor.schema.actions.map(a => a.name),
          confidence: top.score,
          alternatives: results.slice(1).map(r => ({
            component: r.name,
            confidence: r.score,
          })),
        };
      },
    });

    // 2. Render component
    this.server.registerTool({
      name: 'render_component',
      description: 'Render a UI component in the conversation.',
      inputSchema: {
        componentName: { type: 'string' },
        props: { type: 'object' },
        layout: { type: 'string' },
      },

      async execute(args) {
        const adaptor = this.registry.get(args.componentName);
        if (!adaptor) {
          return { error: `Component '${args.componentName}' not found` };
        }

        // Validate props
        const validation = adaptor.validateProps(args.props);
        if (!validation.valid) {
          return { error: 'Props validation failed', details: validation.errors };
        }

        // Mount component
        const componentId = this.lifecycle.mount(adaptor, args.props);

        return { componentId, status: 'rendered' };
      },
    });

    // 3. Update component
    this.server.registerTool({
      name: 'update_component',
      description: 'Update the props of a rendered component.',
      inputSchema: {
        componentId: { type: 'string' },
        props: { type: 'object' },
      },

      async execute(args) {
        this.lifecycle.update(args.componentId, args.props);
        return { status: 'updated' };
      },
    });

    // 4. Unmount component
    this.server.registerTool({
      name: 'unmount_component',
      description: 'Remove a rendered component.',
      inputSchema: {
        componentId: { type: 'string' },
      },

      async execute(args) {
        this.lifecycle.unmount(args.componentId);
        return { status: 'unmounted' };
      },
    });

    // 5. Get component state (for voice resolution)
    this.server.registerTool({
      name: 'get_component_state',
      description: 'Query the current state of a rendered component. ' +
                   'Use this to resolve voice commands like "remove the first item".',
      inputSchema: {
        componentId: { type: 'string' },
      },

      async execute(args) {
        const instance = this.lifecycle.getInstance(args.componentId);
        if (!instance) {
          return { error: `Component '${args.componentId}' not found` };
        }

        return instance.adaptor.getState(instance.component, instance.props);
      },
    });

    // 6. Invoke action programmatically
    this.server.registerTool({
      name: 'invoke_action',
      description: 'Programmatically trigger a component action from the agent.',
      inputSchema: {
        componentId: { type: 'string' },
        action: { type: 'string' },
        payload: { type: 'object' },
      },

      async execute(args) {
        this.lifecycle.invokeAction(args.componentId, args.action, args.payload);
        return { status: 'invoked' };
      },
    });
  }

  // Handle component actions (UI → Agent)
  onComponentAction(action: ComponentAction) {
    // Send to the connected agent
    this.notifyAgent({
      role: 'user',
      content: {
        type: 'component_action',
        componentId: action.componentId,
        componentName: action.componentName,
        action: action.action,
        payload: action.payload,
      },
    });
  }

  async start() {
    await this.server.listen();
  }
}
```

---

## Example 9: Conversation Surface (Vue Component)

```vue
<template>
  <div class="conversation-surface">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['message', message.role]"
    >
      <!-- Text messages -->
      <div v-if="message.type === 'text'" class="message-text">
        {{ message.content }}
      </div>

      <!-- Component messages -->
      <component
        v-else-if="message.type === 'component'"
        :is="getComponent(message.componentName)"
        :_componentId="message.componentId"
        :_onAction="handleAction"
        v-bind="message.props"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ComponentRegistry } from './registry';

const registry = new ComponentRegistry();
// ... register adaptors

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'text' | 'component';
  componentName?: string;
  componentId?: string;
  props?: Record<string, any>;
  content?: string;
}

const messages = ref<Message[]>([]);

// Called when the MCP server tells us to render a component
function renderComponent(componentName: string, props: Record<string, any>, componentId: string) {
  messages.value.push({
    id: crypto.randomUUID(),
    role: 'assistant',
    type: 'component',
    componentName,
    componentId,
    props,
  });
}

// Called when a component emits an action
function handleAction(action: ComponentAction) {
  // Send to MCP server → agent
  mcpClient.onComponentAction(action);
}

// Update an existing component
function updateComponent(componentId: string, newProps: Record<string, any>) {
  const message = messages.value.find(m => m.componentId === componentId);
  if (message) {
    message.props = { ...message.props, ...newProps };
  }
}

// Remove a component
function unmountComponent(componentId: string) {
  const index = messages.value.findIndex(m => m.componentId === componentId);
  if (index !== -1) {
    messages.value.splice(index, 1);
  }
}

function getComponent(componentName: string) {
  return registry.get(componentName)?.component;
}
</script>
```

---

## Example 10: Integration with Claude API

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { GenicUIServer } from './genicui-server';
import { ComponentRegistry } from './registry';

class GenicUIAgent {
  private claude = new Anthropic();
  private genicui = new GenicUIServer();
  private registry: ComponentRegistry;
  private conversation: Message[] = [];

  async handleMessage(userMessage: string) {
    // Add user message to conversation
    this.conversation.push({ role: 'user', content: userMessage });

    // Build system prompt with component guidance
    const systemPrompt = this.buildSystemPrompt();

    // Build tools from GenicUI registry
    const tools = this.genicui.getToolDefinitions();

    // Call Claude
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-5',
      system: systemPrompt,
      messages: this.conversation,
      tools,
      max_tokens: 1024,
    });

    // Process response — may include tool calls
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = await this.genicui.executeTool(block.name, block.input);

        // Add tool result to conversation
        this.conversation.push({
          role: 'user',
          content: result,
        });

        // If it's a render_component, also update the UI
        if (block.name === 'render_component' && result.componentId) {
          this.ui.renderComponent(block.input.componentName, block.input.props, result.componentId);
        }
      }

      if (block.type === 'text') {
        this.conversation.push({ role: 'assistant', content: block.text });
        this.ui.appendMessage('assistant', block.text);
      }
    }
  }

  private buildSystemPrompt(): string {
    const components = this.registry.getAllSchemas();

    return `You are an AI agent in an e-commerce application.

You can render UI components in the conversation. Available components:

${components.map(c => `
- ${c.name}: ${c.description}
  Use when: ${c.whenToUse.join('; ')}
  Actions: ${c.actions.map(a => a.name).join(', ')}
`).join('\n')}

To render a component:
1. Call find_ui_component to discover the right component
2. Call render_component with the component name and props
3. When the user interacts, you'll receive a component_action event
4. Respond conversationally and call update_component if needed

Always explain what the user is seeing. Components complement your text, they don't replace it.`;
  }
}
```

---

## Quick Reference: Adaptor Checklist

When creating a new adaptor, ensure:

- [ ] **Schema.name** is unique and PascalCase
- [ ] **Schema.description** is clear and tells the agent what it does
- [ ] **Schema.whenToUse** has 4-8 natural language phrases (critical for search)
- [ ] **Schema.inputSchema** is a valid Zod schema
- [ ] **Schema.actions** list all user interactions the component supports
- [ ] **getState()** returns structured data with indices for voice resolution
- [ ] **component** wraps the library component with event mapping
- [ ] **wireActions()** connects component events to the action handler
- [ ] **cleanup()** removes listeners on unmount
- [ ] Registered with the ComponentRegistry
