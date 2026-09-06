<template>
  <div id="playground-layout">
    <!-- Skip-to-content link for keyboard users (visually hidden until focused) -->
    <a class="skip-link" href="#render-surface-main">Skip to render surface</a>

    <!-- Top bar: brand + connection status + global actions -->
    <header class="topbar">
      <div class="topbar-brand">
        <div class="topbar-logo" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div class="topbar-title">
          <h1>GenicUI Playground</h1>
          <p>Connect to a GenicUI server to render components live</p>
        </div>
      </div>

      <div class="topbar-status">
        <div
          class="connection-status"
          :class="wsState"
          :aria-label="`Connection status: ${wsState}`"
        >
          <svg
            v-if="wsState === 'connecting'"
            class="status-spinner"
            viewBox="0 0 24 24"
            width="14"
            height="14"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-dasharray="40 60"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ wsStateLabel }}</span>
          <span v-if="session" class="topbar-session">
            · {{ session }}
          </span>
        </div>
      </div>
    </header>

    <!-- 3-zone main content -->
    <main class="main-grid">
      <ConfigPanel />
      <RenderSurface id="render-surface-main" />
      <ChatPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * GenicUI Playground root layout — 3-zone.
 *
 * Zones:
 * - Topbar: brand + connection status (global, persistent)
 * - Left:   ConfigPanel — connection config, registry, components list
 * - Center: RenderSurface — rendered components (the focal area)
 * - Right:  ChatPanel — chat history, loading state, clear action
 *
 * The center is the visual focus. Prompts surface here as a hero when
 * no components are rendered yet so the user always has something to do.
 */
import { computed } from 'vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useComponents } from '~/composables/useComponents.ts';

const ws = useWebSocket();
const wsState = ws.state;
const session = ws.sessionId;

// Subscribe component store to WS frames so a COMPONENT_MOUNTED frame
// from the server (e.g. when Claude Code's render_component MCP tool
// call is bridged through the chat handler) mounts the component in
// the RenderSurface. Without this subscription the playground would
// ignore the frame and the user would never see the rendered component.
const { subscribe: subscribeComponents } = useComponents();
subscribeComponents(ws);

const wsStateLabel = computed(() => {
  switch (wsState.value) {
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Connected';
    case 'error':
      return 'Connection failed';
    default:
      return 'Disconnected';
  }
});
</script>
