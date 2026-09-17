/**
 * EJG-LAYOUT-2 enforcement test — asserts `registry/components.ts`
 * stays at or under 50 lines of executable code.
 *
 * Executable lines = non-blank, non-`//`-comment lines. Block comments
 * (`/* ... *\/`) are stripped via a coarse state machine.
 *
 * The cap exists because the registry is metadata-only — anything that
 * grows past 50 lines almost certainly wants to live in `agent/` (which
 * the `ui/` import-graph test then forbids `ui/` from importing).
 *
 * @see {EJG-LAYOUT-2}
 * @see {M5.2-T3-AC4}
 */

import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const REPO_ROOT = dirname(import.meta.dir);
const REGISTRY_FILE = join(
  REPO_ROOT,
  'app',
  'components',
  'ecommerce',
  'registry',
  'components.ts',
);

const MAX_EXECUTABLE_LINES = 50;

function countExecutableLines(source: string): number {
  let inBlockComment = false;
  let exe = 0;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;

    let i = 0;
    let meaningful = '';
    while (i < line.length) {
      const ch = line[i];
      const next = line[i + 1];

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }

      if (ch === '/' && next === '/') {
        // rest-of-line comment
        break;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      meaningful += ch;
      i += 1;
    }

    if (meaningful.trim().length > 0) exe += 1;
  }
  return exe;
}

describe('registry-size (EJG-LAYOUT-2)', () => {
  test(`registry/components.ts ≤ ${MAX_EXECUTABLE_LINES} executable lines`, async () => {
    const source = await readFile(REGISTRY_FILE, 'utf8');
    const count = countExecutableLines(source);
    if (count > MAX_EXECUTABLE_LINES) {
      throw new Error(
        `registry/components.ts has ${count} executable lines ` +
          `(cap is ${MAX_EXECUTABLE_LINES}). Logic above the cap belongs in agent/.`,
      );
    }
    expect(count).toBeLessThanOrEqual(MAX_EXECUTABLE_LINES);
  });
});