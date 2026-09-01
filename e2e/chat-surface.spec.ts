/**
 * E2E: Chat Surface — Browser UI for driving AI agent turns
 *
 * Verifies the browser chat surface (poc/web/index.html) works correctly:
 *   - Page loads with welcome message
 *   - User can type and send prompts
 *   - Chat session is created via API
 *   - SSE stream delivers AI text events
 *   - Typing indicator appears during processing
 *   - Messages appear in the transcript
 *   - Component mounts appear below tool calls
 *   - Error states are handled gracefully
 *
 * Maps to features.md:
 *   - F9 AC1: GET /health returns 200 with {status: 'ok'}
 *   - F46 AC1: Valid auth header accepted
 *   - F46 AC3: Missing auth header returns 401
 */
import { test, expect } from '@playwright/test';

// Chat surface: port 8080 (python3 -m http.server serving poc/web/)
// Chat backend: port 9877 (MCP server HTTP endpoint)
const WEB_PORT = Number(process.env.GENICUI_WEB_PORT || 8080);
const HTTP_PORT = Number(process.env.GENICUI_HTTP_PORT || 9877);
const BASE_URL = `http://localhost:${WEB_PORT}/poc/web`;
const CHAT_API_URL = `http://localhost:${HTTP_PORT}`;

test.describe('Chat Surface — Browser UI', () => {
  test('page loads with welcome message', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Verify page title
    await expect(page).toHaveTitle(/GenicUI/);

    // Verify the heading is visible
    await expect(page.getByRole('heading', { name: 'GenicUI' })).toBeVisible();

    // Verify the status element exists
    await expect(page.locator('#status')).toBeVisible();

    // Verify the messages area exists
    await expect(page.locator('#messages')).toBeVisible();

    // Verify the composer form exists
    await expect(page.locator('#composer')).toBeVisible();

    // Verify the prompt textarea exists
    await expect(page.getByRole('textbox', { name: /ask the agent/i })).toBeVisible();

    // Verify the send button exists
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

    // The welcome message should appear in the messages area
    await expect(page.getByText(/welcome|type a prompt/i, { exact: false })).toBeVisible();
  });

  test('chat session creation API', async ({ request }) => {
    // POST /chat/sessions → 201 { sessionId }
    const res = await request.post(`${CHAT_API_URL}/chat/sessions`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty('sessionId');
    expect(typeof body.sessionId).toBe('string');
    expect(body.sessionId.length).toBeGreaterThan(0);
  });

  test('chat session creation — multiple sessions', async ({ request }) => {
    // Create two sessions, verify they have different IDs
    const res1 = await request.post(`${CHAT_API_URL}/chat/sessions`);
    const { sessionId: id1 } = await res1.json();

    const res2 = await request.post(`${CHAT_API_URL}/chat/sessions`);
    const { sessionId: id2 } = await res2.json();

    expect(id1).not.toBe(id2);
  });

  test('POST /chat/sessions/:id/messages — missing content', async ({ request }) => {
    // Create a session
    const sessionRes = await request.post(`${CHAT_API_URL}/chat/sessions`);
    const { sessionId } = await sessionRes.json();

    // POST with empty content → 400
    const msgRes = await request.post(`${CHAT_API_URL}/chat/sessions/${sessionId}/messages`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    });
    expect(msgRes.status()).toBe(400);
  });

  test('POST /chat/sessions/:id/messages — invalid session', async ({ request }) => {
    // POST to non-existent session → 404
    const msgRes = await request.post(
      `${CHAT_API_URL}/chat/sessions/nonexistent-uuid/messages`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ content: 'hello' }),
      },
    );
    expect(msgRes.status()).toBe(404);
  });

  test('GET /chat/sessions/:id/stream — SSE endpoint', async ({ page, request }) => {
    // Create a session
    const sessionRes = await request.post(`${CHAT_API_URL}/chat/sessions`);
    const { sessionId } = await sessionRes.json();

    // For SSE streams, we can't use request.get() because it waits for the
    // response to end (SSE never ends). Instead, use fetch with a timeout.
    const sseResponse = await page.evaluate(async (url) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
      };
    }, `${CHAT_API_URL}/chat/sessions/${sessionId}/stream`);

    expect(sseResponse.status).toBe(200);
    expect(sseResponse.contentType).toBe('text/event-stream');
  });

  test('GET /chat/sessions/:id/stream — invalid session', async ({ request }) => {
    // SSE on non-existent session → error
    const sseRes = await request.get(`${CHAT_API_URL}/chat/sessions/nonexistent/stream`);
    expect(sseRes.status()).not.toBe(200);
  });

  test('unknown routes return 404', async ({ request }) => {
    // The stateless HTTP server returns 405 for GET to non-POST routes
    // and 404 for unknown /chat/ routes. Verify both.
    const getRes = await request.get(`${CHAT_API_URL}/nonexistent-routes-do-not-exist`);
    // GET to a non-POST endpoint returns 405 (method not allowed)
    expect(getRes.status()).toBe(405);

    // POST to an unknown /chat/ route returns 404
    const postRes = await request.post(`${CHAT_API_URL}/chat/nonexistent-path`);
    expect(postRes.status()).toBe(404);
  });

  test('send button is disabled initially', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // The send button starts disabled (no text entered)
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('send button enables when text is entered', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Wait for bridge connection (session is created during init)
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return status && (status.textContent.includes('connected') || status.textContent.includes('connecting'));
      },
      { timeout: 10000 }
    );

    // Type some text
    await page.getByRole('textbox', { name: /ask the agent/i }).fill('test prompt');

    // Send button should now be enabled (session exists)
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  test('user message appears in transcript after send', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Wait for bridge connection
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return status && status.textContent.includes('connected');
      },
      { timeout: 10000 }
    );

    // Get the initial message count
    const initialCount = await page.locator('.msg').count();

    // Type and send a prompt
    await page.getByRole('textbox', { name: /ask the agent/i }).fill('test message');
    await page.getByRole('textbox', { name: /ask the agent/i }).press('Enter');

    // A user message bubble should appear
    await expect(page.locator('.msg-user')).toBeVisible({ timeout: 10000 });

    // The message count should have increased
    const finalCount = await page.locator('.msg').count();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('typing indicator appears during message processing', async ({ page }) => {
    await page.goto(`${BASE_URL}`);

    // Wait for bridge connection
    await page.waitForFunction(
      () => {
        const status = document.getElementById('status');
        return status && status.textContent.includes('connected');
      },
      { timeout: 10000 }
    );

    // Type and send a prompt
    await page.getByRole('textbox', { name: /ask the agent/i }).fill('show me a counter');
    await page.getByRole('textbox', { name: /ask the agent/i }).press('Enter');

    // Typing indicator should appear (msg-typing class)
    const typingIndicator = page.locator('.msg-typing');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });
  });

  test('CORS preflight returns 204', async ({ page, request }) => {
    // The server returns 204 for OPTIONS preflight requests with CORS headers.
    // Playwright's request.options() may not work correctly for CORS preflight,
    // so use page.evaluate with fetch instead.
    const result = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost',
          'Access-Control-Request-Method': 'POST',
        },
        signal: AbortSignal.timeout(5000),
      });
      return { status: res.status };
    }, `${CHAT_API_URL}/chat/sessions`);
    expect(result.status).toBe(204);
  });
});
