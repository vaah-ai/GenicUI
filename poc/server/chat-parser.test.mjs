// Chat parser — unit tests for mapStreamJsonEvent and parseOutputLine.
// Run with: bun test poc/server/chat-parser.test.mjs
//
// Maps to F4 (JsonPatchEngine / stream parser) acceptance criteria.

import { describe, it, expect } from 'bun:test';
import { parseOutputLine, mapStreamJsonEvent } from './chat-parser.mjs';

// ===================================================================
// mapStreamJsonEvent — compact types
// ===================================================================
describe('mapStreamJsonEvent: compact types', () => {
  it('text → ai_text', () => {
    const r = mapStreamJsonEvent({ type: 'text', data: 'hello' });
    expect(r?.type).toBe('ai_text');
    expect(r?.data?.text).toBe('hello');
  });

  it('empty text is dropped', () => {
    expect(mapStreamJsonEvent({ type: 'text', data: '' })).toBeNull();
  });

  it('system markers stripped from text', () => {
    const r = mapStreamJsonEvent({ type: 'text', data: '[system/init] warmup' });
    expect(r?.type).toBe('ai_text');
    expect(r?.data?.text).toBe('warmup');
  });

  it('tool_use → tool_call', () => {
    const r = mapStreamJsonEvent({
      type: 'tool_use',
      id: 't1',
      name: 'render_component',
      input: { componentName: 'Counter' },
    });
    expect(r?.type).toBe('tool_call');
    expect(r?.data?.name).toBe('render_component');
    expect(r?.data?.args?.componentName).toBe('Counter');
    expect(r?.data?.id).toBe('t1');
  });

  it('tool_use with missing fields uses defaults', () => {
    const r = mapStreamJsonEvent({ type: 'tool_use' });
    expect(r?.type).toBe('tool_call');
    expect(r?.data?.id).toBe('');
    expect(r?.data?.name).toBe('');
    expect(r?.data?.args).toEqual({});
  });

  it('tool_result → tool_result', () => {
    const r = mapStreamJsonEvent({ type: 'tool_result', id: 't1', output: 'rendered' });
    expect(r?.type).toBe('tool_result');
    expect(r?.data?.result).toBe('rendered');
  });

  it('error → error', () => {
    const r = mapStreamJsonEvent({ type: 'error', error: 'boom' });
    expect(r?.type).toBe('error');
    expect(r?.data?.error).toBe('boom');
  });

  it('result → status (not ai_text — avoids duplicate render)', () => {
    const r = mapStreamJsonEvent({ type: 'result', usage: { input_tokens: 10 } });
    expect(r?.type).toBe('status');
    expect(r?.data?.status).toBe('complete');
  });

  it('unknown type returns null', () => {
    expect(mapStreamJsonEvent({ type: 'foobar' })).toBeNull();
  });

  it('null input returns null', () => {
    expect(mapStreamJsonEvent(null)).toBeNull();
  });
});

// ===================================================================
// mapStreamJsonEvent — verbose types
// ===================================================================
describe('mapStreamJsonEvent: verbose types', () => {
  it('verbose assistant text → ai_text', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'hi there' }] },
    });
    expect(r?.type).toBe('ai_text');
    expect(r?.data?.text).toBe('hi there');
  });

  it('thinking blocks dropped, text preserved', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: {
        content: [
          { type: 'thinking', thinking: 'private' },
          { type: 'text', text: 'visible' },
        ],
      },
    });
    expect(r?.type).toBe('ai_text');
    expect(r?.data?.text).toBe('visible');
  });

  it('verbose assistant tool_use → tool_call', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: 'tu1', name: 'X', input: { foo: 1 } },
        ],
      },
    });
    expect(r?.type).toBe('tool_call');
    expect(r?.data?.name).toBe('X');
    expect(r?.data?.args?.foo).toBe(1);
  });

  it('assistant with string content', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: { content: 'plain string' },
    });
    expect(r?.type).toBe('ai_text');
    expect(r?.data?.text).toBe('plain string');
  });

  it('assistant with empty string content returns null', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: { content: '   ' },
    });
    expect(r).toBeNull();
  });

  it('assistant with no content returns null', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: { content: null },
    });
    expect(r).toBeNull();
  });

  it('assistant with non-array content returns null', () => {
    const r = mapStreamJsonEvent({
      type: 'assistant',
      message: { content: 42 },
    });
    expect(r).toBeNull();
  });

  it('verbose user tool_result → tool_result', () => {
    const r = mapStreamJsonEvent({
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu1',
            content: [{ type: 'text', text: 'r1' }],
          },
        ],
      },
    });
    expect(r?.type).toBe('tool_result');
    expect(r?.data?.result).toBe('r1');
    expect(r?.data?.id).toBe('tu1');
  });

  it('verbose user non-array content returns null', () => {
    const r = mapStreamJsonEvent({
      type: 'user',
      message: { content: 'not an array' },
    });
    expect(r).toBeNull();
  });

  it('system/init → status with session id', () => {
    const r = mapStreamJsonEvent({ type: 'system', subtype: 'init', session_id: 'abc' });
    expect(r?.type).toBe('status');
    expect(r?.data?.status).toBe('init');
    expect(r?.data?.sessionId).toBe('abc');
  });

  it('system/init with data.session_id', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      subtype: 'init',
      data: { session_id: 'def' },
    });
    expect(r?.data?.sessionId).toBe('def');
  });

  it('hook_started is dropped', () => {
    expect(mapStreamJsonEvent({ type: 'system', subtype: 'hook_started' })).toBeNull();
  });

  it('hook_response is dropped', () => {
    expect(mapStreamJsonEvent({ type: 'system', subtype: 'hook_response' })).toBeNull();
  });

  it('task_started → status', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      subtype: 'task_started',
      description: 'starting',
      task_id: 't42',
    });
    expect(r?.type).toBe('status');
    expect(r?.data?.status).toBe('task_started');
  });

  it('task_progress → status', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      subtype: 'task_progress',
    });
    expect(r?.data?.status).toBe('task_progress');
  });

  it('task_completed → status', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      subtype: 'task_completed',
      description: 'done',
      task_id: 't1',
    });
    expect(r?.data?.status).toBe('task_completed');
    expect(r?.data?.description).toBe('done');
  });

  it('task_notification → status(task_completed)', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      subtype: 'task_notification',
    });
    expect(r?.data?.status).toBe('task_completed');
  });

  it('system event with error → error', () => {
    const r = mapStreamJsonEvent({ type: 'system', error: 'oops' });
    expect(r?.type).toBe('error');
    expect(r?.data?.error).toBe('oops');
  });

  it('system event with data.error → error', () => {
    const r = mapStreamJsonEvent({
      type: 'system',
      data: { error: 'inner' },
    });
    expect(r?.type).toBe('error');
    expect(r?.data?.error).toBe('inner');
  });

  it('system with unknown subtype returns null', () => {
    expect(mapStreamJsonEvent({ type: 'system', subtype: 'unknown' })).toBeNull();
  });
});

// ===================================================================
// parseOutputLine — high-level dispatcher
// ===================================================================
describe('parseOutputLine', () => {
  it('text JSON → event', () => {
    const r = parseOutputLine('{"type":"text","data":"hi"}');
    expect(r.kind).toBe('event');
    expect(r.event.type).toBe('ai_text');
  });

  it('system/init JSON → session', () => {
    const r = parseOutputLine('{"type":"system","subtype":"init","session_id":"s1"}');
    expect(r.kind).toBe('session');
    expect(r.sessionId).toBe('s1');
  });

  it('result JSON → event (status)', () => {
    const r = parseOutputLine('{"type":"result","usage":{}}');
    expect(r.kind).toBe('event');
    expect(r.event.type).toBe('status');
  });

  it('non-JSON line → stdout', () => {
    const r = parseOutputLine('not json at all');
    expect(r.kind).toBe('stdout');
    expect(r.text).toContain('not json');
  });

  it('empty line → drop', () => {
    expect(parseOutputLine('   ').kind).toBe('drop');
    expect(parseOutputLine('').kind).toBe('drop');
  });

  it('hook_started → drop', () => {
    const r = parseOutputLine('{"type":"system","subtype":"hook_started"}');
    expect(r.kind).toBe('drop');
  });

  it('system/init without session_id → drop', () => {
    const r = parseOutputLine('{"type":"system","subtype":"init"}');
    expect(r.kind).toBe('drop');
  });

  it('JSON without type → drop', () => {
    expect(parseOutputLine('{"foo":"bar"}').kind).toBe('drop');
  });

  it('JSON array → drop', () => {
    expect(parseOutputLine('[1,2,3]').kind).toBe('drop');
  });

  it('system markers stripped from non-JSON', () => {
    const r = parseOutputLine('[system/init] raw output');
    expect(r.kind).toBe('stdout');
    expect(r.text).toBe('raw output');
  });
});
