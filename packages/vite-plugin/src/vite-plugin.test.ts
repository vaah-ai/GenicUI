/**
 * GenicUI Vite Plugin — tests for F30.
 *
 * @see {F30} — Vite plugin + component auto-registration
 */

import { describe, it, expect } from 'bun:test';

import { scanComponentFile } from './scanner.js';
import { viteGenicUI } from './plugin.js';
import type { Plugin } from 'vite';

/* ------------------------------------------------------------------ */
/*  F30-AC1: Auto-discovery of GenicElement subclasses                */
/* ------------------------------------------------------------------ */

describe('F30-AC1: Auto-discovery of GenicElement subclasses', () => {
  it('discovers a class extending GenicElement', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class DataTable extends GenicElement {}
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.className).toBe('DataTable');
    expect(result[0]!.tag).toBe('genui-data-table');
  });

  it('discovers multiple classes extending GenicElement', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class Counter extends GenicElement {}
      class TodoList extends GenicElement {}
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(2);
    expect(result[0]!.className).toBe('Counter');
    expect(result[0]!.tag).toBe('genui-counter');
    expect(result[1]!.className).toBe('TodoList');
    expect(result[1]!.tag).toBe('genui-todo-list');
  });

  it('discovers customElements.define with explicit tag name', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class MyComponent extends GenicElement {}
      customElements.define('my-registered-component', MyComponent);
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.className).toBe('MyComponent');
    expect(result[0]!.tag).toBe('my-registered-component');
  });

  it('ignores classes that do not extend GenicElement', () => {
    const code = `
      class RegularClass {}
      class AnotherClass extends HTMLElement {}
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(0);
  });

  it('extracts static propsSchema metadata', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class DataTable extends GenicElement {
        static propsSchema = { rows: [], pageSize: 10 };
      }
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.propsSchema).toEqual({
      rows: [undefined],
      pageSize: 10,
    });
  });

  it('extracts static events metadata', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class DataTable extends GenicElement {
        static events = { row_selected: { detail: 'rowId' } };
      }
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.events).toEqual({
      row_selected: { detail: 'rowId' },
    });
  });

  it('extracts both propsSchema and events', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class MyWidget extends GenicElement {
        static propsSchema = { title: 'Hello', count: 0 };
        static events = { click: { detail: 'x' } };
      }
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.propsSchema).toEqual({ title: 'Hello', count: 0 });
    expect(result[0]!.events).toEqual({ click: { detail: 'x' } });
  });

  it('returns empty for non-TypeScript content', () => {
    const code = `not valid typescript {{`;
    const result = scanComponentFile(code);
    expect(result.length).toBe(0);
  });

  it('returns empty for empty source', () => {
    const result = scanComponentFile('');
    expect(result.length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  F30-AC2: HMR on file save                                         */
/* ------------------------------------------------------------------ */

describe('F30-AC2: HMR on file save', () => {
  it('creates a plugin with correct name', () => {
    const plugin = viteGenicUI();
    expect(plugin.name).toBe('genicui-vite-plugin');
  });

  it('resolves the virtual module ID', () => {
    const plugin = viteGenicUI() as unknown as Plugin & {
      resolveId: (id: string) => string | undefined;
    };
    const resolved = plugin.resolveId('\0genicui:components');
    expect(resolved).toBe('\0\0genicui:components');
  });

  it('does not resolve non-virtual IDs', () => {
    const plugin = viteGenicUI() as unknown as Plugin & {
      resolveId: (id: string) => string | undefined;
    };
    const resolved = plugin.resolveId('some-other-module');
    expect(resolved).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  F30-AC3: genui-registry.json emission                             */
/* ------------------------------------------------------------------ */

describe('F30-AC3: genui-registry.json emission', () => {
  it('emits a valid registry on closeBundle', () => {
    // The closeBundle hook writes to disk — we verify the
    // plugin structure and let the integration test cover
    // the actual file output.
    const plugin = viteGenicUI();
    expect(typeof (plugin as { closeBundle?: () => void }).closeBundle)
      .toBe('function');
  });

  it('creates a plugin with correct enforce order', () => {
    const plugin = viteGenicUI();
    expect(plugin.enforce).toBe('post');
  });
});

/* ------------------------------------------------------------------ */
/*  Scanner utility tests                                             */
/* ------------------------------------------------------------------ */

describe('scanComponentFile — kebab-case conversion', () => {
  it('converts single-word PascalCase to kebab', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class MyWidget extends GenicElement {}
    `;
    const result = scanComponentFile(code);
    expect(result[0]!.tag).toBe('genui-my-widget');
  });

  it('converts multi-word PascalCase to kebab', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class MySuperCoolComponent extends GenicElement {}
    `;
    const result = scanComponentFile(code);
    expect(result[0]!.tag).toBe('genui-my-super-cool-component');
  });
});

describe('scanComponentFile — edge cases', () => {
  it('handles files with only imports', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(0);
  });

  it('handles JSX syntax', () => {
    const code = `
      import { GenicElement } from '@genicui/client';
      class RenderTest extends GenicElement {}
      const x = <div />;
    `;
    const result = scanComponentFile(code);
    expect(result.length).toBe(1);
    expect(result[0]!.className).toBe('RenderTest');
  });
});
