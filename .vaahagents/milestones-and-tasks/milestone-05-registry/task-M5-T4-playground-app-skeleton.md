# Task M5-T4 — Playground App Skeleton

> **Milestone:** M5 (Registry: Component Registry + PrimeVue Adapter)
> **Manifest feature:** F41 (Playground demo app)
> **Priority:** High
> **Status:** ✅ Completed
> **Estimated Effort:** 2-3 days
> **Completed:** 2026-09-03
> **Summary:** Nuxt 4 + PrimeVue playground at examples/playground/ with 3-panel layout, WebSocket client, component renderer, empty state. 8 tests pass, build clean.

## Description

Create the Nuxt 4 + PrimeVue playground demo app shell at `examples/playground/`. This is the polished demo/showcase app that demonstrates the full GenicUI pipeline: user prompt → LLM → MCP tools → GenicUI server → WebSocket → browser render.

The app provides a 3-panel layout with LLM configuration, registry selector, and a render surface where components appear live.

## Task Goals

- Nuxt 4 app with PrimeVue (Aura theme) configured
- 3-panel layout: config panel (left ~25%), render surface (right ~75%)
- WebSocket client that connects to `ws://localhost:3040/ws`
- Component renderer that receives `component` messages and renders PrimeVue components
- Empty state placeholder

## Implementation Plan

### Steps

1. Create `examples/playground/` directory with Nuxt 4 project structure
2. Install and configure PrimeVue with Aura theme (per primevue skill)
3. Create 3-panel layout: config panel (left), render surface (right)
4. Implement WebSocket client (`connectWebSocket()`) to `ws://localhost:3040/ws`
5. Implement component renderer that receives `component` messages
6. Add empty state placeholder ("Connect to GenicUI server and start a prompt")
7. Add basic PrimeVue styling (InputText, Button, Card components)
8. Write basic tests for WebSocket client connection
9. Verify app runs with `bun run dev`

## Acceptance Criteria

- [ ] Nuxt 4 app runs at `http://localhost:3000` with PrimeVue Aura theme
- [ ] 3-panel layout renders correctly (config left ~25%, render right ~75%)
- [ ] WebSocket client connects to `ws://localhost:3040/ws`
- [ ] Component renderer receives `component` messages and renders them
- [ ] Empty state placeholder displays when no components are rendered
- [ ] `bun run dev` starts the app without errors
- [ ] `bun run test` exits green

## Completion Criteria

- [ ] All acceptance criteria above pass
- [ ] `bun run test` exits green
- [ ] `bun run lint` reports zero errors
- [ ] App runs at localhost:3000 with PrimeVue components

## Dependencies

- **Requires:** M5-T1 (F37 — component registry exists)
- **Blocks:** M5-T6 (M5-T6 builds on the playground app)
