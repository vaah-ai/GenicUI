# GenicUI — FAQ

Plain-language answers to common questions about GenicUI. No jargon. No code (unless necessary).

---

## What Is GenicUI?

### In One Sentence

GenicUI lets AI agents (like Claude or GPT) show real UI components — tables, charts, forms, carts — inside a chat conversation instead of just replying with text.

### A Real Example

**Without GenicUI:**
```
User: "Show me my cart"
AI:   "Your cart has a Laptop ($999) and 2 Mice ($58). Total: $1,057."
```

**With GenicUI:**
```
User: "Show me my cart"
AI:   "Here's your cart" [renders a real cart component with items, prices,
        quantity controls, and a checkout button right in the chat]
```

The AI didn't just *describe* the cart. It *showed* it.

---

## Why Do We Need This?

### The Problem

Today, AI agents can only reply with **text** (or maybe images). If you ask an AI to "show my orders," it gives you a text list. It can't show you a real interactive table with sorting, filtering, and pagination.

Traditional UI component libraries (PrimeVue, Vuetify, ShadCN) are built for **humans** who click buttons. AI agents don't click buttons — they *decide* which components to show and *react* to what the user does.

### The Solution

GenicUI sits between the AI agent and existing component libraries. It wraps components like PrimeVue's DataTable or Chart and makes them "AI-aware" — meaning the agent knows what they do, how to use them, and can react when the user interacts with them.

---

## How Does It Work?

### The Three-Layer Model

Think of it like a restaurant:

| Layer | Role | Restaurant Analogy |
|---|---|---|
| **AI Agent** | Decides what to show | The waiter who takes your order |
| **MCP Server** | Finds the right component and manages it | The kitchen that prepares the food |
| **Adaptor + Component** | The actual UI you see | The plate of food on your table |

### Step by Step

1. **You say something:** "Show me my orders"
2. **The AI understands your intent:** The user wants to see a list of orders
3. **The AI searches for the right component:** "I need something that shows lists... DataTable fits"
4. **The AI renders it:** "Show the DataTable with these orders"
5. **The component appears in the chat:** You see a real interactive table
6. **You interact with it:** You click a row, sort a column, etc.
7. **The AI knows what you did:** The AI sees "row selected, order ORD-001"
8. **The AI responds:** "You selected order ORD-001. Want to track it?"

### The Secret Sauce: The Adaptor

An **adaptor** is a thin wrapper around an existing component (like PrimeVue's DataTable). It adds three things:

1. **A description card** — Tells the AI: "I'm a DataTable. I show tables. Use me when the user wants to see lists of data."
2. **An event bridge** — When you click something, the adaptor tells the AI: "The user just clicked row 3."
3. **A state snapshot** — When you say "remove the first item," the adaptor can say: "The first item is ORD-001."

Without the adaptor, the AI doesn't know the component exists. With it, the AI can use it naturally.

---

## Key Concepts Explained

### What Is an "Adaptor"?

An adaptor is a **wrapper** around an existing component. Think of it like an iPhone charger adapter:

- The existing component (PrimeVue DataTable) is the **outlet**
- The AI agent is the **device** that needs power
- The adaptor **connects them** so they can talk

The adaptor adds:
- **Schema** — A card describing what the component does (like a restaurant menu)
- **Event bridge** — Tells the AI when you click something (like a doorbell)
- **State reporter** — Tells the AI what the component currently shows (like a mirror)

### What Is "Semantic Search"?

When the AI wants to show something, it doesn't know which component to use. It asks in plain English: "I want to show a list of orders."

**Semantic search** understands the *meaning* of that request and finds the best component. It's like asking a librarian "I need a book about cooking" — they don't just match the word "cooking," they understand you want recipes, not a cookbook history.

### What Is "Voice Resolution"?

Voice resolution is how the AI understands commands like "remove the **first** item" or "show me the **one from July**."

The AI asks the component: "What's currently showing?" The component replies: "Row 0 is ORD-001, Row 1 is ORD-002." Now the AI knows "first" = ORD-001.

Without voice resolution, the AI would have to guess what "first" means.

### What Is "MCP"?

MCP (Model Context Protocol) is a **standard way** for AI agents to discover and use tools. Think of it like USB-C:

- Before USB-C: Every device had its own charger (chaos)
- With USB-C: One standard connector works with everything

MCP is the "USB-C" for AI tools. GenicUI uses MCP so any AI agent (Claude, GPT, or others) can discover and use GenicUI components.

---

## Common Questions

### Do We Have to Build Components From Scratch?

**No.** That's the whole point. GenicUI wraps existing components from PrimeVue, Vuetify, ShadCN, or any library. You don't rebuild a DataTable — you wrap the one PrimeVue already built and make it AI-aware.

### How Long Does It Take to Add a Component?

**2-3 days per component** for most components. Here's why:

| Task | Time |
|---|---|
| Write the schema (description, when to use, props) | 2-4 hours |
| Wire events (click → action) | 2-4 hours |
| Implement state reporter | 1-2 hours |
| Test with the AI agent | 2-4 hours |
| **Total** | **~1 day** |

Complex components (Calendar, Tree, Chart) take 2-3 days. Simple ones (Toast, Message, Breadcrumb) can be done in a few hours.

### What If the AI Picks the Wrong Component?

The AI uses semantic search, which is very good but not perfect. Here's what happens:

```
User: "Show me my orders"
AI searches → DataTable (confidence: 0.92)
Wrong? → AI also got: List (0.68), Timeline (0.45)
AI picks DataTable → renders it → you see the table
You don't like it? → AI responds conversationally:
  "I showed your orders as a table. Would you prefer a timeline view?"
```

The AI can **switch components** mid-conversation. It's not a one-shot decision.

### Can the AI Show Multiple Components at Once?

**Yes.** The AI can render a table and a chart side by side, or a list above a form. Example:

```
User: "Show me this month's sales"
AI: [DataTable with daily sales] [Chart showing the trend]
    "Here's your sales data. The table shows details, the chart shows the trend."
```

### How Does This Work With Voice?

Voice adds one extra step: **resolving the command to a specific item.**

```
User (voice): "Show me my orders"
AI: → renders table with orders

User (voice): "Remove the first one"
AI: → asks component "what's showing?" → gets { row 0: ORD-001, row 1: ORD-002 }
AI: → "first" = ORD-001 → removes it → updates the table
AI: → "Removed ORD-001. One order remaining."
```

The key is that every component reports its **current state** (what rows/items it shows). The AI uses that to understand "first," "last," "the one named X," etc.

### What Happens If Something Goes Wrong?

The AI handles errors **conversationally**, like a helpful assistant:

```
AI tries to show a map → map API key not configured
AI says: "I can't show the map right now. But the store is at
         123 Main St, San Francisco. Want driving directions?"
```

The AI doesn't crash. It explains the problem and offers alternatives.

### Can I Use This With Any AI Agent?

**Yes.** GenicUI uses the MCP protocol, which is the standard for AI tools. Any agent that supports MCP (Claude, Cursor, etc.) can use GenicUI components. The agent doesn't care if the component is backed by PrimeVue, Vuetify, or ShadCN.

### What About Themes and Styling?

**Inherited from the library.** If you use PrimeVue, components get PrimeVue's theming. If you use Vuetify, they get Vuetify's theming. GenicUI doesn't redefine styles — it wraps existing components that already look good.

### Is This Only for E-Commerce?

**No.** The e-commerce examples are just because they're easy to understand. GenicUI works for any domain:

| Domain | Components Used |
|---|---|
| E-Commerce | CartViewer, ProductCard, DataTable, CheckoutSummary |
| Healthcare | AppointmentCalendar, PatientList, Form, Chart |
| Real Estate | PropertyCard, Map, SearchBar, FilterPanel |
| Education | CourseList, ProgressBar, Quiz, Leaderboard |
| SaaS Dashboard | DataTable, Chart, Gauge, SettingsForm |

### How Is This Different from a Regular Chatbot?

| | Regular Chatbot | GenicUI-Powered Agent |
|---|---|---|
| Shows data | Text description | Real interactive component |
| User interaction | Type a message | Click, sort, filter, select |
| Voice commands | "What's first?" → text reply | "What's first?" → AI reads component state → acts |
| Multi-step flow | "Step 1: enter name. Step 2: enter address." | Real form with validation |
| Visual appeal | Text with maybe an image | Full UI components with charts, tables, etc. |

### Do Users Need to Install Anything?

**No.** The user just uses your app. GenicUI runs inside your application. The user sees a chat interface where real UI components appear alongside text messages. They don't know GenicUI exists — they just see a smarter, richer chat experience.

### What If I Want to Add a Custom Component?

You write an **adaptor** for it. The adaptor describes:
- What the component does
- What data it needs (props)
- What actions it can emit (clicks, selections, etc.)
- How to read its current state (for voice resolution)

Once the adaptor is written, the AI agent automatically discovers and uses it. No changes needed to the AI's code.

### Can the AI Navigate Between Pages?

GenicUI components don't navigate — they **emit events**. If the user clicks a product in a list, the component emits "product selected." The AI then decides what to do: show details, show a form, navigate elsewhere, etc. The AI is always in control.

This is different from traditional web apps where clicking a link navigates to a new page. Here, the AI **orchestrates** the entire experience.

---

## How Is This Different From Existing Solutions?

### vs. Traditional Component Libraries (PrimeVue, Vuetify, ShadCN)

| | PrimeVue/Vuetify | GenicUI |
|---|---|---|
| Who drives it? | User clicks → component reacts | AI decides → component renders → user acts → AI reacts |
| AI aware? | No — AI can't use them | Yes — AI discovers and uses them |
| Voice support | No — components don't expose state | Yes — every component reports its state |
| Chat integration | No — components live on pages | Yes — components render inside conversations |

### vs. Building Components From Scratch

| | Build from scratch | GenicUI adaptor |
|---|---|---|
| Time per component | 2-4 weeks | 2-3 days |
| Testing | Full component test suite | Only adaptor logic |
| Theming | Build from scratch | Inherited from library |
| Accessibility | Build from scratch | Inherited from library |
| Community support | Start from zero | Leverage existing ecosystems |

### vs. ReAct / Function Calling Patterns

| | Function calling | GenicUI |
|---|---|---|
| UI rendering | Text-only responses | Real interactive components |
| User interaction | Text input only | Click, sort, filter, select |
| State awareness | AI tracks state in memory | Component reports its own state |
| Voice resolution | AI guesses | Component provides structured state |

---

## Getting Started

### What Do I Need?

1. **A component library** — PrimeVue, Vuetify, ShadCN, or any Vue/React library
2. **An AI agent** — Claude, GPT, or any agent that supports tool calling / MCP
3. **The GenicUI adaptor layer** — The bridge between the two

### What's the First Step?

1. Pick **5 components** you want to support (DataTable, Chart, Form, Toast, List is a good start)
2. Write an **adaptor** for each one (schema + event wiring + state reporter)
3. Build the **MCP server** that exposes them to the AI
4. Build the **conversation surface** (chat UI that renders components)
5. Test with a **real AI agent** (Claude, GPT, etc.)

### How Long for an MVP?

**8-12 weeks** with 2-3 engineers for 10 components, the MCP server, and a basic conversation surface.

---

## Still Confused?

Think of it this way:

> **GenicUI is a translator.** It translates between two languages:
> - The **AI agent's language** (natural language intent, tool calls, events)
> - The **component library's language** (props, slots, events, state)
>
> The AI says "show my orders in a table." The adaptor hears that and says "use PrimeVue's DataTable with these columns and this data." You click a row. The adaptor says "row 0 was selected." The AI hears that and says "you picked order ORD-001, want to track it?"

That's it. That's GenicUI.
