// @ts-nocheck — test files use dynamic assertions on parsed JSON
/**
 * Tests for the F47 click-kill suppression flow.
 *
 * When a user clicks a chat-embedded component (e.g. Show Weather
 * on the CityPicker), the server deliberately kills the in-flight
 * subprocess so it can spawn a follow-up turn that resumes the
 * same Claude session with a synthesized prompt describing the click.
 *
 * The kill produces a non-zero subprocess exit code, which used to
 * surface as a `chat.error` followed by `chat.complete(reason='error')`.
 * That turned the FIRST assistant turn — which successfully rendered
 * the CityPicker — into a red error banner the moment the user
 * clicked anything. The fix: `killActiveSubprocess` now marks the
 * kill with `killByClick=true`, and `runChatTurn` consults
 * `consumeClickKill()` at exit to suppress the error chatter when
 * the kill was deliberate.
 *
 * These tests pin down the registry's `killByClick` round-trip
 * semantics — pure unit tests, no real subprocess — so the
 * substitution rule has explicit coverage.
 *
 * @see {F47} — Component-event interactivity (M5-T7)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import {
  consumeClickKill,
  killActiveSubprocess,
  __test_setClickKill,
  __resetChatSessions,
  createChatSession,
} from '../chat-session-registry.ts';

describe('F47 click-kill suppression (chat-session-registry)', () => {
  beforeEach(() => {
    __resetChatSessions();
    createChatSession('sess-click-1');
  });

  afterEach(() => {
    __resetChatSessions();
  });

  it('consumeClickKill returns false when no kill happened', () => {
    expect(consumeClickKill('sess-click-1')).toBe(false);
  });

  it('consumeClickKill returns true after the marker is set', () => {
    __test_setClickKill('sess-click-1', true);
    expect(consumeClickKill('sess-click-1')).toBe(true);
  });

  it('consumeClickKill is one-shot — second call returns false', () => {
    __test_setClickKill('sess-click-1', true);
    expect(consumeClickKill('sess-click-1')).toBe(true);
    expect(consumeClickKill('sess-click-1')).toBe(false);
  });

  it('returns false for an unknown session id', () => {
    expect(consumeClickKill('does-not-exist')).toBe(false);
  });

  it('killActiveSubprocess with no active proc leaves the marker unset', async () => {
    // No active subprocess → killActiveSubprocess is a no-op. The
    // marker should NOT be set, because nothing was actually killed.
    // This guards against the corner case where a click races with
    // a turn that already finished.
    const killed = await killActiveSubprocess('sess-click-1');
    expect(killed).toBe(false);
    expect(consumeClickKill('sess-click-1')).toBe(false);
  });

  it('after a click-kill is consumed, a subsequent real failure still surfaces', () => {
    // Simulate the lifecycle: click-kill → runChatTurn suppresses →
    // NEXT turn genuinely fails → consumeClickKill returns false so
    // chat.error is sent. This is the round-trip the bug originally
    // broke: clicking once should not poison later real failures.
    __test_setClickKill('sess-click-1', true);
    expect(consumeClickKill('sess-click-1')).toBe(true);
    // Marker is now cleared; a fresh failure would NOT be suppressed.
    __test_setClickKill('sess-click-1', false);
    expect(consumeClickKill('sess-click-1')).toBe(false);
  });
});
