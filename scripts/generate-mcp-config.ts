#!/usr/bin/env bun
/**
 * Generate .mcp.json from mcp.json.example by expanding ${REPO_ROOT} into
 * the absolute path of the GenicUI repo on this machine.
 *
 * Why: the committed `.mcp.json` previously hardcoded an absolute macOS
 * author path (`/Users/pk/Projects/...`). On any other OS — including
 * Windows — Claude Code could not load the GenicUI MCP server and the
 * chat panel showed repeated `[error: unknown]` for every tool call.
 * Generating `.mcp.json` per-clone keeps the template portable while
 * giving Claude Code the absolute path it needs.
 *
 * Idempotent: rewrites `.mcp.json` on every run. Safe to invoke from
 * `start.sh` on every boot.
 *
 * Usage:
 *   bun run scripts/generate-mcp-config.ts
 *   # from project root; accepts --repo-root <path> override.
 *
 * Tokens supported in mcp.json.example:
 *   ${REPO_ROOT} — absolute path to the repo root (no trailing slash)
 *
 * @module scripts/generate-mcp-config
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, '..');

/**
 * Resolve `--repo-root <path>` from CLI args if present, else the
 * directory two levels above this script (the repo root).
 */
function resolveRepoRoot(): string {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf('--repo-root');
  if (idx >= 0 && argv[idx + 1]) {
    return resolve(argv[idx + 1]!);
  }
  return DEFAULT_REPO_ROOT;
}

/**
 * Expand `${REPO_ROOT}` tokens in the template JSON. Throws if the
 * example is missing or unreadable so the start script can surface
 * the error to the developer.
 */
export function expandTemplate(template: string, repoRoot: string): string {
  const absoluteRoot = repoRoot.replace(/\\/g, '/');
  return template.replace(/\$\{REPO_ROOT\}/g, absoluteRoot);
}

function main(): void {
  const repoRoot = resolveRepoRoot();
  const examplePath = resolve(repoRoot, 'mcp.json.example');
  const outputPath = resolve(repoRoot, '.mcp.json');

  if (!existsSync(examplePath)) {
    console.error(`[generate-mcp-config] missing template: ${examplePath}`);
    console.error('  Re-check out mcp.json.example from git or restore the file.');
    process.exit(1);
  }

  const template = readFileSync(examplePath, 'utf8');
  const expanded = expandTemplate(template, repoRoot);

  // Validate that expansion produced real JSON before writing.
  try {
    JSON.parse(expanded);
  } catch (err) {
    console.error('[generate-mcp-config] expanded template is not valid JSON:');
    console.error(err);
    console.error('--- template ---');
    console.error(template);
    console.error('--- expanded ---');
    console.error(expanded);
    process.exit(1);
  }

  writeFileSync(outputPath, expanded, 'utf8');
  console.log(`[generate-mcp-config] wrote ${outputPath}`);
}

if (import.meta.main) {
  main();
}
