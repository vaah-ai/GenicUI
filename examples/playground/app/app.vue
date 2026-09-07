<template>
  <div id="playground-layout">
    <!-- Skip-to-content link for keyboard users (visually hidden until focused) -->
    <a class="skip-link" href="#chat-panel-main">Skip to chat</a>

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

    <!-- 3-zone main content (F43: chat is the sole render surface) -->
    <main class="main-grid">
      <ConfigPanel />
      <PromptsPanel />
      <ChatPanel panel-id="chat-panel-main" />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * GenicUI Playground root layout — 3-zone.
 *
 * Zones:
 * - Topbar: brand + connection status (global, persistent)
 * - Left:   ConfigPanel — connection config, registry, components count pill
 * - Center: PromptsPanel — persistent vertical list of registry example
 *           prompts (clickable rows; each row fills the chat input and
 *           submits, mirroring the empty-state chip flow but always
 *           visible throughout the session)
 * - Right:  ChatPanel — chat history + input bar + all rendered components
 *           (chat is the sole render surface; components mount inside
 *           tool-call accordions and stay interactive across turns)
 *
 * F43 dropped the third center column (the old `RenderSurface`): the
 * chat panel already renders every `render_component` tool call as an
 * interactive accordion, so duplicating them in a center column was
 * noise. The PromptsPanel replaces the old center column with quick
 * access to the registry's example prompts so users can fire one of
 * them even mid-conversation. The sidebar keeps a count pill for
 * at-a-glance awareness of how many components are mounted in the chat.
 */
import { computed, onBeforeUnmount } from 'vue';
import { useWebSocket } from '~/composables/useWebSocket.ts';
import { useComponents } from '~/composables/useComponents.ts';
import { useChat } from '~/composables/useChat.ts';

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

// Subscribe the chat composable to WS frames so the chat panel reacts
// to streamed `chat.event` chunks (assistant prose + tool calls),
// `chat.response` (legacy echo path), `chat.complete`, and `chat.error`.
//
// This is the load-bearing fix from the F43 follow-up: without this
// subscription the chat panel only ever displayed the optimistic pending
// state — every free-text prompt sent by the new ChatInput bar and
// every chip click would be invisible.
//
// We filter on `frame.channel === '__chat__'` because the multiplexer
// broadcasts every frame to every subscriber; each consumer must pick
// out its own channel.
const chat = useChat();
const unsubscribeChat = ws.onMessage((frame) => {
  if (frame.channel !== '__chat__') return;
  switch (frame.type) {
    case 'chat.response':
      chat.handleResponse(frame);
      break;
    case 'chat.event':
      chat.handleEvent(frame);
      break;
    case 'chat.complete':
      chat.handleComplete(frame);
      break;
    case 'chat.error':
      chat.handleError(frame);
      break;
    default:
      // ignore — only chat-channel frame types above are routed here.
      break;
  }
});
onBeforeUnmount(() => unsubscribeChat());

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
