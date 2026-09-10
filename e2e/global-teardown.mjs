/**
 * Global teardown for Playwright E2E tests.
 * Kills the GenicUI processes started in global setup.
 */
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  try {
    const pidFile = resolve(__dirname, '.server.pids');
    if (!existsSync(pidFile)) {
      console.log('[global-teardown] No server PID file found');
      return;
    }

    const pids = readFileSync(pidFile, 'utf8').trim().split('\n').filter(Boolean);
    unlinkSync(pidFile);

    for (const pid of pids) {
      const num = Number(pid);
      if (num && !Number.isNaN(num)) {
        try {
          process.kill(num, 'SIGTERM');
        } catch {
          // Already exited
        }
      }
    }

    // Give a moment to exit gracefully
    await new Promise((r) => setTimeout(r, 2000));

    for (const pid of pids) {
      const num = Number(pid);
      if (num && !Number.isNaN(num)) {
        try {
          process.kill(num, 'SIGKILL');
        } catch {
          // Already dead
        }
      }
    }

    console.log('[global-teardown] GenicUI server processes stopped');
  } catch {
    console.log('[global-teardown] Error during teardown');
  }
}
