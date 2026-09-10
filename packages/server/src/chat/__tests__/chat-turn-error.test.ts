/**
 * Tests for the F47 follow-up: distinguishing genuine stream-level
 * errors from a non-zero subprocess exit after successful content
 * delivery.
 *
 * Background: Claude Code's compact-mode `result` envelope signals
 * success, but the subprocess can still return a non-zero exit code
 * when the upstream MCP round-trip had a hiccup (e.g. tool result
 * serialization noise). When that happened, the server fired a
 * `chat.error` frame that the client painted as a red banner under
 * the assistant turn — even though the CityPicker rendered
 * successfully. The fix routes a `sawErrorEvent` flag through
 * `handleParsedLine` so the exit branch only fires `chat.error` when
 * a genuine `chat.event` with type=error landed during the turn.
 *
 * These tests exercise the line-handler flag via the
 * `__test_handleParsedLine` hook with a custom `onError` callback,
 * so the rule has explicit unit coverage independent of the
 * subprocess plumbing.
 *
 * @see {F47} — Component-event interactivity (M5-T7)
 */
import { describe, it, expect } from 'bun:test';

import { __test_handleParsedLine } from '../chat-handler.ts';

/**
 * Minimal WsSession stub — `__test_handleParsedLine` only needs a
 * shape that satisfies the `sendChatEvent` -> `session.elysiaWs.send`
 * chain. We never invoke `sendChatError`/`sendChatComplete` from
 * the line handler, so the stubs below only need to accept writes
 * without crashing.
 */
function makeSessionStub() {
  const sent: unknown[] = [];
  const session = {
    sessionId: 'sess-test',
    seqGenerator: { next: () => 1 },
    elysiaWs: {
      send: (frame: unknown) => {
        sent.push(frame);
      },
    },
    multiplexer: {
      dispatchServerFrame: () => ({
        frames: [] as unknown[],
      }),
    },
  };
  return { session, sent };
}

describe('F47 follow-up: runChatTurn error discrimination', () => {
  it('a stream-level error event flips onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    // Claude Code's stream-json error envelope shape.
    __test_handleParsedLine(
      session as never,
      JSON.stringify({ type: 'error', error: 'something blew up' }),
      'claude-code',
      onError,
    );

    expect(sawError).toBe(true);
  });

  it('a successful result envelope does NOT flip onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    // Claude Code's compact-mode result envelope — emitted on
    // successful turn completion.
    __test_handleParsedLine(
      session as never,
      JSON.stringify({
        type: 'result',
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
      'claude-code',
      onError,
    );

    expect(sawError).toBe(false);
  });

  it('an ai_text chunk does NOT flip onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    __test_handleParsedLine(
      session as never,
      JSON.stringify({ type: 'text', data: 'Hello world' }),
      'claude-code',
      onError,
    );

    expect(sawError).toBe(false);
  });

  it('a tool_call envelope does NOT flip onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    __test_handleParsedLine(
      session as never,
      JSON.stringify({
        type: 'tool_use',
        id: 'tu-1',
        name: 'render_component',
        input: { componentName: 'CityPicker' },
      }),
      'claude-code',
      onError,
    );

    expect(sawError).toBe(false);
  });

  it('omitting the onError callback is safe (no throw)', () => {
    const { session } = makeSessionStub();
    // The callback is optional — `__test_handleParsedLine` and the
    // production `runChatTurn` paths must tolerate missing callbacks
    // (some test harnesses + the legacy echo path don't pass one).
    expect(() =>
      __test_handleParsedLine(
        session as never,
        JSON.stringify({ type: 'error', error: 'boom' }),
        'claude-code',
      ),
    ).not.toThrow();
  });

  it('an error embedded in a system envelope flips onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    // Claude Code's compact-mode system envelopes carry a top-level
    // `error` field when something failed. The adaptor's
    // `parseSystemEvent` returns `{ type: 'error', data: { error } }`
    // in that case so the chat panel can surface it.
    __test_handleParsedLine(
      session as never,
      JSON.stringify({
        type: 'system',
        subtype: 'compact_boundary',
        error: 'compaction failed',
      }),
      'claude-code',
      onError,
    );

    expect(sawError).toBe(true);
  });

  it('non-JSON lines do NOT flip onError()', () => {
    const { session } = makeSessionStub();
    let sawError = false;
    const onError = () => {
      sawError = true;
    };

    // Non-JSON stdout — the parser wraps these as `chat.event`
    // type=stdout so the chat UI can still show them.
    __test_handleParsedLine(
      session as never,
      '[tools] loaded 3 tools',
      'claude-code',
      onError,
    );

    expect(sawError).toBe(false);
  });
});
