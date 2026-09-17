/**
 * Provider descriptor types — workspace-local mirror of the
 * `examples/playground/app/providers/types.ts` shape.
 *
 * The ecommerce playground ships only the `vaahstore` provider in its
 * dropdown, so the mirror is intentionally minimal — adding a new
 * provider requires adding its descriptor here.
 *
 * TODO(M5.x): once a shared `examples/_shared/providers/types.ts`
 * module lands, import the authoritative interface from there.
 *
 * @module playground-ecommerce/app/providers/types
 */

export type ProviderConfigFieldType = 'text' | 'path';

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
   */
  disabled?: boolean;
}

export interface ProviderWirePayload {
  id: string;
  /** Free-form config keyed by ProviderConfigField.key. */
  config: Record<string, string>;
}
