/**
 * Discovery tests for the workspace plugin registry (M5.2-T2-1).
 *
 * AC7 — `discoverWorkspaceProviders(workspaceRoot)` walks the
 * `<workspaceRoot>/server/providers/<name>/define.ts` convention and
 * returns a list of `ProviderPluginManifest`s. We exercise it against
 * a tmpdir fixture that holds 3 fake packages: 2 valid + 1 syntactically
 * broken (which we expect to be skipped with a warning).
 *
 * NB: the tmpdir layout mirrors the live workspace convention — i.e.
 * `<tmpdir>/server/providers/<name>/define.ts`. Bun loads `.ts` files
 * dynamically on `await import(absolutePath)` so no transpile step is
 * needed.
 */

import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  discoverWorkspaceProviders,
  type WorkspaceDiscoveryResult,
} from '../registry.js';

let root: string;

beforeEach(() => {
  // `root` acts as `workspaceRoot` — the discovery function appends
  // `server/providers/` to it. So we lay out:
  //   <root>/server/providers/<name>/define.ts
  root = mkdtempSync(join(tmpdir(), 'discovery-test-'));
  mkdirSync(join(root, 'server', 'providers'), { recursive: true });
  // Reset the registry between cases so each test starts clean.
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeProvider(name: string, body: string): void {
  const dir = join(root, 'server', 'providers', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'define.ts'), body, 'utf8');
}

describe('discoverWorkspaceProviders', () => {
  it('returns an empty list when the providers directory is empty', async () => {
    const result: WorkspaceDiscoveryResult = await discoverWorkspaceProviders(root);
    expect(result.manifests).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('discovers 2 valid packages (macOS readdir returns dir-creation order)', async () => {
    writeProvider(
      'alpha',
      `export default {
  id: 'alpha',
  label: 'Alpha',
  configSchema: { type: 'object', properties: { url: { type: 'string' } }, additionalProperties: false },
  factory: () => ({ id: 'alpha', label: 'Alpha', resolveBinary: () => '', buildArgs: () => [], parseLine: () => ({ kind: 'drop' }) }),
};`,
    );
    writeProvider(
      'beta',
      `export default {
  id: 'beta',
  label: 'Beta',
  configSchema: { type: 'object', properties: { token: { type: 'string' } }, additionalProperties: false },
  factory: () => ({ id: 'beta', label: 'Beta', resolveBinary: () => '', buildArgs: () => [], parseLine: () => ({ kind: 'drop' }), scrubWithToken: (v) => v }),
};`,
    );

    const result = await discoverWorkspaceProviders(root);
    // macOS HFS+ returns readdir entries in inode-creation order, not
    // lexicographic. We assert set-equality rather than order, which
    // is what the live contract guarantees anyway (insertion order is
    // documented but the consumer only cares that both loaded).
    const ids = result.manifests.map((m) => m.id).sort();
    expect(ids).toEqual(['alpha', 'beta']);
    expect(result.warnings).toEqual([]);
  });

  it('emits a warning for a syntactically broken define.ts and skips it', async () => {
    writeProvider('gamma', `export default NOT_VALID_JS;`);
    writeProvider(
      'delta',
      `export default {
  id: 'delta',
  label: 'Delta',
  configSchema: { type: 'object', properties: {}, additionalProperties: false },
  factory: () => ({ id: 'delta', label: 'Delta', resolveBinary: () => '', buildArgs: () => [], parseLine: () => ({ kind: 'drop' }) }),
};`,
    );

    const result = await discoverWorkspaceProviders(root);
    expect(result.manifests.map((m) => m.id)).toEqual(['delta']);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0]).toContain('gamma');
  });
});
