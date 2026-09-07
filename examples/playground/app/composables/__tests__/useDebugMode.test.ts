/**
 * useDebugMode tests — F47-AC7 acceptance coverage for the chat
 * column debug toggle.
 *
 * @see {F47-AC7} — Chat column debug toggle (M5-T7-05)
 */

import { describe, it, expect, beforeEach } from 'bun:test';

import {
  useDebugMode,
  setDebug,
  __parseQuery,
  __test_isDebug,
  __test_setQuery,
  __setUrlRewriter,
} from '../useDebugMode.ts';

describe('useDebugMode', () => {
  beforeEach(() => {
    // Reset between cases so URL rewriter + flag don't leak.
    __test_setQuery('');
    __setUrlRewriter(null);
  });

  describe('query parsing', () => {
    it('parses an empty query string to {}', () => {
      expect(__parseQuery('')).toEqual({});
      expect(__parseQuery('?')).toEqual({});
    });

    it('parses a single key=value pair', () => {
      expect(__parseQuery('debug=off')).toEqual({ debug: 'off' });
    });

    it('parses multiple pairs and tolerates a leading ?', () => {
      expect(__parseQuery('?debug=off&foo=bar')).toEqual({
        debug: 'off',
        foo: 'bar',
      });
    });

    it('decodes percent-encoded values', () => {
      expect(__parseQuery('debug=off&name=hello%20world')).toEqual({
        debug: 'off',
        name: 'hello world',
      });
    });

    it('treats a bare key (no `=`) as an empty-string value', () => {
      expect(__parseQuery('debug')).toEqual({ debug: '' });
    });
  });

  describe('default state', () => {
    it('defaults to ON (debug=true) when no query param is present', () => {
      __test_setQuery('');
      const { isDebug } = useDebugMode();
      expect(isDebug.value).toBe(true);
    });
  });

  describe('explicit query values', () => {
    it('returns false when ?debug=off', () => {
      __test_setQuery('off');
      const { isDebug } = useDebugMode();
      expect(isDebug.value).toBe(false);
    });

    it('returns true for any non-"off" value (?debug=on)', () => {
      __test_setQuery('on');
      const { isDebug } = useDebugMode();
      expect(isDebug.value).toBe(true);
    });

    it('returns true for ?debug=true', () => {
      __test_setQuery('true');
      expect(__test_isDebug()).toBe(true);
    });

    it('returns true for ?debug=1', () => {
      __test_setQuery('1');
      expect(__test_isDebug()).toBe(true);
    });

    it('returns true for an empty value (?debug=)', () => {
      __test_setQuery('');
      expect(__test_isDebug()).toBe(true);
    });
  });

  describe('setDebug + URL rewriter', () => {
    it('setDebug(false) sets the flag and invokes the rewriter with off=true', () => {
      const calls: boolean[] = [];
      __setUrlRewriter((off) => {
        calls.push(off);
      });
      setDebug(false);
      expect(__test_isDebug()).toBe(false);
      expect(calls).toEqual([true]);
    });

    it('setDebug(true) sets the flag and invokes the rewriter with off=false', () => {
      // Start in OFF state.
      __test_setQuery('off');
      const calls: boolean[] = [];
      __setUrlRewriter((off) => {
        calls.push(off);
      });
      setDebug(true);
      expect(__test_isDebug()).toBe(true);
      expect(calls).toEqual([false]);
    });

    it('setDebug works without a rewriter registered (no-op for URL side)', () => {
      __setUrlRewriter(null);
      // Should not throw.
      setDebug(false);
      expect(__test_isDebug()).toBe(false);
      setDebug(true);
      expect(__test_isDebug()).toBe(true);
    });

    it('isDebug returned from useDebugMode() reflects setDebug() flips', () => {
      const ref = useDebugMode();
      expect(ref.isDebug.value).toBe(true);
      ref.setDebug(false);
      expect(ref.isDebug.value).toBe(false);
      ref.setDebug(true);
      expect(ref.isDebug.value).toBe(true);
    });
  });
});
