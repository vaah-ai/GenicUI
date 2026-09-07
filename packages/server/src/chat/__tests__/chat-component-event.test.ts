// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for the `chat.component_event` server-side handler.
 *
 * Covers F43 AC3/AC5/AC6:
 *   - Click → `chat.component_event` frame → `user_event` synthetic bubble
 *     broadcast BEFORE the follow-up turn spawns.
 *   - Missing Claude session id rejected gracefully with `chat.error`.
 *   - Active subprocess killed before the follow-up turn starts.
 *   - Synthesized prompt includes componentId, name, action, payload.
 *
 * The full `handleChatComponentEvent` spawns a real Claude subprocess
 * via `runChatTurn`, which would leak Claude CLI runs into unit tests.
 * Instead we test:
 *   - the pure `__test_buildFollowUpContext` + `__test_buildUserEventData`
 *     helpers (synchronous, no I/O), and
 *   - the validation branches of `handleChatComponentEvent` that bail
 *     BEFORE `runChatTurn` runs (those don't spawn anything).
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import {
  handleChatComponentEvent,
  __test_buildFollowUpContext,
  __test_buildUserEventData,
} from '../chat-handler.ts';
import type { WsSession } from '../../transport/types.ts';
import {
  createChatSession,
  rememberClaudeSession,
  setChatResumeContext,
  setActiveSubprocess,
  __resetChatSessions,
} from '../chat-session-registry.ts';

/**
 * Mock Elysia WebSocket for testing.
 */
class MockElysiaWs {
  sentMessages: string[] = [];

  send(data: string | Buffer): void {
    this.sentMessages.push(typeof data === 'string' ? data : data.toString());
  }

  ping(): void {}

  close(): void {}
}

/**
 * Recording channel multiplexer — captures dispatched frames so the
 * tests can assert on the COMPONENT_MOUNTED bridge path if needed.
 */
class RecordingMultiplexer {
  frames: unknown[] = [];
  destroy(): void {}
  dispatch(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }
  dispatchServerFrame(frame: { type?: string }): { channel: string; frames: unknown[] } | null {
    this.frames.push(frame);
    return { channel: (frame as { channel?: string }).channel ?? '', frames: [frame] };
  }
  registerChannel(): null { return null; }
  hasChannel(): boolean { return true; }
  getChannels(): string[] { return []; }
  get channelCount(): number { return 0; }
}

/**
 * Create a mock WsSession for testing.
 */
function createMockSession(sessionId: string = 'test-session-event'): WsSession & { ws: MockElysiaWs } {
  const mockWs = new MockElysiaWs();
  return {
    sessionId,
    elysiaWs: mockWs as never,
    heartbeatInterval: null,
    pongTimeout: null,
    missedPongs: 0,
    destroyed: false,
    multiplexer: new RecordingMultiplexer() as never,
    seqGenerator: { next: () => 1 } as never,
    eventBus: {
      emit: () => {},
      subscribe: () => () => {},
      dispose: () => {},
    } as never,
    recoveryBuffer: {
      add: () => {},
      get: () => [],
      size: 0,
      clear: () => {},
      lastEventId: null,
    } as never,
    ws: mockWs,
  };
}

function firstFrameOfType(ws: MockElysiaWs, type: string): Record<string, unknown> | undefined {
  for (const raw of ws.sentMessages) {
    const frame = JSON.parse(raw) as Record<string, unknown>;
    if (frame['type'] === type) return frame;
  }
  return undefined;
}

function totalFrameCount(ws: MockElysiaWs): number {
  return ws.sentMessages.length;
}

describe('handleChatComponentEvent', () => {
  beforeEach(() => {
    __resetChatSessions();
  });

  afterEach(() => {
    __resetChatSessions();
  });

  describe('validation (synchronous bail paths)', () => {
    it('rejects payload missing componentId with chat.error', async () => {
      const session = createMockSession();
      await handleChatComponentEvent(session, { action: 'submit' });

      const errorFrame = firstFrameOfType(session.ws, 'chat.error');
      expect(errorFrame).toBeDefined();
      const payload = errorFrame!['payload'] as Record<string, unknown>;
      expect(payload['error']).toContain('componentId');
      expect(totalFrameCount(session.ws)).toBe(1);
    });

    it('rejects payload missing action with chat.error', async () => {
      const session = createMockSession();
      createChatSession(session.sessionId);
      rememberClaudeSession(session.sessionId, 'sess-real');

      await handleChatComponentEvent(session, { componentId: 'cp-1' });

      const errorFrame = firstFrameOfType(session.ws, 'chat.error');
      expect(errorFrame).toBeDefined();
      const payload = errorFrame!['payload'] as Record<string, unknown>;
      expect(payload['error']).toContain('action');
      expect(totalFrameCount(session.ws)).toBe(1);
    });

    it('rejects empty action string with chat.error', async () => {
      const session = createMockSession();
      createChatSession(session.sessionId);
      rememberClaudeSession(session.sessionId, 'sess-real');

      await handleChatComponentEvent(session, {
        componentId: 'cp-1',
        action: '',
      });

      const errorFrame = firstFrameOfType(session.ws, 'chat.error');
      expect(errorFrame).toBeDefined();
    });

    it('tolerates a non-object payload by treating it as empty', async () => {
      const session = createMockSession();
      // `null` payload must NOT crash — should be normalized to an
      // empty object and then fail validation cleanly.
      await handleChatComponentEvent(session, null as never);

      const errorFrame = firstFrameOfType(session.ws, 'chat.error');
      expect(errorFrame).toBeDefined();
    });
  });

  describe('missing Claude session (synchronous bail path)', () => {
    it('emits chat.error when no Claude session is registered', async () => {
      const session = createMockSession();
      // Chat session entry exists, but no Claude session id has been
      // captured yet (e.g. user clicked before any agent turn landed).
      createChatSession(session.sessionId);

      await handleChatComponentEvent(session, {
        componentId: 'cp-1',
        name: 'InputPair',
        action: 'submit',
        payload: { input1: 5, input2: 3 },
      });

      const errorFrame = firstFrameOfType(session.ws, 'chat.error');
      expect(errorFrame).toBeDefined();
      const payload = errorFrame!['payload'] as Record<string, unknown>;
      expect(payload['error']).toContain('No active Claude session');
    });

    it('does not broadcast a user_event when Claude session is missing', async () => {
      const session = createMockSession();
      createChatSession(session.sessionId);

      await handleChatComponentEvent(session, {
        componentId: 'cp-1',
        action: 'submit',
      });

      // The only frame should be chat.error.
      const userEvents = session.ws.sentMessages.filter((raw) => {
        const f = JSON.parse(raw) as Record<string, unknown>;
        if (f['type'] !== 'chat.event') return false;
        const p = f['payload'] as Record<string, unknown> | undefined;
        const ev = p?.['event'] as Record<string, unknown> | undefined;
        return ev?.['type'] === 'user_event';
      });
      expect(userEvents).toHaveLength(0);
    });
  });

  describe('error ordering', () => {
    it('emits exactly one chat.error frame on validation failure', async () => {
      const session = createMockSession();
      createChatSession(session.sessionId);
      rememberClaudeSession(session.sessionId, 'sess-real');

      await handleChatComponentEvent(session, { componentId: 'cp-1' });

      const errorFrames = session.ws.sentMessages.filter((raw) => {
        const f = JSON.parse(raw) as Record<string, unknown>;
        return f['type'] === 'chat.error';
      });
      expect(errorFrames).toHaveLength(1);
    });

    it('does not emit user_event on validation failure', async () => {
      const session = createMockSession();
      createChatSession(session.sessionId);
      rememberClaudeSession(session.sessionId, 'sess-real');

      await handleChatComponentEvent(session, { componentId: 'cp-1' });

      const userEvents = session.ws.sentMessages.filter((raw) => {
        const f = JSON.parse(raw) as Record<string, unknown>;
        if (f['type'] !== 'chat.event') return false;
        const p = f['payload'] as Record<string, unknown> | undefined;
        const ev = p?.['event'] as Record<string, unknown> | undefined;
        return ev?.['type'] === 'user_event';
      });
      expect(userEvents).toHaveLength(0);
    });
  });
});

describe('__test_buildUserEventData', () => {
  it('includes all four fields when present', () => {
    const data = __test_buildUserEventData(
      'cp-1',
      'InputPair',
      'submit',
      { input1: 5, input2: 3 },
    );
    expect(data['componentId']).toBe('cp-1');
    expect(data['name']).toBe('InputPair');
    expect(data['action']).toBe('submit');
    expect(data['payload']).toEqual({ input1: 5, input2: 3 });
  });

  it('omits name field when client did not supply one', () => {
    const data = __test_buildUserEventData('cp-2', undefined, 'tap', undefined);
    expect(data['componentId']).toBe('cp-2');
    expect(data['action']).toBe('tap');
    expect('name' in data).toBe(false);
    expect('payload' in data).toBe(false);
  });

  it('omits payload field when client did not supply one', () => {
    const data = __test_buildUserEventData('cp-3', 'ResultCard', 'show', undefined);
    expect(data['componentId']).toBe('cp-3');
    expect(data['name']).toBe('ResultCard');
    expect(data['action']).toBe('show');
    expect('payload' in data).toBe(false);
  });

  it('keeps empty payload object as an empty object', () => {
    const data = __test_buildUserEventData('cp-4', 'X', 'click', {});
    expect(data['payload']).toEqual({});
  });
});

describe('__test_buildFollowUpContext', () => {
  it('returns a follow-up ChatMessage mirroring the resume context', () => {
    const ctx = {
      providerId: 'claude-code',
      provider: { id: 'claude-code', config: { cliPath: '/usr/bin/claude' } },
      registry: 'primevue',
      lastUserPrompt: 'give me a calculator',
    };
    const out = __test_buildFollowUpContext(ctx, 'cp-1', 'InputPair', 'submit', {
      input1: 7,
      input2: 9,
    });
    expect(out.followUp.prompt).toBe('give me a calculator');
    expect(out.followUp.registry).toBe('primevue');
    expect(out.followUp.provider).toEqual(ctx.provider);
  });

  it('synthesizes a prompt that names the component and action', () => {
    const out = __test_buildFollowUpContext(
      {
        providerId: 'claude-code',
        provider: { id: 'claude-code', config: {} },
        registry: undefined,
        lastUserPrompt: 'hi',
      },
      'cp-x',
      'InputPair',
      'submit',
      { input1: 5, input2: 3 },
    );
    expect(out.synthesizedPrompt).toContain('[component_event]');
    expect(out.synthesizedPrompt).toContain('"submit"');
    expect(out.synthesizedPrompt).toContain('InputPair');
    expect(out.synthesizedPrompt).toContain('cp-x');
    expect(out.synthesizedPrompt).toContain('"input1":5');
    expect(out.synthesizedPrompt).toContain('"input2":3');
  });

  it('uses "(unnamed)" when name is missing', () => {
    const out = __test_buildFollowUpContext(
      {
        providerId: 'claude-code',
        provider: { id: 'claude-code', config: {} },
        registry: undefined,
        lastUserPrompt: 'hi',
      },
      'cp-x',
      undefined,
      'tap',
      undefined,
    );
    expect(out.synthesizedPrompt).toContain('(unnamed)');
    expect(out.synthesizedPrompt).toContain('"tap"');
    expect(out.synthesizedPrompt).toContain('{}');
  });

  it('escapes quotes correctly in payload JSON', () => {
    const out = __test_buildFollowUpContext(
      {
        providerId: 'claude-code',
        provider: { id: 'claude-code', config: {} },
        registry: undefined,
        lastUserPrompt: 'hi',
      },
      'cp-x',
      'X',
      'click',
      { label: 'a "b" c' },
    );
    // The synthesized prompt embeds `JSON.stringify(detail)` after
    // the literal text "with payload ". Extract just the JSON object
    // (everything from "{" to the matching closing "}") and round-
    // trip it back through JSON.parse to confirm the payload
    // survives the prompt stringification without truncation.
    const idx = out.synthesizedPrompt.indexOf('with payload ');
    expect(idx).toBeGreaterThanOrEqual(0);
    const tail = out.synthesizedPrompt.slice(idx + 'with payload '.length);
    // Find the first top-level { ... } (no nesting for simple
    // payloads, but tolerate future nesting by scanning for the
    // matching brace).
    const openIdx = tail.indexOf('{');
    expect(openIdx).toBeGreaterThanOrEqual(0);
    let depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < tail.length; i++) {
      if (tail[i] === '{') depth++;
      else if (tail[i] === '}') {
        depth--;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    expect(closeIdx).toBeGreaterThan(openIdx);
    const jsonPart = tail.slice(openIdx, closeIdx + 1);
    expect(JSON.parse(jsonPart)).toEqual({ label: 'a "b" c' });
  });
});

describe('handleChatComponentEvent / killActiveSubprocess interaction', () => {
  beforeEach(() => {
    __resetChatSessions();
  });
  afterEach(() => {
    __resetChatSessions();
  });

  it('kills the active subprocess before checking resume context', async () => {
    // We can't safely spawn a real Claude subprocess in unit tests,
    // so we verify that the kill step runs (synchronously, before
    // runChatTurn) by pre-staging a fake subprocess and asserting
    // it gets cleared. The follow-up turn will throw because no
    // real binary exists; we swallow that and assert only the kill.
    const session = createMockSession('sess-with-proc');
    createChatSession(session.sessionId);
    rememberClaudeSession(session.sessionId, 'sess-real');

    let killed = false;
    const fakeProc = {
      kill: () => { killed = true; },
      exited: Promise.resolve(0),
    } as never;
    setActiveSubprocess(session.sessionId, fakeProc);

    setChatResumeContext(session.sessionId, {
      providerId: 'claude-code',
      provider: { id: 'claude-code', config: {} },
      registry: undefined,
      lastUserPrompt: 'hi',
    });

    await handleChatComponentEvent(session, {
      componentId: 'cp-1',
      name: 'InputPair',
      action: 'submit',
    }).catch(() => undefined);

    // The fake proc's `kill` MUST have been called before
    // runChatTurn (which would have spawned a real Claude).
    expect(killed).toBe(true);
  });

  it('still emits user_event when no subprocess is active but resume context is missing', async () => {
    // Order of operations in handleChatComponentEvent:
    //   1. killActiveSubprocess   (no-op if none)
    //   2. sendChatUserEvent      (fires regardless)
    //   3. getChatResumeContext   (bail with chat.error if null)
    //
    // This test verifies step 2 happens BEFORE step 3 — even when
    // no subprocess was killed, the synthetic user bubble is sent
    // before the resume-context bail fires chat.error.
    const session = createMockSession();
    createChatSession(session.sessionId);
    rememberClaudeSession(session.sessionId, 'sess-real');
    // Intentionally do NOT seed resume context — handler bails at
    // step 3. The user_event should already have been sent at step 2.

    await handleChatComponentEvent(session, {
      componentId: 'cp-1',
      name: 'InputPair',
      action: 'submit',
    });

    const errorFrame = firstFrameOfType(session.ws, 'chat.error');
    expect(errorFrame).toBeDefined();
    const errorPayload = errorFrame!['payload'] as Record<string, unknown>;
    expect(errorPayload['error']).toContain('chat session lost between turns');

    const userEvents = session.ws.sentMessages.filter((raw) => {
      const f = JSON.parse(raw) as Record<string, unknown>;
      if (f['type'] !== 'chat.event') return false;
      const p = f['payload'] as Record<string, unknown> | undefined;
      const ev = p?.['event'] as Record<string, unknown> | undefined;
      return ev?.['type'] === 'user_event';
    });
    expect(userEvents).toHaveLength(1);
    const raw = userEvents[0]!;
    const frame = JSON.parse(raw) as Record<string, unknown>;
    const payload = frame['payload'] as Record<string, unknown>;
    const ev = payload['event'] as Record<string, unknown>;
    expect(ev['type']).toBe('user_event');
    const evData2 = ev['data'] as Record<string, unknown>;
    expect(evData2['componentId']).toBe('cp-1');
    expect(evData2['action']).toBe('submit');
  });
});

describe('chat-component-event module surface', () => {
  it('exports handleChatComponentEvent as a function', () => {
    expect(typeof handleChatComponentEvent).toBe('function');
  });

  it('exports __test_buildFollowUpContext as a function', () => {
    expect(typeof __test_buildFollowUpContext).toBe('function');
  });

  it('exports __test_buildUserEventData as a function', () => {
    expect(typeof __test_buildUserEventData).toBe('function');
  });
});
