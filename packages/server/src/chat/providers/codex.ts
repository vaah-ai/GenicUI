/**
 * Codex provider adaptor — STUB. Scaffolds the registry entry so the
 * UI can list the provider as "coming soon" without crashing.
 *
 * Real implementation will follow once the OpenAI Codex CLI's
 * stream-json shape is finalized. Until then, calling
 * `resolveBinary` / `buildArgs` / `parseLine` throws.
 *
 * @module @genicui/server/chat/providers/codex
 *
 * @see {M5-T6} — Providers dropdown + provider adaptor pattern
 */

import type { ProviderAdaptor, ProviderConfig, ParsedLine } from './types.js';

export class CodexAdaptor implements ProviderAdaptor {
  public readonly id = 'codex';
  public readonly label = 'Codex (coming soon)';

  resolveBinary(_config: ProviderConfig): string {
    throw new Error('CodexAdaptor is not implemented yet');
  }

  buildArgs(_opts: { readonly resumeId: string | null }): string[] {
    throw new Error('CodexAdaptor is not implemented yet');
  }

  parseLine(_line: string): ParsedLine {
    throw new Error('CodexAdaptor is not implemented yet');
  }
}
