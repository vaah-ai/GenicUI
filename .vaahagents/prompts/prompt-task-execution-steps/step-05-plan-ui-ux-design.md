---
step: 5
title: Plan UI/UX Design
phase: Planning
---

# Step 5: Plan UI/UX Design

**MANDATORY — DO NOT SKIP.** If the task has any UI changes, this step MUST be executed.

**Invoke ALL of the following skills** to plan the UI/UX design:

- **`ui-ux-pro-max`** — for design intelligence (color palettes, typography, layout, UX patterns)
- **`shadcn`** — to load design system and styling conventions
- **`tailwind-design-system`** — for Tailwind CSS patterns
- **`next-best-practices`** — for component patterns and rendering strategies

Do NOT skip any of these skills.

Analyze:

- Current design system: GenicUI uses a chat-surface paradigm — components render inline within a chat transcript (see `poc/web/styles.css` and `poc/web/index.html`)
- Existing components that can be reused or extended: Counter, TodoList, CartViewer adaptors in `poc/adaptors/`
- Web Component base class with closed Shadow DOM — each `<genic-{name}>` wraps the underlying library
- PrimeVue 4 PassThrough API for injecting GenicUI data into PrimeVue components

**Invoke Playwright MCP server** (optional): take a screenshot of the current UI state for reference before changes.

Plan the UI implementation approach before writing code. Consider:

- Chat surface rendering (inline components within conversation flow)
- Component action buttons (increment/decrement, toggle, remove)
- Event forwarding from user interactions back to the agent
- Dark mode compatibility (if applicable)
- Accessibility: ARIA roles for custom elements, keyboard navigation
