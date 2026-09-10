/**
 * useComponents.sendComponentEvent tests.
 *
 * Verifies the outbound `chat.component_event` frame envelope and the
 * `nameFor` lookup that resolves a missing component name from the
 * local registry.
 *
 * @see {F43} — Chat as the sole render surface (interactive components)
 */

// @ts-nocheck — test files use dynamic assertions on parsed JSON

import { describe, it, expect, beforeEach } from 'bun:test';

import { useComponents } from '../useComponents.ts';

/**
 * Recording WS stub — captures every frame passed to `send`.
 */
class RecordingWs {
  sent: Record<string, unknown>[] = [];
  send(data: Record<string, unknown>): void {
    this.sent.push(data);
  }
}

describe('useComponents.sendComponentEvent', () => {
  beforeEach(() => {
    useComponents().clear();
  });

  it('builds a chat.component_event frame on __chat__ channel', () => {
    const ws = new RecordingWs();
    useComponents().sendComponentEvent(
      ws as never,
      'cp-1',
      'InputPair',
      'submit',
      { input1: 5, input2: 3 },
    );

    expect(ws.sent).toHaveLength(1);
    const frame = ws.sent[0]!;
    expect(frame['v']).toBe(1);
    expect(frame['channel']).toBe('__chat__');
    expect(frame['type']).toBe('chat.component_event');
    expect(frame['seq']).toBe(0);

    const payload = frame['payload'] as Record<string, unknown>;
    expect(payload['componentId']).toBe('cp-1');
    expect(payload['name']).toBe('InputPair');
    expect(payload['action']).toBe('submit');
    expect(payload['payload']).toEqual({ input1: 5, input2: 3 });
  });

  it('omits payload key when not provided', () => {
    const ws = new RecordingWs();
    useComponents().sendComponentEvent(ws as never, 'cp-1', 'X', 'tap');
    const payload = ws.sent[0]!['payload'] as Record<string, unknown>;
    expect(payload['action']).toBe('tap');
    expect(payload['payload']).toBeUndefined();
  });

  it('resolves component name from the local registry when caller omits it', () => {
    const ws = new RecordingWs();
    // Register a component manually so findComponent() resolves it.
    useComponents().subscribe({
      onMessage(handler: (frame: unknown) => void) {
        handler({
          v: 1,
          channel: 'cp-2',
          type: 'COMPONENT_MOUNTED',
          payload: {
            componentId: 'cp-2',
            channel: 'cp-2',
            name: 'InputPair',
            initialState: {},
          },
        });
        return () => {};
      },
    } as never);

    useComponents().sendComponentEvent(ws as never, 'cp-2', undefined, 'submit', {
      input1: 1,
      input2: 2,
    });

    const payload = ws.sent[0]!['payload'] as Record<string, unknown>;
    expect(payload['componentId']).toBe('cp-2');
    expect(payload['name']).toBe('InputPair');
  });

  it('passes through undefined name when componentId is unknown', () => {
    const ws = new RecordingWs();
    useComponents().sendComponentEvent(
      ws as never,
      'cp-unknown',
      undefined,
      'tap',
    );
    const payload = ws.sent[0]!['payload'] as Record<string, unknown>;
    expect(payload['name']).toBeUndefined();
  });

  it('nameFor returns the registered name', () => {
    const comps = useComponents();
    comps.subscribe({
      onMessage(handler: (frame: unknown) => void) {
        handler({
          v: 1,
          channel: 'cp-3',
          type: 'COMPONENT_MOUNTED',
          payload: {
            componentId: 'cp-3',
            channel: 'cp-3',
            name: 'ResultCard',
            initialState: {},
          },
        });
        return () => {};
      },
    } as never);
    expect(comps.nameFor('cp-3')).toBe('ResultCard');
    expect(comps.nameFor('cp-nope')).toBeUndefined();
  });
});
