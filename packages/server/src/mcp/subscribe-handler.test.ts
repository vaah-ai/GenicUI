/**
 * Tests for subscribe_to_events handler (F18).
 *
 * @module @genicui/server/mcp/subscribe-handler.test
 * @see {F18} — subscribe_to_events tool
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  EventSubscriptionManager,
  type ComponentEvent,
} from './subscribe-handler.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createManager(): EventSubscriptionManager {
  return new EventSubscriptionManager();
}

function createEvent(overrides: Partial<ComponentEvent> = {}): ComponentEvent {
  return {
    componentId: 'dt-test-001',
    action: 'row_selected',
    detail: { rowId: '1' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// F18 — subscribe_to_events
// ---------------------------------------------------------------------------

describe('EventSubscriptionManager', () => {
  let mgr: EventSubscriptionManager;

  beforeEach(() => {
    mgr = createManager();
  });

  // -----------------------------------------------------------------
  // Subscribe
  // -----------------------------------------------------------------

  describe('subscribe()', () => {
    it('returns a subscriptionId', () => {
      const result = mgr.subscribe({ componentId: 'dt-1' });
      expect(result.subscriptionId).toBeDefined();
      expect(result.subscriptionId).toMatch(/^sub-[0-9a-f]{6}$/);
    });

    it('returns the componentId if provided', () => {
      const result = mgr.subscribe({ componentId: 'dt-1' });
      expect(result.componentId).toBe('dt-1');
    });

    it('returns the actions if provided', () => {
      const result = mgr.subscribe({ actions: ['row_selected', 'sort_change'] });
      expect(result.actions).toEqual(['row_selected', 'sort_change']);
    });

    it('creates an active subscription', () => {
      mgr.subscribe({ componentId: 'dt-1' });
      expect(mgr.activeCount).toBe(1);
    });

    it('supports expiresAt override', () => {
      const future = new Date(Date.now() + 10000).toISOString();
      mgr.subscribe({ expiresAt: future });
      expect(mgr.activeCount).toBe(1);
    });

    it('supports all options together', () => {
      const result = mgr.subscribe({
        componentId: 'dt-1',
        actions: ['row_selected'],
        sessionId: 'sess-abc',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      });
      expect(result.subscriptionId).toBeDefined();
      expect(result.componentId).toBe('dt-1');
      expect(result.actions).toEqual(['row_selected']);
    });
  });

  // -----------------------------------------------------------------
  // Unsubscribe — F18-AC2
  // -----------------------------------------------------------------

  describe('unsubscribe() — F18-AC2', () => {
    it('removes an existing subscription', () => {
      const { subscriptionId } = mgr.subscribe({ componentId: 'dt-1' });
      expect(mgr.activeCount).toBe(1);

      const result = mgr.unsubscribe(subscriptionId);
      expect(result.removed).toBe(true);
      expect(mgr.activeCount).toBe(0);
    });

    it('returns removed: false for non-existent subscription', () => {
      const result = mgr.unsubscribe('sub-000000');
      expect(result.removed).toBe(false);
    });

    it('stops event forwarding after unsubscribe — F18-AC2', () => {
      const { subscriptionId } = mgr.subscribe({ componentId: 'dt-1' });
      const event = createEvent({ componentId: 'dt-1' });

      // Before unsubscribe — matches
      let matches = mgr.match(event);
      expect(matches.length).toBe(1);
      expect(matches[0]!.subscriptionId).toBe(subscriptionId);

      // Unsubscribe
      mgr.unsubscribe(subscriptionId);

      // After unsubscribe — no matches
      matches = mgr.match(event);
      expect(matches.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // F18-AC1 — Filter by events
  // -----------------------------------------------------------------

  describe('match() — F18-AC1 filter scope', () => {
    it('only forwards matching action events — F18-AC1', () => {
      // Subscribe to only "row_selected"
      mgr.subscribe({
        componentId: 'dt-1',
        actions: ['row_selected'],
      });

      // Emit "row_selected" — should match
      const rowClick = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      let matches = mgr.match(rowClick);
      expect(matches.length).toBe(1);

      // Emit "sort_change" — should NOT match
      const sortChange = createEvent({ componentId: 'dt-1', action: 'sort_change' });
      matches = mgr.match(sortChange);
      expect(matches.length).toBe(0);
    });

    it('forwards all events when no actions filter', () => {
      mgr.subscribe({ componentId: 'dt-1' });

      const rowClick = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      const sortChange = createEvent({ componentId: 'dt-1', action: 'sort_change' });
      const pageChange = createEvent({ componentId: 'dt-1', action: 'page_change' });

      expect(mgr.match(rowClick).length).toBe(1);
      expect(mgr.match(sortChange).length).toBe(1);
      expect(mgr.match(pageChange).length).toBe(1);
    });

    it('filters by componentId', () => {
      mgr.subscribe({ componentId: 'dt-1' });

      // Different component — no match
      const other = createEvent({ componentId: 'dt-2', action: 'row_selected' });
      expect(mgr.match(other).length).toBe(0);

      // Same component — match
      const same = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      expect(mgr.match(same).length).toBe(1);
    });

    it('matches all components when no componentId filter', () => {
      mgr.subscribe({ actions: ['row_selected'] });

      const dt1 = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      const dt2 = createEvent({ componentId: 'dt-2', action: 'row_selected' });
      const dt3 = createEvent({ componentId: 'dt-3', action: 'row_selected' });

      expect(mgr.match(dt1).length).toBe(1);
      expect(mgr.match(dt2).length).toBe(1);
      expect(mgr.match(dt3).length).toBe(1);
    });

    it('multiple subscriptions match the same event', () => {
      mgr.subscribe({ componentId: 'dt-1', actions: ['row_selected'] });
      mgr.subscribe({ componentId: 'dt-1' }); // all events for dt-1

      const event = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      const matches = mgr.match(event);
      expect(matches.length).toBe(2);
    });

    it('returns matched events with subscriptionIds', () => {
      const { subscriptionId: sub1 } = mgr.subscribe({ componentId: 'dt-1' });

      const event = createEvent({ componentId: 'dt-1', action: 'row_selected' });
      const matches = mgr.match(event);

      expect(matches.length).toBe(1);
      expect(matches[0]!.subscriptionId).toBe(sub1);
      expect(matches[0]!.event.componentId).toBe('dt-1');
      expect(matches[0]!.event.action).toBe('row_selected');
    });
  });

  // -----------------------------------------------------------------
  // F18-AC3 — Component unmount → auto-cleanup
  // -----------------------------------------------------------------

  describe('onComponentUnmount() — F18-AC3', () => {
    it('removes subscriptions for the unmounted component', () => {
      mgr.subscribe({ componentId: 'dt-1' });
      mgr.subscribe({ componentId: 'dt-1' });
      mgr.subscribe({ componentId: 'dt-2' });

      expect(mgr.activeCount).toBe(3);

      const removed = mgr.onComponentUnmount('dt-1');
      expect(removed.length).toBe(2);
      expect(mgr.activeCount).toBe(1);
    });

    it('returns empty array when no subscriptions match', () => {
      mgr.subscribe({ componentId: 'dt-1' });
      const removed = mgr.onComponentUnmount('dt-999');
      expect(removed.length).toBe(0);
      expect(mgr.activeCount).toBe(1);
    });

    it('unmounted component no longer receives events — F18-AC3', () => {
      mgr.subscribe({ componentId: 'dt-1' });

      // Before unmount — matches
      const event = createEvent({ componentId: 'dt-1' });
      let matches = mgr.match(event);
      expect(matches.length).toBe(1);

      // Unmount
      mgr.onComponentUnmount('dt-1');

      // After unmount — no matches
      matches = mgr.match(event);
      expect(matches.length).toBe(0);
    });

    it('does not remove subscriptions without a componentId filter', () => {
      mgr.subscribe({ actions: ['row_selected'] }); // no componentId

      expect(mgr.activeCount).toBe(1);
      const removed = mgr.onComponentUnmount('dt-1');
      expect(removed.length).toBe(0);
      expect(mgr.activeCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------
  // TTL / Expiration
  // -----------------------------------------------------------------

  describe('TTL & expiration', () => {
    it('expires subscriptions past their TTL', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      mgr.subscribe({ expiresAt: past });
      expect(mgr.activeCount).toBe(0);
    });

    it('does not expire subscriptions within TTL', () => {
      const future = new Date(Date.now() + 100000).toISOString();
      mgr.subscribe({ expiresAt: future });
      expect(mgr.activeCount).toBe(1);
    });

    it('cleanupExpired removes only expired subscriptions', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const future = new Date(Date.now() + 100000).toISOString();

      // Create subscriptions without triggering auto-cleanup in subscribe()
      // by setting future expiresAt first, then expired ones (we manually
      // create them via the manager)
      mgr.subscribe({ expiresAt: future });
      mgr.subscribe({ expiresAt: future });

      // Manually verify cleanupExpired works on expired subs
      // The subscribe() method calls cleanupExpired before creating,
      // so expired subs are removed on the next subscribe call.
      // To test this directly, we create expired subs and count.
      const allSubs = mgr.getAll();
      expect(allSubs.length).toBe(2);

      // Now create a subscription with a past expiresAt
      // subscribe() auto-cleans, so it will be removed immediately
      mgr.subscribe({ expiresAt: past });

      // The expired subscription was cleaned up during subscribe()
      // Only the 3 future subscriptions remain (2 existing + 1 new)
      // But the past expiresAt is immediately expired
      expect(mgr.activeCount).toBe(2);
    });

    it('expired subscriptions do not match events', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      mgr.subscribe({ componentId: 'dt-1', expiresAt: past });

      const event = createEvent({ componentId: 'dt-1' });
      expect(mgr.match(event).length).toBe(0);
    });

    it('subscribe() cleans up expired subscriptions', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      mgr.subscribe({ expiresAt: past });

      // Create a new subscription — should cleanup the expired one first
      mgr.subscribe({ componentId: 'dt-1' });
      expect(mgr.activeCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------
  // Lookup & Clear
  // -----------------------------------------------------------------

  describe('get() & getAll()', () => {
    it('returns undefined for non-existent subscription', () => {
      expect(mgr.get('sub-000000')).toBeUndefined();
    });

    it('returns the subscription for a valid ID', () => {
      const { subscriptionId } = mgr.subscribe({ componentId: 'dt-1' });
      const sub = mgr.get(subscriptionId);
      expect(sub).toBeDefined();
      expect(sub!.subscriptionId).toBe(subscriptionId);
      expect(sub!.componentId).toBe('dt-1');
    });

    it('getAll returns all subscriptions', () => {
      mgr.subscribe({ componentId: 'dt-1' });
      mgr.subscribe({ componentId: 'dt-2' });
      expect(mgr.getAll().length).toBe(2);
    });

    it('clear removes all subscriptions', () => {
      mgr.subscribe({ componentId: 'dt-1' });
      mgr.subscribe({ componentId: 'dt-2' });
      mgr.clear();
      expect(mgr.activeCount).toBe(0);
      expect(mgr.getAll().length).toBe(0);
    });
  });
});
