/**
 * EJG-LAYOUT-1 enforcement test — walks every `.vue` file under
 * `app/components/ecommerce/ui/` and asserts the `<script setup>`
 * block does not import from `../agent/` and does not call `useFetch(`.
 *
 * The three-layer rule (`ui/` pure, `agent/` data, `registry/`
 * metadata) is structural — a future contributor who tries to sneak
 * a `useFetch` or a direct `../agent/` import into a UI component
 * breaks the build.
 *
 * @see {EJG-LAYOUT-1}
 * @see {M5.2-T3-AC5}
 */

import { describe, expect, test } from 'bun:test';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const REPO_ROOT = dirname(import.meta.dir);
const UI_DIR = join(REPO_ROOT, 'app', 'components', 'ecommerce', 'ui');

const FORBIDDEN_PATTERNS: ReadonlyArray<{ readonly label: string; readonly re: RegExp }> = [
  { label: "from '../agent/'", re: /from\s+['"]\.\.\/agent\// },
  { label: 'useFetch(', re: /\buseFetch\s*\(/ },
];

async function collectVueFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    const p = join(dir, entry);
    const s = await stat(p);
    if (s.isDirectory()) {
      out.push(...(await collectVueFiles(p)));
    } else if (entry.endsWith('.vue')) {
      out.push(p);
    }
  }
  return out;
}

function extractScriptSetup(source: string): string {
  // Match both <script setup> and <script setup lang="ts">. Use a
  // greedy match so the test catches violations even when `<script
  // setup>` is repeated (some Vue files have multiple script blocks).
  const re = /<script\s+setup[^>]*>([\s\S]*?)<\/script>/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    blocks.push(m[1] ?? '');
  }
  return blocks.join('\n');
}

describe('ecommerce-import-graph (EJG-LAYOUT-1)', () => {
  test('every ui/*.vue file refuses from ../agent/ and useFetch()', async () => {
    const files = await collectVueFiles(UI_DIR);
    expect(files.length).toBeGreaterThanOrEqual(18);

    const violations: Array<{ readonly file: string; readonly label: string }> = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const script = extractScriptSetup(source);
      for (const { label, re } of FORBIDDEN_PATTERNS) {
        if (re.test(script)) {
          violations.push({ file, label });
        }
      }
    }

    if (violations.length > 0) {
      const lines = violations.map((v) => `  ${v.file}: ${v.label}`).join('\n');
      throw new Error(
        `EJG-LAYOUT-1 violations found:\n${lines}\n\n` +
          `The ui/ layer must stay pure. Move data fetching into agent/.`,
      );
    }
  });
});