# GenicUI — Adaptor Specification

## Overview

Every adaptor is a thin wrapper around an existing component library component. It adds three capabilities:

1. **Schema** — metadata so the agent knows what the component does and how to use it
2. **Event Bridge** — user interactions become structured events for the agent
3. **State Reporter** — current component state as structured data for voice resolution

The adaptor interface is **library-agnostic**. The same interface works for PrimeVue, Vuetify, ShadCN, or any other component library.

---

## Core Interfaces

### 1. `ComponentSchema` — What the Agent Sees

```typescript
interface ComponentSchema {
  /** Unique component identifier */
  name: string;

  /** Human-readable description for the agent's system prompt */
  description: string;

  /** Natural language hints for when to use this component.
   * Used by semantic search in find_ui_component. */
  whenToUse: string[];

  /** Category for grouping and filtering */
  category: ComponentCategory;

  /** JSON schema of the props the component accepts.
   * The agent uses this to build correct props. */
  inputSchema: InputSchema;

  /** Actions this component can emit when the user interacts with it */
  actions: ActionDefinition[];
}

type ComponentCategory =
  | 'data-display'
  | 'visualization'
  | 'input'
  | 'layout'
  | 'feedback'
  | 'ecommerce'
  | 'navigation'
  | 'overlay';

interface ActionDefinition {
  /** Action identifier, e.g. "row_selected" */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON schema of the payload */
  payload: Record<string, any>;
}

/** Simplified JSON schema (Zod-compatible) */
type InputSchema = z.ZodObject<any>;
```

### 2. `ComponentState` — What the Agent Can Query

```typescript
interface ComponentState {
  /** The component's internal state as structured data.
   * Used for voice resolution: "remove the first item" → which is first? */
  data: Record<string, any>;

  /** Metadata about the current view (pagination, sort, selection) */
  metadata: {
    selectedIndices?: number[];
    currentPage?: number;
    totalItems?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    [key: string]: any;
  };
}
```

### 3. `ComponentAction` — What the Agent Receives

```typescript
interface ComponentAction {
  /** Unique identifier for the mounted component instance */
  componentId: string;

  /** Component name, e.g. "DataTable" */
  componentName: string;

  /** Action identifier from the schema */
  action: string;

  /** Action-specific payload */
  payload: Record<string, any>;
}
```

### 4. `ComponentAdaptor` — The Full Interface

```typescript
interface ComponentAdaptor<
  PROPS extends Record<string, any> = Record<string, any>,
  STATE extends Record<string, any> = Record<string, any>,
  ACTION extends string = string
> {
  /** Metadata the agent reads to understand the component */
  schema: ComponentSchema & {
    name: string;
    description: string;
    whenToUse: string[];
    category: ComponentCategory;
    inputSchema: InputSchema;
    actions: ActionDefinition[];
  };

  /** The wrapped component (framework-specific) */
  component: FrameworkComponent;

  /** Return the current structured state of a mounted instance.
   * Called by get_component_state() and for voice resolution.
   * @param instance - The mounted component instance
   * @param props - The current props passed to the component */
  getState(instance: any, props: PROPS): ComponentState;

  /** Wire action handlers to the component.
   * Called when the component mounts. The adaptor should attach
   * listeners and call the provided handler when actions occur.
   * @param instance - The mounted component instance
   * @param onAction - Callback to invoke when the user triggers an action */
  wireActions(instance: any, onAction: (action: ComponentAction) => void): void;

  /** Clean up action handlers when the component unmounts.
   * @param instance - The mounted component instance */
  cleanup(instance: any): void;
}
```

---

## Adaptor Implementation

### Base Adaptor Class

```typescript
import { z } from 'zod';

abstract class BaseAdaptor<PROPS, STATE, ACTION extends string>
  implements ComponentAdaptor<PROPS, STATE, ACTION>
{
  abstract schema: ComponentSchema;
  abstract component: FrameworkComponent;

  abstract getState(instance: any, props: PROPS): ComponentState;
  abstract wireActions(instance: any, onAction: (action: ComponentAction) => void): void;
  abstract cleanup(instance: any): void;

  /** Validate props against the input schema */
  validateProps(props: PROPS): { valid: boolean; errors?: string[] } {
    try {
      this.schema.inputSchema.parse(props);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  /** Generate a text representation for accessibility / screen readers */
  toAccessibleText(state: ComponentState): string {
    const lines = [`${this.schema.name}: ${this.schema.description}`];

    if (state.metadata.totalItems) {
      lines.push(`${state.metadata.totalItems} items`);
    }
    if (state.metadata.selectedIndices?.length) {
      lines.push(
        `Selected: ${state.metadata.selectedIndices.map(i => `item ${i + 1}`).join(', ')}`
      );
    }
    if (state.metadata.currentPage !== undefined && state.metadata.totalItems) {
      lines.push(`Page ${state.metadata.currentPage + 1}`);
    }

    return lines.join('. ');
  }
}
```

---

## Concrete Adaptor Examples

### Example 1: DataTable Adaptor (PrimeVue)

```typescript
import { DataTable } from 'primevue/datatable';
import { z } from 'zod';
import { BaseAdaptor } from './base-adaptor';

const DataTableAdaptor = new (class extends BaseAdaptor<DataTableProps, DataTableState, DataTableActions> {
  schema = {
    name: 'DataTable',
    description: 'Displays tabular data with sorting, filtering, and pagination. ' +
                 'Supports row selection and column sorting.',
    whenToUse: [
      'show a list of products',
      'display search results',
      'show user orders',
      'present any structured data in rows and columns',
      'show comparison data',
    ],
    category: 'data-display',

    inputSchema: z.object({
      title: z.string().optional().describe('Title displayed above the table'),
      columns: z.array(z.object({
        field: z.string().describe('The data field key'),
        header: z.string().describe('Column header text'),
        sortable: z.boolean().optional().default(true).describe('Allow sorting'),
        filterable: z.boolean().optional().default(false).describe('Allow filtering'),
        width: z.string().optional().describe('Column width, e.g. "150px"'),
      })).min(1).describe('Column definitions'),
      data: z.array(z.record(z.any())).describe('Array of row objects'),
      pagination: z.boolean().optional().default(false).describe('Enable pagination'),
      pageSize: z.number().optional().default(10).describe('Rows per page'),
      selection: z.boolean().optional().default(false).describe('Enable row selection'),
      selectionMode: z.enum(['single', 'multiple']).optional().default('single'),
    }),

    actions: [
      {
        name: 'row_selected',
        description: 'User clicked a row',
        payload: {
          rowIndex: { type: 'number', description: 'Zero-based row index' },
          rowData: { type: 'object', description: 'The row data' },
        },
      },
      {
        name: 'row_double_clicked',
        description: 'User double-clicked a row',
        payload: {
          rowIndex: { type: 'number' },
          rowData: { type: 'object' },
        },
      },
      {
        name: 'column_sorted',
        description: 'User clicked a column header to sort',
        payload: {
          column: { type: 'string', description: 'Column field name' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      {
        name: 'page_changed',
        description: 'User navigated to a different page',
        payload: {
          page: { type: 'number', description: 'Zero-based page index' },
        },
      },
      {
        name: 'filter_applied',
        description: 'User applied a filter to a column',
        payload: {
          column: { type: 'string' },
          value: { type: 'string' },
        },
      },
    ],
  };

  component = wrapComponent(DataTable, {
    // Wire PrimeVue events to our action handlers
    eventMap: {
      'row-click': 'row_selected',
      'row-db-click': 'row_double_clicked',
      'sort': 'column_sorted',
      'page': 'page_changed',
      'filter': 'filter_applied',
    },
  });

  getState(instance: any, props: DataTableProps): ComponentState {
    return {
      data: {
        rows: props.data.map((row, index) => ({
          index,
          ...row,
        })),
      },
      metadata: {
        totalItems: props.data.length,
        currentPage: instance?.page ?? 0,
        sortBy: instance?.sortField,
        sortDirection: instance?.sortOrder === 1 ? 'asc' : 'desc',
        selectedIndices: instance?.selectedRowIndexes ?? [],
      },
    };
  }

  wireActions(instance: any, onAction: (action: ComponentAction) => void): void {
    // PrimeVue events are wired via the eventMap in wrapComponent
    // Additional custom logic can go here
  }

  cleanup(instance: any): void {
    // Clean up any event listeners or subscriptions
  }
})(undefined, undefined);

// Type definitions for the DataTable adaptor
interface DataTableProps {
  title?: string;
  columns: Array<{
    field: string;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
  }>;
  data: Record<string, any>[];
  pagination?: boolean;
  pageSize?: number;
  selection?: boolean;
  selectionMode?: 'single' | 'multiple';
}

interface DataTableState {
  rows: Array<{ index: number; [key: string]: any }>;
}

type DataTableActions =
  | 'row_selected'
  | 'row_double_clicked'
  | 'column_sorted'
  | 'page_changed'
  | 'filter_applied';
```

### Example 2: Chart Adaptor (PrimeVue)

```typescript
import { Chart } from 'primevue/chart';
import { z } from 'zod';
import { BaseAdaptor } from './base-adaptor';

const ChartAdaptor = new (class extends BaseAdaptor<ChartProps, ChartState, ChartActions> {
  schema = {
    name: 'Chart',
    description: 'Renders data visualizations including line, bar, pie, doughnut, and area charts. ' +
                 'Use for showing trends, comparisons, or distributions.',
    whenToUse: [
      'show sales trends over time',
      'compare values across categories',
      'display data distribution',
      'show performance metrics',
      'visualize growth or decline',
    ],
    category: 'visualization',

    inputSchema: z.object({
      type: z.enum(['line', 'bar', 'pie', 'doughnut', 'area', 'radar']).describe('Chart type'),
      title: z.string().optional().describe('Chart title'),
      labels: z.array(z.string()).describe('X-axis labels or category names'),
      datasets: z.array(z.object({
        label: z.string().describe('Dataset name shown in legend'),
        data: z.array(z.number()).describe('Data points'),
        color: z.string().optional().describe('Hex color for the dataset'),
      })).min(1).describe('Data series'),
      showLegend: z.boolean().optional().default(true),
      showTooltip: z.boolean().optional().default(true),
    }),

    actions: [
      {
        name: 'point_clicked',
        description: 'User clicked a data point',
        payload: {
          datasetIndex: { type: 'number' },
          dataIndex: { type: 'number' },
          label: { type: 'string', description: 'The label at this point' },
          value: { type: 'number', description: 'The value at this point' },
        },
      },
    ],
  };

  component = wrapComponent(Chart, {
    eventMap: {
      'data-click': 'point_clicked',
    },
  });

  getState(instance: any, props: ChartProps): ComponentState {
    const points = props.datasets.flatMap((dataset, di) =>
      dataset.data.map((value, dataIndex) => ({
        datasetIndex: di,
        datasetLabel: dataset.label,
        dataIndex,
        label: props.labels[dataIndex],
        value,
      }))
    );

    return {
      data: { points },
      metadata: {
        totalPoints: points.length,
        datasets: props.datasets.map(d => d.label),
      },
    };
  }

  wireActions(instance: any, onAction: (action: ComponentAction) => void): void {}
  cleanup(instance: any): void {}
})(undefined, undefined);

interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar';
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
  showLegend?: boolean;
  showTooltip?: boolean;
}

type ChartActions = 'point_clicked';
```

### Example 3: Form Adaptor (PrimeVue)

```typescript
import { z } from 'zod';
import { BaseAdaptor } from './base-adaptor';

const FormAdaptor = new (class extends BaseAdaptor<FormProps, FormState, FormActions> {
  schema = {
    name: 'Form',
    description: 'Collects user input through a form with various field types. ' +
                 'Supports text, email, password, number, select, checkbox, textarea, and date fields. ' +
                 'Validates input and emits events on field changes and submission.',
    whenToUse: [
      'collect user shipping address',
      'create account or profile',
      'search with filters',
      'update user settings',
      'collect feedback or reviews',
      'any scenario requiring structured user input',
    ],
    category: 'input',

    inputSchema: z.object({
      title: z.string().optional().describe('Form title'),
      fields: z.array(z.object({
        name: z.string().describe('Field identifier'),
        label: z.string().describe('Display label'),
        type: z.enum([
          'text', 'email', 'password', 'number', 'tel',
          'select', 'checkbox', 'textarea', 'date', 'url'
        ]).describe('Field type'),
        placeholder: z.string().optional().describe('Placeholder text'),
        required: z.boolean().optional().default(false).describe('Is field required'),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })).optional().describe('Options for select fields'),
        defaultValue: z.any().optional().describe('Initial value'),
      })).min(1).describe('Form fields'),
      submitLabel: z.string().optional().default('Submit').describe('Submit button text'),
    }),

    actions: [
      {
        name: 'field_changed',
        description: 'User changed a field value',
        payload: {
          fieldName: { type: 'string' },
          value: { type: 'string' },
        },
      },
      {
        name: 'submitted',
        description: 'User submitted the form',
        payload: {
          values: {
            type: 'object',
            description: 'Object mapping field names to values',
          },
        },
      },
      {
        name: 'validation_error',
        description: 'Form validation failed',
        payload: {
          fieldName: { type: 'string' },
          message: { type: 'string' },
        },
      },
    ],
  };

  component = wrapFormComponent({
    eventMap: {
      'field-change': 'field_changed',
      'submit': 'submitted',
      'validation-error': 'validation_error',
    },
  });

  getState(instance: any, props: FormProps): ComponentState {
    const fieldValues = props.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      value: instance?.values?.[field.name] ?? field.defaultValue,
      valid: instance?.validity?.[field.name] ?? true,
    }));

    return {
      data: { fields: fieldValues },
      metadata: {
        totalFields: props.fields.length,
        filledFields: fieldValues.filter(f => f.value).length,
        allValid: fieldValues.every(f => f.valid),
      },
    };
  }

  wireActions(instance: any, onAction: (action: ComponentAction) => void): void {}
  cleanup(instance: any): void {}
})(undefined, undefined);

interface FormProps {
  title?: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'select' | 'checkbox' | 'textarea' | 'date' | 'url';
    placeholder?: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
    defaultValue?: any;
  }>;
  submitLabel?: string;
}

type FormActions = 'field_changed' | 'submitted' | 'validation_error';
```

### Example 4: CartViewer Adaptor (Composite — PrimeVue DataTable + custom logic)

```typescript
import { z } from 'zod';
import { BaseAdaptor } from './base-adaptor';

/**
 * CartViewer is a COMPOSITE adaptor — it combines existing PrimeVue
 * components (DataTable, Button, Image) with custom layout and logic.
 * This demonstrates how adaptors can build new components from existing ones.
 */
const CartViewerAdaptor = new (class extends BaseAdaptor<CartViewerProps, CartViewerState, CartViewerActions> {
  schema = {
    name: 'CartViewer',
    description: 'Displays the shopping cart with items, quantities, prices, and total. ' +
                 'Supports quantity changes, item removal, and checkout. ' +
                 'Shows item images and a summary with subtotal, taxes, and total.',
    whenToUse: [
      'show the user shopping cart',
      'display cart items and total',
      'review order before checkout',
      'user asks "what is in my cart"',
      'user says "show my cart"',
    ],
    category: 'ecommerce',

    inputSchema: z.object({
      items: z.array(z.object({
        id: z.string().describe('Unique item identifier'),
        name: z.string().describe('Product name'),
        quantity: z.number().describe('Quantity in cart'),
        price: z.number().describe('Unit price'),
        image: z.string().optional().describe('Product image URL'),
      })).describe('Cart items'),
      subtotal: z.number().describe('Subtotal before tax'),
      tax: z.number().optional().default(0).describe('Tax amount'),
      shipping: z.number().optional().default(0).describe('Shipping cost'),
      showRecommendations: z.boolean().optional().default(false),
      onEmptyMessage: z.string().optional().default('Your cart is empty'),
    }),

    actions: [
      {
        name: 'quantity_changed',
        description: 'User changed the quantity of an item',
        payload: {
          itemId: { type: 'string' },
          newQuantity: { type: 'number' },
        },
      },
      {
        name: 'item_removed',
        description: 'User removed an item from the cart',
        payload: {
          itemId: { type: 'string' },
          itemName: { type: 'string' },
        },
      },
      {
        name: 'checkout_requested',
        description: 'User clicked the checkout button',
        payload: {
          total: { type: 'number' },
          itemCount: { type: 'number' },
        },
      },
      {
        name: 'clear_cart_requested',
        description: 'User clicked to clear the entire cart',
        payload: {},
      },
    ],
  };

  // Composite component: combines DataTable + Button + Image + custom layout
  component = defineCompositeComponent({
    name: 'CartViewer',
    // Renders PrimeVue DataTable for items, Buttons for actions, Images for products
    renders: [DataTable, Button, Image],
    template: `cart-viewer.vue`,
    eventMap: {
      'quantity-change': 'quantity_changed',
      'item-remove': 'item_removed',
      'checkout': 'checkout_requested',
      'clear-cart': 'clear_cart_requested',
    },
  });

  getState(instance: any, props: CartViewerProps): CartViewerState {
    return {
      data: {
        items: props.items.map((item, index) => ({
          index,
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.quantity * item.price,
        })),
        subtotal: props.subtotal,
        tax: props.tax,
        shipping: props.shipping,
        total: props.subtotal + props.tax + props.shipping,
      },
      metadata: {
        totalItems: props.items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueItems: props.items.length,
      },
    };
  }

  wireActions(instance: any, onAction: (action: ComponentAction) => void): void {}
  cleanup(instance: any): void {}
})(undefined, undefined);

interface CartViewerProps {
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  tax?: number;
  shipping?: number;
  showRecommendations?: boolean;
  onEmptyMessage?: string;
}

type CartViewerActions =
  | 'quantity_changed'
  | 'item_removed'
  | 'checkout_requested'
  | 'clear_cart_requested';
```

---

## Component Wrapper Helper

The `wrapComponent` helper bridges a library component to the adaptor interface:

```typescript
/**
 * Wraps a PrimeVue (or other library) component and maps its native events
 * to our standardized action format.
 */
function wrapComponent<T extends Record<string, any>, EVENT extends string, ACTION extends string>(
  libraryComponent: T,
  options: {
    eventMap: Record<EVENT, ACTION>;
  }
) {
  return defineComponent({
    extends: libraryComponent,
    props: {
      ...((libraryComponent as any).props ?? {}),
      /** Internal: unique component instance ID */
      _componentId: { type: String, required: true },
      /** Internal: action handler from the adaptor */
      _onAction: { type: Function },
    },
    setup(props: any) {
      return {
        handleAction(eventType: ACTION, payload: Record<string, any>) {
          if (props._onAction) {
            props._onAction({
              componentId: props._componentId,
              componentName: eventType,
              action: eventType,
              payload,
            });
          }
        },
      };
    },
    mounted() {
      // Map library events to our action format
      for (const [libraryEvent, actionName] of Object.entries(options.eventMap)) {
        this.$on(libraryEvent, (eventData: any) => {
          this.handleAction(actionName, {
            ...eventData,
          });
        });
      }
    },
  });
}
```

---

## Adaptor Registry

The registry collects all adaptors and provides the interface for the MCP server:

```typescript
class ComponentRegistry {
  private adaptors: Map<string, ComponentAdaptor> = new Map();

  /** Register an adaptor */
  register(adaptor: ComponentAdaptor): void {
    this.adaptors.set(adaptor.schema.name, adaptor);
  }

  /** Get adaptor by name */
  get(name: string): ComponentAdaptor | undefined {
    return this.adaptors.get(name);
  }

  /** Get all schema definitions (for the agent's tool definitions) */
  getAllSchemas(): ComponentSchema[] {
    return Array.from(this.adaptors.values()).map(a => a.schema);
  }

  /** Search adaptors by whenToUse keywords */
  search(query: string): Array<{ name: string; score: number }> {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    return Array.from(this.adaptors.values())
      .map(adaptor => {
        let score = 0;
        for (const term of terms) {
          for (const use of adaptor.schema.whenToUse) {
            if (use.toLowerCase().includes(term)) {
              score += 1;
            }
          }
          if (adaptor.schema.name.toLowerCase().includes(term)) {
            score += 2;
          }
          if (adaptor.schema.description.toLowerCase().includes(term)) {
            score += 1;
          }
        }
        return { name: adaptor.schema.name, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /** List all categories */
  getCategories(): ComponentCategory[] {
    const categories = new Set<ComponentCategory>();
    for (const adaptor of this.adaptors.values()) {
      categories.add(adaptor.schema.category);
    }
    return Array.from(categories);
  }
}

// Usage
const registry = new ComponentRegistry();
registry.register(DataTableAdaptor);
registry.register(ChartAdaptor);
registry.register(FormAdaptor);
registry.register(CartViewerAdaptor);

// Search
registry.search('show list of orders');
// → [{ name: 'DataTable', score: 5 }, { name: 'List', score: 3 }]
```

---

## Voice Resolution

The `getState()` method enables voice command resolution. Here's how it works:

```typescript
/**
 * Resolve a voice command like "remove the first item" to a specific
 * action on a component.
 */
async function resolveVoiceCommand(
  registry: ComponentRegistry,
  componentId: string,
  command: string
): Promise<{ action: string; payload: Record<string, any> } | null> {
  // 1. Get the component state
  const instance = getMountedInstance(componentId);
  const adaptor = getInstanceAdaptor(componentId);
  const state = adaptor.getState(instance, instance.props);

  // 2. Parse the command (simplified — use NLP in production)
  const firstMatch = command.match(/first\s+(\w+)/i);
  const lastMatch = command.match(/last\s+(\w+)/i);
  const indexMatch = command.match(/(\d+)(?:st|nd|rd|th)\s+(\w+)/i);

  let targetIndex: number | undefined;

  if (firstMatch) {
    targetIndex = 0;
  } else if (lastMatch) {
    targetIndex = state.data.rows?.length - 1 ?? state.data.items?.length - 1;
  } else if (indexMatch) {
    targetIndex = parseInt(indexMatch[1]) - 1;
  }

  if (targetIndex === undefined) return null;

  // 3. Find the target item
  const rows = state.data.rows ?? state.data.items ?? [];
  const target = rows[targetIndex];
  if (!target) return null;

  // 4. Return the resolved action
  return {
    action: 'remove_item',
    payload: {
      index: targetIndex,
      id: target.id,
      name: target.name,
    },
  };
}
```

---

## Adaptor Categories

| Category | Components | Purpose |
|---|---|---|
| `data-display` | DataTable, List, Card, Tree, Timeline | Show structured data |
| `visualization` | Chart, Gauge, ProgressBar, Calendar | Visualize data |
| `input` | Form, InputText, Select, DatePicker | Collect user input |
| `layout` | Accordion, TabView, Panel, Breadcrumb | Organize content |
| `feedback` | Toast, Message, ConfirmationDialog | Notify the user |
| `ecommerce` | CartViewer, ProductCard, CheckoutSummary | E-commerce patterns |
| `navigation` | Menu, Breadcrumb, Steps, Sidebar | Navigate between views |
| `overlay` | Dialog, Tooltip, Sidebar, Popover | Overlay content |

---

## Guidelines for Writing Adaptors

1. **Keep adaptors thin** — Don't reimplement component logic. Wrap, don't replace.
2. **Schema is king** — The `whenToUse` array is what semantic search uses. Write it carefully.
3. **Actions over events** — Map native component events to semantic action names. `row-click` → `row_selected`, not `row-click`.
4. **State for voice** — `getState()` should return enough structure to resolve "first", "last", "the one named X", etc.
5. **Composite adaptors** — When a use case needs multiple components (cart = table + buttons + images), build a composite adaptor.
6. **Library-agnostic interface** — The adaptor interface should work the same way whether the underlying component is PrimeVue, Vuetify, or ShadCN.
