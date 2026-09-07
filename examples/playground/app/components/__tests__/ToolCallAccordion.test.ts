/**
 * ToolCallAccordion gating tests — F47-AC7 acceptance coverage.
 *
 * `ToolCallAccordion.vue` binds four `v-if` clauses (component
 * Props accordion, tool Input, tool Result, tool Error) to pure
 * predicates imported from `./tool-call-gating.ts`. This test
 * exercises those predicates directly so the gating is verified
 * without a DOM harness. The component template uses
 * `showComponentProps` / `showToolInput` / `showToolResult` /
 * `showToolError` computed bindings — if you change the predicate
 * signatures, update both this file and the component.
 *
 * Also covers `formatCleanToolLabel`, which `ChatHistory.vue` uses
 * to render a compact one-line status pill in place of the full
 * `ToolCallAccordion` when the debug toggle is OFF. The pill is
 * shown alongside the live `<RenderedComponent>` preview for
 * `render_component` calls so the user still sees the widget
 * they're interacting with in clean mode.
 *
 * F47-AC7 responsibility split:
 *   - ToolCallAccordion owns the *diagnostic* surfaces only.
 *   - The live component preview now lives in `ChatHistory.vue`,
 *     not in this component. Its resolution is shared via
 *     `./resolve-mounted-component.ts` (see
 *     `resolve-mounted-component.test.ts`).
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

import { describe, it, expect } from 'bun:test';

import {
  shouldRenderComponentProps,
  shouldRenderToolInput,
  shouldRenderToolResult,
  shouldRenderToolError,
  formatCleanToolLabel,
} from '../tool-call-gating.ts';

describe('ToolCallAccordion gating', () => {
  describe('F47-AC7: debug-mode gates PROPS / INPUT / RESULT blocks', () => {
    it('renders the component Props accordion when isDebug=true', () => {
      expect(shouldRenderComponentProps(true)).toBe(true);
    });

    it('hides the component Props accordion when isDebug=false', () => {
      expect(shouldRenderComponentProps(false)).toBe(false);
    });

    it('renders the tool Input block when isDebug=true', () => {
      expect(shouldRenderToolInput(true)).toBe(true);
    });

    it('hides the tool Input block when isDebug=false', () => {
      expect(shouldRenderToolInput(false)).toBe(false);
    });

    it('renders the tool Result block when isDebug=true, hasResult=true, !isRenderComponentCall', () => {
      expect(shouldRenderToolResult(true, true, false)).toBe(true);
    });

    it('hides the tool Result block when isDebug=false (even with a result)', () => {
      expect(shouldRenderToolResult(false, true, false)).toBe(false);
    });

    it('hides the tool Result block for render_component calls (live preview takes its place)', () => {
      expect(shouldRenderToolResult(true, true, true)).toBe(false);
    });

    it('hides the tool Result block when there is no result', () => {
      expect(shouldRenderToolResult(true, false, false)).toBe(false);
    });
  });

  describe('Error block stays visible even in clean mode', () => {
    it('renders when status="error" and an error message is present', () => {
      expect(shouldRenderToolError(true, true)).toBe(true);
    });

    it('hides when status="error" but no error message is set', () => {
      expect(shouldRenderToolError(true, false)).toBe(false);
    });

    it('hides when status is not "error" even with an error message', () => {
      expect(shouldRenderToolError(false, true)).toBe(false);
    });

    it('hides when neither status nor message indicates an error', () => {
      expect(shouldRenderToolError(false, false)).toBe(false);
    });
  });

  describe('F47-AC7 (clean-view): formatCleanToolLabel for ChatHistory pills', () => {
    it('renders a → arrow for running tool calls', () => {
      expect(formatCleanToolLabel('render_component', 'running')).toBe(
        '→ render_component',
      );
    });

    it('renders a ✓ check for done tool calls', () => {
      expect(formatCleanToolLabel('render_component', 'done')).toBe(
        '✓ render_component',
      );
    });

    it('renders a × cross for error tool calls', () => {
      expect(formatCleanToolLabel('render_component', 'error')).toBe(
        '× render_component',
      );
    });

    it('passes through MCP-prefixed names verbatim', () => {
      expect(
        formatCleanToolLabel('mcp__genicui__render_component', 'done'),
      ).toBe('✓ mcp__genicui__render_component');
    });

    it('passes through non-render tool names (Read, Bash, etc.)', () => {
      expect(formatCleanToolLabel('Read', 'done')).toBe('✓ Read');
      expect(formatCleanToolLabel('Bash', 'error')).toBe('× Bash');
    });

    it('falls back to "tool call" when name is empty', () => {
      expect(formatCleanToolLabel('', 'done')).toBe('✓ tool call');
      expect(formatCleanToolLabel('   ', 'done')).toBe('✓ tool call');
    });
  });
});
