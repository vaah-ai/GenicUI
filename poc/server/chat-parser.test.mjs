// Quick sanity checks for the chat parser. Run with:
//   node poc/server/chat-parser.test.mjs
// Prints PASS/FAIL counts and exits 0 on success.

import { parseOutputLine, mapStreamJsonEvent } from './chat-parser.mjs';

let passed = 0;
let failed = 0;
function expect(label, cond, detail) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// --- mapStreamJsonEvent: compact types ------------------------------------
{
  const r = mapStreamJsonEvent({ type: 'text', data: 'hello' });
  expect('compact text → ai_text', r?.type === 'ai_text' && r.data.text === 'hello');
}
{
  const r = mapStreamJsonEvent({ type: 'text', data: '' });
  expect('empty text is dropped', r === null);
}
{
  const r = mapStreamJsonEvent({ type: 'text', data: '[system/init] warmup' });
  expect('system markers stripped from text', r?.data.text === 'warmup');
}
{
  const r = mapStreamJsonEvent({ type: 'tool_use', id: 't1', name: 'render_component', input: { componentName: 'Counter' } });
  expect('tool_use → tool_call',
    r?.type === 'tool_call' &&
    r.data.name === 'render_component' &&
    r.data.args.componentName === 'Counter' &&
    r.data.id === 't1');
}
{
  const r = mapStreamJsonEvent({ type: 'tool_result', id: 't1', output: 'rendered' });
  expect('tool_result → tool_result',
    r?.type === 'tool_result' && r.data.result === 'rendered');
}
{
  const r = mapStreamJsonEvent({ type: 'error', error: 'boom' });
  expect('error → error', r?.type === 'error' && r.data.error === 'boom');
}
{
  const r = mapStreamJsonEvent({ type: 'result', usage: { input_tokens: 10 } });
  expect('result → status (not ai_text — avoids duplicate render)',
    r?.type === 'status' && r.data.status === 'complete');
}

// --- mapStreamJsonEvent: verbose types ------------------------------------
{
  const r = mapStreamJsonEvent({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'hi there' }] },
  });
  expect('verbose assistant text → ai_text',
    r?.type === 'ai_text' && r.data.text === 'hi there');
}
{
  const r = mapStreamJsonEvent({
    type: 'assistant',
    message: { content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'visible' }] },
  });
  expect('thinking blocks dropped, text preserved',
    r?.type === 'ai_text' && r.data.text === 'visible');
}
{
  const r = mapStreamJsonEvent({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id: 'tu1', name: 'X', input: { foo: 1 } }] },
  });
  expect('verbose assistant tool_use → tool_call',
    r?.type === 'tool_call' && r.data.name === 'X' && r.data.args.foo === 1);
}
{
  const r = mapStreamJsonEvent({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: [{ type: 'text', text: 'r1' }] }] },
  });
  expect('verbose user tool_result → tool_result',
    r?.type === 'tool_result' && r.data.result === 'r1' && r.data.id === 'tu1');
}
{
  const r = mapStreamJsonEvent({ type: 'system', subtype: 'init', session_id: 'abc' });
  expect('system/init → status with session id',
    r?.type === 'status' && r.data.status === 'init' && r.data.sessionId === 'abc');
}
{
  const r = mapStreamJsonEvent({ type: 'system', subtype: 'hook_started' });
  expect('hook_started is dropped', r === null);
}

// --- parseOutputLine: high-level dispatcher -------------------------------
{
  const r = parseOutputLine('{"type":"text","data":"hi"}');
  expect('parseOutputLine → event for text',
    r.kind === 'event' && r.event.type === 'ai_text');
}
{
  const r = parseOutputLine('{"type":"system","subtype":"init","session_id":"s1"}');
  expect('parseOutputLine → session for init', r.kind === 'session' && r.sessionId === 's1');
}
{
  const r = parseOutputLine('{"type":"result","usage":{}}');
  expect('parseOutputLine → event (status) for result',
    r.kind === 'event' && r.event.type === 'status');
}
{
  const r = parseOutputLine('not json at all');
  expect('parseOutputLine → stdout for non-JSON',
    r.kind === 'stdout' && r.text.includes('not json'));
}
{
  const r = parseOutputLine('   ');
  expect('parseOutputLine drops empty lines', r.kind === 'drop');
}
{
  const r = parseOutputLine('{"type":"system","subtype":"hook_started"}');
  expect('parseOutputLine drops hooks', r.kind === 'drop');
}

console.log(`\n=== parser tests: ${passed} passed, ${failed} failed ===`);
process.exit(failed === 0 ? 0 : 1);