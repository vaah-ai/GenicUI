<template>
  <section class="orders-table" aria-labelledby="orders-table-heading">
    <header class="orders-table-header">
      <h2 id="orders-table-heading">Orders</h2>
      <p class="orders-table-subtitle">
        {{ orders.length }} order<span v-if="orders.length !== 1">s</span>
      </p>
    </header>

    <DataTable
      :value="orders"
      :paginator="orders.length > paginatorThreshold"
      :rows="paginatorRows"
      :rows-per-page-options="[5, 10, 20]"
      striped-rows
      sort-mode="multiple"
      removable-sort
      :loading="loading"
      data-key="id"
      class="orders-table-grid"
    >
      <template #empty>
        <p class="orders-table-empty">No orders to display.</p>
      </template>

      <template #loading>
        <p class="orders-table-empty">Loading orders…</p>
      </template>

      <Column field="id" header="Order #" sortable>
        <template #body="{ data }">
          <span class="orders-table-mono">#{{ data.id }}</span>
        </template>
      </Column>

      <Column field="customer" header="Customer" sortable />

      <Column field="placedAt" header="Date" sortable>
        <template #body="{ data }">
          <time :datetime="data.placedAt">{{ formatDate(data.placedAt) }}</time>
        </template>
      </Column>

      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.status"
            :severity="statusSeverity(data.status)"
            class="orders-table-status"
          />
        </template>
      </Column>

      <Column field="items" header="Items" sortable>
        <template #body="{ data }">
          {{ data.items }}
        </template>
      </Column>

      <Column field="total" header="Total" sortable>
        <template #body="{ data }">
          <span class="orders-table-mono">{{ formatCurrency(data.total) }}</span>
        </template>
      </Column>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
/**
 * OrdersTable — PrimeVue DataTable populated with mock orders.
 *
 * Self-contained demo for the playground: data is hardcoded so the
 * component renders without any backend wiring. To swap in a real
 * source, replace the `useOrders` composable call (or `orders` ref)
 * with `useFetch('/api/orders')` and add the appropriate loading /
 * error states.
 *
 * @see {F41} — Playground demo app
 */
import { computed, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

type OrderStatus = 'paid' | 'pending' | 'shipped' | 'refunded' | 'cancelled';

interface Order {
  id: string;
  customer: string;
  placedAt: string; // ISO 8601
  status: OrderStatus;
  items: number;
  total: number; // minor units (cents)
}

const props = defineProps<{
  /** Set true while a real fetch is in flight. */
  loading?: boolean;
}>();

const paginatorThreshold = 8;
const paginatorRows = 8;

// Mock dataset — replace with a fetch/composable call in production.
const orders = ref<Order[]>([
  { id: '10431', customer: 'Ada Lovelace',     placedAt: '2026-09-07T09:14:00Z', status: 'paid',      items: 3, total: 14997 },
  { id: '10430', customer: 'Alan Turing',      placedAt: '2026-09-07T08:02:00Z', status: 'shipped',   items: 1, total:  4200 },
  { id: '10429', customer: 'Grace Hopper',     placedAt: '2026-09-06T22:47:00Z', status: 'paid',      items: 5, total: 31250 },
  { id: '10428', customer: 'Linus Torvalds',   placedAt: '2026-09-06T18:33:00Z', status: 'pending',   items: 2, total:  8990 },
  { id: '10427', customer: 'Margaret Hamilton', placedAt: '2026-09-06T14:11:00Z', status: 'refunded', items: 4, total: 19800 },
  { id: '10426', customer: 'Dennis Ritchie',   placedAt: '2026-09-05T11:25:00Z', status: 'paid',      items: 2, total:  6450 },
  { id: '10425', customer: 'Barbara Liskov',   placedAt: '2026-09-05T10:09:00Z', status: 'cancelled', items: 1, total:  2100 },
  { id: '10424', customer: 'Donald Knuth',     placedAt: '2026-09-04T19:55:00Z', status: 'shipped',   items: 6, total: 42780 },
  { id: '10423', customer: 'Edsger Dijkstra',  placedAt: '2026-09-04T15:40:00Z', status: 'paid',      items: 2, total: 11240 },
  { id: '10422', customer: 'Tim Berners-Lee',  placedAt: '2026-09-04T08:20:00Z', status: 'paid',      items: 3, total: 18900 },
]);

const loading = computed(() => props.loading ?? false);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatCurrency(amountInMinorUnits: number): string {
  return currencyFormatter.format(amountInMinorUnits / 100);
}

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

function statusSeverity(status: OrderStatus): string {
  switch (status) {
    case 'paid':      return 'success';
    case 'shipped':   return 'info';
    case 'pending':   return 'warn';
    case 'refunded':  return 'secondary';
    case 'cancelled': return 'danger';
  }
}
</script>

<style scoped>
.orders-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.orders-table-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.orders-table-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--gp-text, #f8fafc);
}

.orders-table-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--gp-text-secondary, #94a3b8);
}

.orders-table-mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-feature-settings: 'tnum' 1;
}

.orders-table-status {
  text-transform: capitalize;
}

.orders-table-empty {
  margin: 0;
  padding: 24px 8px;
  text-align: center;
  color: var(--gp-text-muted, #64748b);
}

/* PrimeVue 4 DataTable uses CSS variables from the Aura preset — these
   tweaks re-tone the surface to match the playground's dark palette. */
.orders-table-grid :deep(.p-datatable-table) {
  background: var(--gp-surface, #1e293b);
  color: var(--gp-text, #f8fafc);
}

.orders-table-grid :deep(.p-datatable-header),
.orders-table-grid :deep(.p-datatable-thead > tr > th) {
  background: var(--gp-topbar, #0b1224);
  color: var(--gp-text-secondary, #94a3b8);
  border-color: var(--gp-surface-hover, #272f42);
}

.orders-table-grid :deep(.p-datatable-tbody > tr) {
  background: var(--gp-surface, #1e293b);
  color: var(--gp-text, #f8fafc);
}

.orders-table-grid :deep(.p-datatable-tbody > tr.p-row-odd) {
  background: rgba(255, 255, 255, 0.02);
}

.orders-table-grid :deep(.p-datatable-tbody > tr:hover) {
  background: var(--gp-surface-hover, #272f42);
}

.orders-table-grid :deep(.p-paginator) {
  background: var(--gp-topbar, #0b1224);
  color: var(--gp-text-secondary, #94a3b8);
  border-color: var(--gp-surface-hover, #272f42);
}
</style>
