/**
 * Provider descriptor — a pluggable LLM provider (Claude Code, codex, …).
 *
 * Each provider declares its own config schema; the playground UI renders
 * the config fields dynamically. State lives in `useProviders` and persists
 * to `localStorage`. Wire payloads (chat.message.provider) and server-side
 * adaptors consume the same shape.
 *
 * @module playground/providers/types
 */

/**
 * A single dynamic config field rendered by ProviderConfig.vue.
 *
 * `text` — plain text input (e.g. an API key).
 * `path` — file path input (e.g. CLI binary path); same HTML as `text`
 *          today, but reserved for future path-picker UI.
 */
export type ProviderConfigFieldType = 'text' | 'path';

/**
 * Field descriptor for one provider-config input.
 */
export interface ProviderConfigField {
  /** Key under `provider.config[key]` on the wire. */
  key: string;
  /** Visible label above the input. */
  label: string;
  /** Render hint — currently only `text` and `path` are implemented. */
  type: ProviderConfigFieldType;
  /** Default value when none is stored. */
  default: string;
  /** Placeholder shown inside the empty input. */
  placeholder: string;
  /** Optional helper text below the input. */
  help?: string;
}

/**
 * A registered provider.
 */
export interface ProviderDescriptor {
  /** Stable id used in the wire payload (provider.id) and on the server. */
  id: string;
  /** Visible option label in the Providers dropdown. */
  label: string;
  /** Short description shown below the dropdown or as a tooltip. */
  description: string;
  /** Config fields rendered when this provider is selected. */
  configFields: ProviderConfigField[];
  /**
   * If true, the provider option is shown but cannot be selected yet.
   * Used for "coming soon" entries (codex today) so the UI scaffold is
   * visible without misleading users into picking an unimplemented option.
   */
  disabled?: boolean;
}

/**
 * The provider block carried on the chat.message wire payload.
 *
 * The server's ProviderAdaptor registry uses `id` to look up the adaptor
 * that knows how to spawn the CLI for this provider.
 */
export interface ProviderWirePayload {
  id: string;
  /** Free-form config keyed by ProviderConfigField.key. */
  config: Record<string, string>;
}
