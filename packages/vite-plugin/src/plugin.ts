/**
 * GenicUI Vite Plugin — main plugin factory.
 *
 * Auto-discovers GenicElement subclasses, provides HMR
 * support, and emits `genui-registry.json` on build.
 *
 * @module @genicui/vite-plugin/plugin
 * @see {F30} — Vite plugin + component auto-registration
 */

import fs from 'node:fs';
import path from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';

import { scanComponentFile } from './scanner.js';
import type {
  ComponentMeta,
  GenicUIPluginOptions,
  GenicUIRegistry,
  RegistryEntry,
} from './types.js';

/** Virtual module ID for the auto-registration entry point. */
const VIRTUAL_ID = '\0genicui:components';

/** Resolved virtual module ID (used by Vite internally). */
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/** Default components directory relative to the project root. */
const DEFAULT_COMPONENTS_DIR = 'src/genui/components';

/** Default registry output filename. */
const DEFAULT_REGISTRY_OUTPUT = 'genui-registry.json';

/** Registry schema version. */
const REGISTRY_VERSION = '1.0.0';

/**
 * Create the GenicUI Vite plugin.
 *
 * Usage in `vite.config.ts`:
 * ```ts
 * import { genicui } from '@genicui/vite-plugin';
 * export default { plugins: [genicui({ componentsDir: 'src/genui/components' })] };
 * ```
 *
 * @param options — plugin configuration
 * @returns Vite plugin
 */
export function viteGenicUI(
  options: GenicUIPluginOptions = {},
): Plugin {
  const componentsDir = options.componentsDir ?? DEFAULT_COMPONENTS_DIR;
  const registryOutput = options.registryOutput ?? DEFAULT_REGISTRY_OUTPUT;

  // Discovered components registry — updated on each scan
  let components: ComponentMeta[] = [];

  // Dev server reference for HMR
  let server: ViteDevServer | null = null;

  return {
    name: 'genicui-vite-plugin',
    enforce: 'post',

    /**
     * Resolve the virtual module ID.
     *
     * @see {F30-AC1} — Auto-discovery
     */
    resolveId(id: string): string | undefined {
      if (id === VIRTUAL_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
      return undefined;
    },

    /**
     * Load the virtual module with auto-registration code.
     *
     * Generates JavaScript that imports each discovered component
     * file and registers it via `customElements.define()`.
     *
     * @see {F30-AC1} — Auto-discovery
     */
    load(id: string): string | undefined {
      if (id !== RESOLVED_VIRTUAL_ID) {
        return undefined;
      }

      // Scan for components
      components = discoverComponents(componentsDir);

      if (components.length === 0) {
        return `/* No GenicUI components discovered */`;
      }

      // Generate import + registration code
      const imports = components
        .map((c) => `import './${normalizePath(c.file)}';`)
        .join('\n');

      return `
// GenicUI auto-registration — F30
${imports}

// Components are self-registering via customElements.define() in their source files.
// This module ensures all component files are imported at startup.
export default { components: ${JSON.stringify(components.map((c) => c.tag))} };
`;
    },

    /**
     * Configure the dev server for HMR support.
     *
     * @see {F30-AC2} — HMR on file save
     */
    configureServer(s: ViteDevServer): void {
      server = s;
    },

    /**
     * Handle HMR updates for component files.
     *
     * When a component file changes, this hook intercepts
     * the HMR update and ensures the virtual module is also
     * invalidated, triggering re-import.
     *
     * @see {F30-AC2} — HMR on file save
     */
    async handleHotUpdate({
      file,
      server: devServer,
    }): Promise<void> {
      const absComponentsDir = path.resolve(
        devServer.config.root,
        componentsDir,
      );
      const absFile = path.resolve(file);

      // Only handle files within the components directory
      if (!absFile.startsWith(absComponentsDir)) {
        return;
      }

      // Re-discover components
      components = discoverComponents(componentsDir);

      // Invalidate the virtual module so it re-executes
      const mod = devServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
      if (mod) {
        devServer.moduleGraph.invalidateModule(mod);
      }

      // Send HMR update
      devServer.ws.send({
        type: 'full-reload',
        path: `${componentsDir}/**`,
      });
    },

    /**
     * Emit `genui-registry.json` at the end of the build.
     *
     * @see {F30-AC3} — genui-registry.json emission
     */
    closeBundle(): void {
      // Scan one final time to ensure we have all components
      components = discoverComponents(componentsDir);

      if (components.length === 0) {
        return;
      }

      // Build registry entries
      const entries: RegistryEntry[] = components.map((c) => ({
        name: c.className,
        tag: c.tag,
        file: c.file,
        version: REGISTRY_VERSION,
        ...(c.propsSchema ? { propsSchema: c.propsSchema } : {}),
        ...(c.events ? { events: c.events } : {}),
      }));

      const registry: GenicUIRegistry = {
        version: REGISTRY_VERSION,
        components: entries,
      };

      // Write to the project root
      const outputPath = path.resolve(registryOutput);
      fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));
    },
  };
}

/**
 * Discover all GenicElement subclasses in the components directory.
 *
 * Scans `.ts` files recursively, parses each with the AST scanner,
 * and collects discovered components.
 *
 * @param dir — components directory (relative to CWD or absolute)
 * @returns array of ComponentMeta
 */
function discoverComponents(dir: string): ComponentMeta[] {
  const absDir = path.isAbsolute(dir) ? dir : path.resolve(dir);
  const results: ComponentMeta[] = [];

  if (!fs.existsSync(absDir)) {
    return results;
  }

  const files = listTypeScriptFiles(absDir);

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    const source = fs.readFileSync(file, 'utf-8');
    const metas = scanComponentFile(source);

    for (const meta of metas) {
      results.push({
        ...meta,
        file: relPath,
      });
    }
  }

  return results;
}

/**
 * Recursively list `.ts` files in a directory.
 */
function listTypeScriptFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      result.push(fullPath);
    }
  }

  return result;
}

/**
 * Normalize a file path to use forward slashes (cross-platform).
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}
