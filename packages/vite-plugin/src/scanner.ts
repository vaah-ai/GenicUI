/**
 * AST scanner for GenicElement subclasses.
 *
 * Parses TypeScript source files using @babel/parser to
 * find:
 * 1. `class X extends GenicElement` declarations
 * 2. `customElements.define('tag-name', X)` calls
 * 3. Static `propsSchema` and `events` properties
 *
 * @module @genicui/vite-plugin/scanner
 * @see {F30-AC1} — Auto-discovery of GenicElement subclasses
 */

import { parse } from '@babel/parser';
import type {
  Node as BabelNode,
  ClassDeclaration as BabelClassDeclaration,
  CallExpression as BabelCallExpression,
  ClassBody as BabelClassBody,
  ClassProperty as BabelClassProperty,
  Identifier as BabelIdentifier,
  StringLiteral as BabelStringLiteral,
} from '@babel/types';

import type { ComponentMeta } from './types.js';

/**
 * Recursively extract the propsSchema/events value from
 * a babel AST node, converting it to a plain object.
 */
function extractObjectFromNode(
  node: BabelNode | undefined | null,
): Record<string, unknown> | undefined {
  if (!node) {
    return undefined;
  }

  // Handle ObjectExpression
  if (node.type === 'ObjectExpression') {
    const result: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (
        prop.type === 'ObjectProperty' &&
        prop.key.type === 'Identifier'
      ) {
        result[prop.key.name] = extractValue(prop.value);
      }
    }
    return result;
  }

  return undefined;
}

/**
 * Extract a simple value (string, number, boolean, array, or object)
 * from a babel AST node.
 */
function extractValue(node: BabelNode): unknown {
  switch (node.type) {
    case 'StringLiteral':
      return (node as BabelStringLiteral).value;
    case 'NumericLiteral':
      return node.value as number;
    case 'BooleanLiteral':
      return node.value as boolean;
    case 'NullLiteral':
      return null;
    case 'ArrayExpression':
      return node.elements.map((e) => extractValue(e as BabelNode));
    case 'ObjectExpression':
      return extractObjectFromNode(node);
    case 'Identifier':
      return (node as BabelIdentifier).name;
    default:
      return undefined;
  }
}

/**
 * Internal accumulator used during AST traversal.
 */
interface ScanState {
  /** Classes that extend GenicElement: className -> tag (from customElements.define) */
  classes: Map<string, string>;
  /** Static metadata per class: className -> { propsSchema?, events? } */
  metadata: Map<string, { propsSchema?: Record<string, unknown>; events?: Record<string, unknown> }>;
}

/**
 * Scan a TypeScript source file for GenicElement subclasses
 * and their registration via `customElements.define()`.
 *
 * Returns an array of ComponentMeta objects, one per discovered component.
 *
 * @param code — TypeScript source code
 * @returns discovered components (may be empty if no GenicElement subclasses found)
 */
export function scanComponentFile(code: string): ComponentMeta[] {
  const state: ScanState = {
    classes: new Map(),
    metadata: new Map(),
  };

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    for (const node of ast.program.body) {
      // 1. Find `class X extends GenicElement`
      if (
        node.type === 'ClassDeclaration' &&
        node.superClass
      ) {
        const cls = node as BabelClassDeclaration;
        const superClass = cls.superClass;

        if (!superClass) {
          continue;
        }

        if (
          (superClass.type === 'Identifier' &&
            (superClass as BabelIdentifier).name === 'GenicElement') ||
          (superClass.type === 'MemberExpression' &&
            ((superClass as unknown) as { property: BabelIdentifier }).property.name === 'GenicElement')
        ) {
          const className = cls.id?.name;
          if (className) {
            // Default tag: kebab-case of className prefixed with 'genui-'
            const defaultTag = `genui-${toKebabCase(className)}`;
            state.classes.set(className, defaultTag);

            // Extract static propsSchema and events
            const meta = extractStaticMetadata(
              cls.body as BabelClassBody,
            );
            if (meta) {
              state.metadata.set(className, meta);
            }
          }
        }
      }

      // 2. Find `customElements.define('tag-name', ClassRef)`
      if (node.type === 'ExpressionStatement') {
        const expr = (node as {
          expression: BabelCallExpression;
        }).expression;
        if (
          expr.type === 'CallExpression' &&
          expr.callee.type === 'MemberExpression' &&
          ((expr.callee.object as BabelIdentifier).type ===
            'Identifier' &&
            (expr.callee.object as BabelIdentifier).name ===
              'customElements') &&
          ((expr.callee.property as BabelIdentifier).type ===
            'Identifier' &&
            (expr.callee.property as BabelIdentifier).name ===
              'define')
        ) {
          const call = expr as BabelCallExpression;
          const args = call.arguments;
          if (args.length >= 2) {
            const tagArg = args[0] as BabelStringLiteral;
            const classArg = args[1] as BabelIdentifier;

            if (
              tagArg.type === 'StringLiteral' &&
              classArg.type === 'Identifier'
            ) {
              const className = classArg.name;
              const tag = tagArg.value;
              if (state.classes.has(className)) {
                state.classes.set(className, tag);
              }
            }
          }
        }
      }
    }

    // Build result
    const result: ComponentMeta[] = [];
    for (const [className, tag] of state.classes) {
      const meta = state.metadata.get(className);
      result.push({
        className,
        tag,
        file: '', // filled in by the caller
        ...(meta?.propsSchema ? { propsSchema: meta.propsSchema } : {}),
        ...(meta?.events ? { events: meta.events } : {}),
      });
    }

    return result;
  } catch {
    // If parsing fails, return empty — the file may not be TypeScript
    return [];
  }
}

/**
 * Extract static `propsSchema` and `events` from a class body.
 */
function extractStaticMetadata(
  body: BabelClassBody,
): {
  propsSchema?: Record<string, unknown>;
  events?: Record<string, unknown>;
} | null {
  let propsSchema: Record<string, unknown> | undefined;
  let events: Record<string, unknown> | undefined;

  for (const item of body.body) {
    if (
      item.type === 'ClassProperty' &&
      (item as BabelClassProperty).static === true
    ) {
      const prop = item as BabelClassProperty;
      const key = prop.key as BabelIdentifier;

      if (
        key.type === 'Identifier' &&
        key.name === 'propsSchema' &&
        prop.value
      ) {
        propsSchema = extractObjectFromNode(prop.value);
      }

      if (
        key.type === 'Identifier' &&
        key.name === 'events' &&
        prop.value
      ) {
        events = extractObjectFromNode(prop.value);
      }
    }
  }

  if (!propsSchema && !events) {
    return null;
  }

  return {
    ...(propsSchema ? { propsSchema } : {}),
    ...(events ? { events } : {}),
  };
}

/**
 * Convert a PascalCase string to kebab-case.
 *
 * @example
 *   toKebabCase('DataTable') // 'data-table'
 *   toKebabCase('MyCustomElement') // 'my-custom-element'
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, (_, upper) => `-${upper.toLowerCase()}`)
    .replace(/^-/, '');
}
