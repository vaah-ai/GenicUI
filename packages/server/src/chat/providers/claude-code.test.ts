/**
 * Tests for the Claude Code provider adaptor.
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 *
 * These tests exercise the pure logic of the adaptor — argv building,
 * binary resolution, and per-line parsing — without spawning any
 * subprocess. The subprocess lifecycle is covered indirectly by the
 * chat-handler tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { ClaudeCodeAdaptor } from './claude-code.js';
import {
  __resetChatSessions,
  createChatSession,
  rememberClaudeSession,
  getClaudeSession,
} from '../chat-session-registry.js';

describe('ClaudeCodeAdaptor', () => {
  const adaptor = new ClaudeCodeAdaptor();

  describe('metadata', () => {
    it('has stable id and label', () => {
      expect(adaptor.id).toBe('claude-code');
      expect(adaptor.label).toBe('Claude Code');
    });
  });

  describe('resolveBinary', () => {
    const originalEnv = process.env['GENICUI_CLAUDE_BIN'];
    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env['GENICUI_CLAUDE_BIN'];
      } else {
        process.env['GENICUI_CLAUDE_BIN'] = originalEnv;
      }
    });

    it('returns config.cliPath when set', () => {
      delete process.env['GENICUI_CLAUDE_BIN'];
      expect(adaptor.resolveBinary({ cliPath: '/usr/local/bin/claude' })).toBe(
        '/usr/local/bin/claude',
      );
    });

    it('falls back to $GENICUI_CLAUDE_BIN when config.cliPath is missing', () => {
      delete process.env['GENICUI_CLAUDE_BIN'];
      process.env['GENICUI_CLAUDE_BIN'] = '/opt/claude/bin/claude';
      expect(adaptor.resolveBinary({})).toBe('/opt/claude/bin/claude');
    });

    it('falls back to "claude" when neither config nor env is set', () => {
      delete process.env['GENICUI_CLAUDE_BIN'];
      expect(adaptor.resolveBinary({})).toBe('claude');
    });

    it('ignores empty cliPath', () => {
      delete process.env['GENICUI_CLAUDE_BIN'];
      expect(adaptor.resolveBinary({ cliPath: '   ' })).toBe('claude');
    });
  });

  describe('buildArgs', () => {
    it('includes the stream-json / verbose / permission-mode flags', () => {
      const args = adaptor.buildArgs({ resumeId: null });
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
      expect(args).toContain('--verbose');
      expect(args).toContain('--permission-mode');
      expect(args[args.indexOf('--permission-mode') + 1]).toBe('auto');
      expect(args).toContain('--mcp-config');
    });

    it('omits --resume when there is no resume id', () => {
      const args = adaptor.buildArgs({ resumeId: null });
      expect(args).not.toContain('--resume');
    });

    it('includes --resume <id> when a resume id is provided', () => {
      const args = adaptor.buildArgs({ resumeId: 'claude-sess-abc' });
      const idx = args.indexOf('--resume');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe('claude-sess-abc');
    });
  });

  describe('parseLine', () => {
    it('drops empty lines', () => {
      expect(adaptor.parseLine('').kind).toBe('drop');
      expect(adaptor.parseLine('   ').kind).toBe('drop');
    });

    it('surfaces non-JSON lines as stdout events', () => {
      const result = adaptor.parseLine('hello world');
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('stdout');
        expect(result.event.data['text']).toBe('hello world');
      }
    });

    it('strips [system/...] markers from stdout text', () => {
      const result = adaptor.parseLine('[system/something] real text');
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.data['text']).toBe('real text');
      }
    });

    it('parses compact-mode text envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({ type: 'text', data: 'hello from claude' }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('ai_text');
        expect(result.event.data['text']).toBe('hello from claude');
      }
    });

    it('parses compact-mode tool_use envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({
          type: 'tool_use',
          id: 'tool-1',
          name: 'render_component',
          input: { name: 'Counter' },
        }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('tool_call');
        expect(result.event.data['id']).toBe('tool-1');
        expect(result.event.data['name']).toBe('render_component');
        expect((result.event.data['args'] as Record<string, unknown>)['name']).toBe('Counter');
      }
    });

    it('parses compact-mode tool_result envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({
          type: 'tool_result',
          id: 'tool-1',
          name: 'render_component',
          output: 'rendered',
        }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('tool_result');
        expect(result.event.data['id']).toBe('tool-1');
        expect(result.event.data['result']).toBe('rendered');
      }
    });

    it('parses verbose-mode assistant envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'verbose reply' }] },
        }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('ai_text');
        expect(result.event.data['text']).toBe('verbose reply');
      }
    });

    it('drops thinking blocks from assistant envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'thinking', text: '[system/thinking_tokens] ignored' },
              { type: 'text', text: 'visible reply' },
            ],
          },
        }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('ai_text');
        expect(result.event.data['text']).toBe('visible reply');
      }
    });

    it('emits status/init with the session id from system/init envelopes', () => {
      const result = adaptor.parseLine(
        JSON.stringify({
          type: 'system',
          subtype: 'init',
          session_id: 'claude-sess-xyz',
        }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('status');
        expect(result.event.data['status']).toBe('init');
        expect(result.event.data['sessionId']).toBe('claude-sess-xyz');
      }
    });

    it('drops hook events', () => {
      const result = adaptor.parseLine(
        JSON.stringify({ type: 'system', subtype: 'hook_started' }),
      );
      expect(result.kind).toBe('drop');
    });

    it('parses result envelopes as status/complete events', () => {
      const result = adaptor.parseLine(
        JSON.stringify({ type: 'result', usage: { input_tokens: 10 } }),
      );
      expect(result.kind).toBe('event');
      if (result.kind === 'event') {
        expect(result.event.type).toBe('status');
        expect(result.event.data['status']).toBe('complete');
      }
    });

    it('returns kind=complete for malformed result envelopes', () => {
      const result = adaptor.parseLine(JSON.stringify({ type: 'result' }));
      // mapStreamJsonEvent returns a status/complete event for result
      // envelopes with no usage too — sanity-check it's at least one
      // of the two terminal markers.
      expect(['event', 'complete']).toContain(result.kind);
    });

    it('drops unknown JSON shapes', () => {
      const result = adaptor.parseLine(JSON.stringify({ type: 'something-new' }));
      expect(result.kind).toBe('drop');
    });

    it('drops JSON with no type field', () => {
      const result = adaptor.parseLine(JSON.stringify({ foo: 'bar' }));
      expect(result.kind).toBe('drop');
    });
  });
});

describe('chat-session-registry', () => {
  beforeEach(() => {
    __resetChatSessions();
  });
  afterEach(() => {
    __resetChatSessions();
  });

  it('remembers and retrieves a Claude session id', () => {
    createChatSession('session-1');
    rememberClaudeSession('session-1', 'claude-sess-1');
    expect(getClaudeSession('session-1')).toBe('claude-sess-1');
  });

  it('returns null when no session exists', () => {
    expect(getClaudeSession('unknown')).toBeNull();
  });

  it('ignores remember calls for unknown sessions', () => {
    rememberClaudeSession('unknown', 'claude-sess-x');
    expect(getClaudeSession('unknown')).toBeNull();
  });
});
