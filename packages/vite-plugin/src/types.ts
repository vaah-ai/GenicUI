/**
 * GenicUI Vite Plugin — type definitions.
 *
 * @module @genicui/vite-plugin/types
 * @see {F30} — Vite plugin + component auto-registration
 */

/**
 * Metadata about a discovered GenicElement subclass.
 *
 * Extracted by the AST scanner from:
 * - `class X extends GenicElement` declarations
 * - `customElements.define('tag-name', X)` calls
 * - Static `propsSchema` and `events` properties
 *
 * @see {F30-AC1} — Auto-discovery of GenicElement subclasses
 */
export interface ComponentMeta {
  /** The class name (e.g., "DataTable") */
  readonly className: string;
  /** The custom element tag name (e.g., "genui-data-table") */
  readonly tag: string;
  /** Relative path to the source file */
  readonly file: string;
  /** Props schema object, if declared as a static property */
  readonly propsSchema?: Record<string, unknown>;
  /** Events declaration object, if declared as a static property */
  readonly events?: Record<string, unknown>;
}

/**
 * Configuration options for the GenicUI Vite plugin.
 *
 * @see {F30} — Vite plugin + component auto-registration
 */
export interface GenicUIPluginOptions {
  /**
   * Directory containing GenicUI component files.
   * The scanner looks for `.ts` files in this directory.
   *
   * @default 'src/genui/components'
   */
  readonly componentsDir?: string;

  /**
   * Output path for the generated registry JSON file.
   * Relative to the project root (resolved from Vite config.root).
   *
   * @default 'genui-registry.json'
   */
  readonly registryOutput?: string;
}

/**
 * The registry object emitted as `genui-registry.json`
 * at the end of a Vite build.
 *
 * @see {F30-AC3} — genui-registry.json emission
 */
export interface GenicUIRegistry {
  /** Schema version identifier */
  readonly version: string;
  /** List of all discovered components */
  readonly components: readonly RegistryEntry[];
}

/**
 * A single entry in the `genui-registry.json` output.
 *
 * Contains the component name, tag, file path, and
 * metadata (propsSchema, events) for the server to
 * validate incoming tool calls.
 */
export interface RegistryEntry {
  /** The class name (e.g., "DataTable") */
  readonly name: string;
  /** The custom element tag name (e.g., "genui-data-table") */
  readonly tag: string;
  /** Relative path to the source file */
  readonly file: string;
  /** Version of the component (defaults to "0.1.0") */
  readonly version: string;
  /** Props schema, if declared */
  readonly propsSchema?: Record<string, unknown>;
  /** Events declaration, if declared */
  readonly events?: Record<string, unknown>;
}
