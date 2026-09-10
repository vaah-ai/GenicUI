<template>
  <div class="empty-state">
    <div class="empty-state-content">
      <!-- Icon -->
      <div class="empty-state-icon">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      <h3>Connect to GenicUI Server</h3>
      <p>
        Start the GenicUI server and connect from the config panel to render
        components here in real time.
      </p>
      <code class="empty-state-code">
        ws://localhost:3041/ws
      </code>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Empty state placeholder shown when no components are rendered.
 * Displays a connection prompt with the default server address.
 */
</script>
