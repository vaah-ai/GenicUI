import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for GenicUI E2E tests.
 *
 * The PoC server runs on two ports:
 *   - WebSocket bridge: ws://localhost:9876  (GENICUI_BRIDGE_PORT)
 *   - HTTP chat backend: http://localhost:9877  (GENICUI_HTTP_PORT)
 *
 * Start the server before running tests:
 *   bun run poc
 *
 * Or use the globalSetup to start it automatically.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    // Chat surface is served on port 8080 (python3 -m http.server)
    // Chat backend (MCP server) is on port 9877
    baseURL: `http://localhost:${process.env.GENICUI_WEB_PORT || 8080}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Global setup: start the PoC server before any tests run.
  globalSetup: './e2e/global-setup.mjs',
  globalTeardown: './e2e/global-teardown.mjs',
});
