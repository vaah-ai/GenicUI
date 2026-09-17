<template>
  <section class="shipment-tracker" :data-component="ShipmentTracker" data-test="shipment-tracker">
    <h3 class="shipment-tracker-title">Shipment timeline</h3>

    <Timeline
      :value="normalizedEvents"
      align="left"
      class="shipment-tracker-timeline"
      data-test="shipment-tracker-timeline"
    >
      <template #marker="{ item }">
        <span class="shipment-tracker-marker" :data-status="item.status">
          <span aria-hidden="true">{{ markerGlyph(item.status) }}</span>
        </span>
      </template>

      <template #content="{ item }">
        <div class="shipment-tracker-event" :data-test="`shipment-tracker-event-${item.status}`">
          <div class="shipment-tracker-event-status">{{ statusLabel(item.status) }}</div>
          <time v-if="item.at" class="shipment-tracker-event-time" :datetime="item.at">
            {{ formatTimestamp(item.at) }}
          </time>
          <div v-if="item.carrier || item.tracking" class="shipment-tracker-event-meta">
            <span v-if="item.carrier" class="shipment-tracker-event-meta-row">
              <strong>Carrier:</strong> {{ item.carrier }}
            </span>
            <span v-if="item.tracking" class="shipment-tracker-event-meta-row">
              <strong>Tracking:</strong>
              <span class="shipment-tracker-event-tracking">{{ item.tracking }}</span>
            </span>
          </div>
        </div>
      </template>
    </Timeline>

    <div v-if="normalizedEvents.length === 0" class="shipment-tracker-empty">
      No shipment events yet.
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * ShipmentTracker — Step 8 shipment timeline.
 *
 * EJG-COMP-5: renders the `Orders Statuses Logics` transitions
 * (placed → paid → packed → shipped → delivered) with timestamp +
 * carrier + tracking number per transition.
 *
 * Pure props-in component. No events emitted.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-5} — Orders Statuses Logics timeline with carrier + tracking
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Timeline from 'primevue/timeline';

type ShipmentStatus = 'placed' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface ShipmentEvent {
  status: ShipmentStatus | string;
  at?: string;
  carrier?: string;
  tracking?: string;
}

interface Props {
  events: readonly ShipmentEvent[];
}

const props = defineProps<Props>();

const ShipmentTracker = 'ShipmentTracker';

const normalizedEvents = computed<readonly ShipmentEvent[]>(() =>
  Array.isArray(props.events) ? props.events : [],
);

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function getFormatter(locale: string): Intl.DateTimeFormat {
  const existing = formatterCache.get(locale);
  if (existing) return existing;
  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  formatterCache.set(locale, fmt);
  return fmt;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return getFormatter('en-US').format(d);
  } catch {
    return iso;
  }
}

function statusLabel(status: string): string {
  const known: ReadonlyArray<ShipmentStatus> = ['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];
  if ((known as readonly string[]).includes(status)) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  return status;
}

function markerGlyph(status: string): string {
  switch (status) {
    case 'placed':
      return '◉';
    case 'paid':
      return '$';
    case 'packed':
      return '◧';
    case 'shipped':
      return '✈';
    case 'delivered':
      return '✓';
    case 'cancelled':
    case 'returned':
      return '×';
    default:
      return '·';
  }
}
</script>

<style scoped>
.shipment-tracker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.shipment-tracker-title {
  margin: 0;
  font-size: 1rem;
  color: var(--gp-text);
}

.shipment-tracker-timeline {
  width: 100%;
}

.shipment-tracker-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid var(--gp-border);
  background: var(--gp-surface);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--gp-text-muted);
}

.shipment-tracker-marker[data-status='placed'] { border-color: var(--gp-info, #39c); color: var(--gp-info, #39c); }
.shipment-tracker-marker[data-status='paid'] { border-color: var(--gp-success, #2a7); color: var(--gp-success, #2a7); }
.shipment-tracker-marker[data-status='packed'] { border-color: var(--gp-warn, #c84); color: var(--gp-warn, #c84); }
.shipment-tracker-marker[data-status='shipped'] { border-color: var(--gp-accent); color: var(--gp-accent); }
.shipment-tracker-marker[data-status='delivered'] { border-color: var(--gp-success, #2a7); background: var(--gp-success, #2a7); color: #fff; }
.shipment-tracker-marker[data-status='cancelled'],
.shipment-tracker-marker[data-status='returned'] { border-color: var(--gp-danger, #d04); color: var(--gp-danger, #d04); }

.shipment-tracker-event {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shipment-tracker-event-status {
  font-weight: 600;
  color: var(--gp-text);
}

.shipment-tracker-event-time {
  font-size: 0.8125rem;
  color: var(--gp-text-muted);
}

.shipment-tracker-event-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.875rem;
  color: var(--gp-text-secondary);
}

.shipment-tracker-event-tracking {
  font-family: var(--gp-font-mono, ui-monospace, monospace);
  font-feature-settings: 'tnum' 1;
}

.shipment-tracker-empty {
  padding: 12px 0;
  color: var(--gp-text-muted);
}
</style>