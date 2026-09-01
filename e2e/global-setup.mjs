/**
 * Global setup for Playwright E2E tests.
 * Checks if the GenicUI PoC server is already running; if not, starts it.
 *
 * Ports:
 *   - Web chat surface:    8080  (python3 -m http.server serving poc/web/)
 *   - WebSocket bridge:    9876  (GENICUI_BRIDGE_PORT)
 *   - HTTP server:         9877  (GENICUI_HTTP_PORT)
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const WEB_PORT = Number(process.env.GENICUI_WEB_PORT || 8080);
const HTTP_PORT = Number(process.env.GENICUI_HTTP_PORT || 9877);

export default async function globalSetup() {
  // Check if both services are already running
  try {
    const [webRes, apiRes] = await Promise.all([
      fetch(`http://localhost:${WEB_PORT}/poc/web/`, { timeout: 2000 }).catch(() => null),
      fetch(`http://localhost:${HTTP_PORT}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(2000),
      }).catch(() => null),
    ]);

    if (webRes?.ok && (apiRes?.ok || apiRes?.status === 201)) {
      console.log(`[global-setup] GenicUI services already running on ports ${WEB_PORT} and ${HTTP_PORT}, skipping start`);
      return;
    }
  } catch {
    // Services not running, that's expected
  }

  console.log(`[global-setup] Starting GenicUI PoC services...`);
  console.log(`[global-setup]   Web surface: http://localhost:${WEB_PORT}/poc/web/`);
  console.log(`[global-setup]   API server:  http://localhost:${HTTP_PORT}`);

  const env = {
    ...process.env,
    GENICUI_WEB_PORT: String(WEB_PORT),
    GENICUI_BRIDGE_PORT: process.env.GENICUI_BRIDGE_PORT || '9876',
    GENICUI_HTTP_PORT: String(HTTP_PORT),
    GENICUI_TRANSPORT: 'http',
  };

  // Start the static web server (python3 -m http.server)
  const webServer = spawn('python3', ['-m', 'http.server', String(WEB_PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  webServer.stdout.on('data', (data) => console.log(`[web] ${data.toString().trim()}`));
  webServer.stderr.on('data', (data) => console.error(`[web err] ${data.toString().trim()}`));

  // Start the MCP server
  const mcpServer = spawn('node', [resolve(__dirname, '../poc/server/index.mjs')], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  mcpServer.stdout.on('data', (data) => console.log(`[mcp] ${data.toString().trim()}`));
  mcpServer.stderr.on('data', (data) => console.error(`[mcp err] ${data.toString().trim()}`));

  // Store PIDs for teardown
  writeFileSync(resolve(__dirname, '.server.pids'), `${String(webServer.pid)}\n${String(mcpServer.pid)}`);

  // Wait for both servers to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out after 15s')), 15000);

    let webReady = false;
    let apiReady = false;

    const poll = async () => {
      if (!webReady) {
        try {
          const res = await fetch(`http://localhost:${WEB_PORT}/poc/web/`, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            webReady = true;
            console.log('[global-setup] Web server ready');
          }
        } catch { /* keep polling */ }
      }

      if (!apiReady) {
        try {
          const res = await fetch(`http://localhost:${HTTP_PORT}/chat/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(2000),
          });
          if (res.ok || res.status === 201) {
            apiReady = true;
            console.log('[global-setup] MCP server ready');
          }
        } catch { /* keep polling */ }
      }

      if (webReady && apiReady) {
        clearTimeout(timeout);
        resolve();
      }
    };

    const pollInterval = setInterval(async () => {
      await poll();
      if (webReady && apiReady) {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        resolve();
      }
    }, 500);
  });

  console.log('[global-setup] All GenicUI services ready');
}
