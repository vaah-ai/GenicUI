/**
 * Worker-isolation tests for the workspace plugin registry (M5.2-T2-1).
 *
 * AC6 specifies opt-in isolation via a Worker thread. The registry
 * exposes a `bootIsolated(reg)` seam that the test exercises by:
 *
 *   1. Spinning up a real `Worker` running a tiny inline-script that
 *      echoes messages on the parent port.
 *   2. Wrapping that into a "fake-isolated" ProviderAdaptor stub.
 *   3. Verifying that a registered factory producing that stub survives
 *      the registration lifecycle.
 *
 * The goal is to prove Bun's Worker API is wired correctly so a follow-up
 * task can swap in the real worker manifest. Bun-specific — Bun supports
 * inline source via Blob+createObjectURL.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Type } from '@sinclair/typebox';

import {
  registerProvider,
  getProviderAdaptor,
  __resetRegistryForTests,
} from '../registry.js';
import type { ProviderAdaptor, PluginExtraSurface } from '../types.js';

function spawnEchoWorker(): Worker {
  // Bun inline-source Worker pattern — wrap the script in a Blob URL
  // so the `new Worker()` constructor can resolve it. The worker
  // echoes every message it receives back to the parent.
  const src = `
self.onmessage = (event) => {
  // Echo the payload back so the parent can verify the round-trip.
  self.postMessage({ echoed: event.data });
};
`;
  const blob = new Blob([src], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

interface IsolatedProviderAdaptor extends ProviderAdaptor, Partial<PluginExtraSurface> {
  __workerHandle: Worker;
}

function fakeIsolatedAdaptor(id: string, worker: Worker): IsolatedProviderAdaptor {
  return {
    id,
    label: id,
    resolveBinary: () => '',
    buildArgs: () => [],
    parseLine: () => ({ kind: 'drop' }),
    // Required by `registerProvider`'s bearer-scrub heuristic when
    // the config schema mentions `bearerToken`. Even in the isolated-
    // worker case the register-time check still applies.
    scrubWithToken: (v: unknown) => v,
    __workerHandle: worker,
  };
}

beforeEach(() => {
  __resetRegistryForTests();
});

describe('worker-isolation seam (Bun inline-source Worker)', () => {
  it('spawns an echo worker and round-trips a payload', async () => {
    const worker = spawnEchoWorker();
    try {
      const echoed = await new Promise<{ echoed: unknown }>((resolve, reject) => {
        const onMessage = (event: MessageEvent): void => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          resolve(event.data as { echoed: unknown });
        };
        const onError = (err: ErrorEvent): void => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          reject(new Error(err.message));
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
        worker.postMessage({ hello: 'worker' });
      });
      expect(echoed).toEqual({ echoed: { hello: 'worker' } });
    } finally {
      worker.terminate();
    }
  });

  it('registers and retrieves a ProviderAdaptor that holds a Worker handle', () => {
    const worker = spawnEchoWorker();
    try {
      registerProvider({
        id: 'iso',
        label: 'Iso',
        configSchema: Type.Object(
          { bearerToken: Type.String() },
          { additionalProperties: false },
        ),
        factory: () => fakeIsolatedAdaptor('iso', worker),
      });
      const adaptor = getProviderAdaptor('iso');
      expect(adaptor).not.toBeNull();
      expect((adaptor as IsolatedProviderAdaptor).__workerHandle).toBe(worker);
    } finally {
      worker.terminate();
    }
  });

  it('bootIsolated requiresIsolation path resolves to the registered factory output', () => {
    const worker = spawnEchoWorker();
    try {
      registerProvider({
        id: 'iso-on',
        label: 'Iso On',
        configSchema: Type.Object(
          { bearerToken: Type.String() },
          { additionalProperties: false },
        ),
        requiresIsolation: true,
        factory: () => fakeIsolatedAdaptor('iso-on', worker),
      });
      const adaptor = getProviderAdaptor('iso-on') as IsolatedProviderAdaptor | null;
      expect(adaptor).not.toBeNull();
      // The stub `bootIsolated` inside registry.ts delegates to
      // `manifest.factory()` for now — a follow-up task can swap in a
      // real `Worker` + `MessagePort` proxy. The structural guarantee
      // is: the factory output is reachable through getProviderAdaptor.
      expect(adaptor?.id).toBe('iso-on');
    } finally {
      worker.terminate();
    }
  });
});
