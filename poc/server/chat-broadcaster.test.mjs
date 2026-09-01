// Chat broadcaster — unit tests for session management, push, subscribe, close.
// Run with: bun test poc/server/chat-broadcaster.test.mjs

import { describe, it, expect, beforeEach } from 'bun:test';
import { ChatBroadcaster } from './chat-broadcaster.mjs';

describe('ChatBroadcaster', () => {
  let bc;

  beforeEach(() => {
    bc = new ChatBroadcaster();
  });

  describe('create', () => {
    it('creates a new session', () => {
      const s = bc.create('s1');
      expect(bc.has('s1')).toBe(true);
      expect(s.events).toEqual([]);
      expect(s.closed).toBe(false);
    });

    it('is idempotent — returns existing session', () => {
      const s1 = bc.create('s1');
      const s2 = bc.create('s1');
      expect(s1).toBe(s2);
    });
  });

  describe('push', () => {
    it('emits event to subscribers', async () => {
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.push('s1', { type: 'ai_text', data: { text: 'hello' } });

      expect(events).toEqual([{ type: 'ai_text', data: { text: 'hello' } }]);
      unsub();
    });

    it('does not push to non-existent session', () => {
      // Should not throw
      bc.push('nope', { type: 'x' });
    });

    it('still allows push after close (multi-turn model)', () => {
      // The broadcaster intentionally keeps the session push()-able after
      // close() for multi-turn chat — only 30s inactivity cleanup removes it.
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.close('s1');
      bc.push('s1', { type: 'ai_text', data: { text: 'after' } });

      // Terminal event + push event = 2
      expect(events.length).toBe(2);
      expect(events[1]?.type).toBe('ai_text');
      unsub();
    });
  });

  describe('subscribe', () => {
    it('throws for non-existent session', () => {
      expect(() => bc.subscribe('ghost', () => {})).toThrow(
        'No queue for session ghost'
      );
    });

    it('unsubscribe stops receiving events', () => {
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.push('s1', { type: 'a' });
      unsub();
      bc.push('s1', { type: 'b' });

      expect(events).toEqual([{ type: 'a' }]);
    });
  });

  describe('close', () => {
    it('emits a terminal event', () => {
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.close('s1');

      expect(events).toEqual([{ type: 'complete', reason: 'complete' }]);
      unsub();
    });

    it('close with custom reason', () => {
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.close('s1', 'error');

      expect(events).toEqual([{ type: 'error', reason: 'error' }]);
      unsub();
    });

    it('emits terminal event each time (session.closed never set — multi-turn)', () => {
      // The session.closed flag is never actually set to true by close().
      // The guard `if (session.closed) return` never fires, so each close()
      // emits a terminal event. This is the documented multi-turn model.
      bc.create('s1');
      const events = [];
      const unsub = bc.subscribe('s1', (e) => events.push(e));

      bc.close('s1');
      bc.close('s1');
      bc.close('s1');

      expect(events.length).toBe(3);
      for (const e of events) {
        expect(e.type).toBe('complete');
      }
      unsub();
    });

    it('does nothing for non-existent session', () => {
      // Should not throw
      bc.close('ghost');
    });
  });

  describe('rememberClaudeSession / getClaudeSession', () => {
    it('stores and retrieves claude session id', () => {
      bc.create('s1');
      bc.rememberClaudeSession('s1', 'claude-abc');
      expect(bc.getClaudeSession('s1')).toBe('claude-abc');
    });

    it('ignores null/undefined claudeSessionId', () => {
      bc.create('s1');
      bc.rememberClaudeSession('s1', null);
      bc.rememberClaudeSession('s1', undefined);
      expect(bc.getClaudeSession('s1')).toBeUndefined();
    });
  });

  describe('isTerminal', () => {
    it('returns true for complete', () => {
      expect(bc.isTerminal({ type: 'complete' })).toBe(true);
    });

    it('returns true for cancelled', () => {
      expect(bc.isTerminal({ type: 'cancelled' })).toBe(true);
    });

    it('returns true for error', () => {
      expect(bc.isTerminal({ type: 'error' })).toBe(true);
    });

    it('returns false for non-terminal', () => {
      expect(bc.isTerminal({ type: 'ai_text' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(bc.isTerminal(null)).toBe(false);
    });
  });
});
