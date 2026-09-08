/**
 * Tests for the shared mounted-component resolver + the
 * `shouldRenderCleanComponentPreview` predicate.
 *
 * F47-AC7 (clean-view refactor): the resolver is the single source
 * of truth for "which mounted component corresponds to this tool
 * call". Both `ChatHistory.vue` (clean-mode rendered preview) and
 * `ToolCallAccordion.vue` (debug-mode Props disclosure) import it,
 * so the lookup rules are unit-tested without rendering either
 * component.
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

import { describe, it, expect } from 'bun:test';
import { ref, type Ref } from 'vue';

import {
  resolveMountedComponent,
  isRenderComponentCall,
  type MountedComponentEntry,
  type RenderComponentCallEntry,
} from '../resolve-mounted-component.ts';
import { shouldRenderCleanComponentPreview } from '../tool-call-gating.ts';

describe('isRenderComponentCall', () => {
  it('returns true for the bare name', () => {
    expect(isRenderComponentCall('render_component')).toBe(true);
  });

  it('returns true for MCP-prefixed names', () => {
    expect(isRenderComponentCall('mcp__genicui__render_component')).toBe(true);
    expect(isRenderComponentCall('mcp__my_server__render_component')).toBe(true);
    expect(isRenderComponentCall('mcp__multi_word_server__render_component')).toBe(true);
  });

  it('returns false for unrelated tool names', () => {
    expect(isRenderComponentCall('Read')).toBe(false);
    expect(isRenderComponentCall('Bash')).toBe(false);
    expect(isRenderComponentCall('mcp__genicui__find_ui_component')).toBe(false);
  });

  it('returns false for empty / non-string input', () => {
    expect(isRenderComponentCall('')).toBe(false);
    expect(isRenderComponentCall('   ')).toBe(false);
  });
});

describe('resolveMountedComponent', () => {
  function makeComponentsRef(initial: MountedComponentEntry[] = []): Ref<MountedComponentEntry[]> {
    return ref(initial);
  }

  function makeFindComponent(ref_: Ref<MountedComponentEntry[]>) {
    return (id: string) => ref_.value.find((c) => c.componentId === id);
  }

  it('returns undefined for non-render_component tool calls', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'Read',
      input: { componentName: 'CityPicker' },
    };
    expect(resolveMountedComponent(entry, components, findComponent)).toBeUndefined();
  });

  it('resolves by explicit componentId when present', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: { foo: 1 } },
      { componentId: 'C2', name: 'WeatherCard', props: { bar: 2 } },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: { componentId: 'C2' },
    };
    const hit = resolveMountedComponent(entry, components, findComponent);
    expect(hit?.componentId).toBe('C2');
    expect(hit?.name).toBe('WeatherCard');
  });

  it('falls through to name match when explicit componentId is unknown', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: { componentId: 'unknown', componentName: 'CityPicker' },
    };
    const hit = resolveMountedComponent(entry, components, findComponent);
    expect(hit?.name).toBe('CityPicker');
  });

  it('resolves by componentName when no componentId is supplied', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: null },
      { componentId: 'C2', name: 'CityPicker', props: { q: 'Paris' } },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: { componentName: 'CityPicker' },
    };
    // No idempotencyKey → most-recent fallback.
    const hit = resolveMountedComponent(entry, components, findComponent);
    expect(hit?.componentId).toBe('C2');
  });

  it('also reads `name` field as a fallback for componentName', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'WeatherCard', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: { name: 'WeatherCard' },
    };
    const hit = resolveMountedComponent(entry, components, findComponent);
    expect(hit?.name).toBe('WeatherCard');
  });

  it('prefers the entry with populated props when idempotencyKey is supplied', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: null },
      { componentId: 'C2', name: 'CityPicker', props: { q: 'Berlin' } },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: {
        componentName: 'CityPicker',
        idempotencyKey: 'idem-123',
      },
    };
    const hit = resolveMountedComponent(entry, components, findComponent);
    expect(hit?.componentId).toBe('C2');
  });

  it('returns undefined when no matching mounted component exists', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'render_component',
      input: { componentName: 'WeatherCard' },
    };
    expect(resolveMountedComponent(entry, components, findComponent)).toBeUndefined();
  });

  it('returns undefined for malformed input (null / non-object)', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    expect(resolveMountedComponent(
      { name: 'render_component', input: null },
      components,
      findComponent,
    )).toBeUndefined();
    expect(resolveMountedComponent(
      { name: 'render_component', input: 'oops' },
      components,
      findComponent,
    )).toBeUndefined();
  });

  it('accepts MCP-prefixed render_component names', () => {
    const components = makeComponentsRef([
      { componentId: 'C1', name: 'CityPicker', props: {} },
    ]);
    const findComponent = makeFindComponent(components);
    const entry: RenderComponentCallEntry = {
      name: 'mcp__genicui__render_component',
      input: { componentName: 'CityPicker' },
    };
    expect(resolveMountedComponent(entry, components, findComponent)?.name).toBe('CityPicker');
  });
});

describe('shouldRenderCleanComponentPreview (F47-AC7)', () => {
  it('renders when the call is render_component and the mount frame has landed', () => {
    expect(shouldRenderCleanComponentPreview(true, true)).toBe(true);
  });

  it('does not render when the tool call is not render_component', () => {
    expect(shouldRenderCleanComponentPreview(false, true)).toBe(false);
  });

  it('does not render when the mount frame is still in flight', () => {
    expect(shouldRenderCleanComponentPreview(true, false)).toBe(false);
  });

  it('does not render when neither condition is met', () => {
    expect(shouldRenderCleanComponentPreview(false, false)).toBe(false);
  });
});
