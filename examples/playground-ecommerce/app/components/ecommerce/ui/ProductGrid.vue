<template>
  <section class="product-grid" :data-component="ProductGrid" data-test="product-grid">
    <FilterChips
      v-if="normalizedFilters.length > 0"
      :filters="normalizedFilters"
      @filter-changed="onFilterChanged"
    />

    <DataTable
      :value="normalizedRows"
      :paginator="normalizedRows.length > paginatorThreshold"
      :rows="paginatorRows"
      :rows-per-page-options="[8, 16, 24]"
      striped-rows
      :loading="loading"
      data-key="id"
      class="product-grid-table"
      data-test="product-grid-table"
    >
      <template #empty>
        <p class="product-grid-empty">No products match the current filters.</p>
      </template>

      <Column headerStyle="width: 80px" header="&nbsp;">
        <template #body="{ data }">
          <ProductCard
            :product="data"
            @product-selected="(payload) => onProductSelected(payload, data)"
          />
        </template>
      </Column>

      <Column field="title" header="Title" sortable />
      <Column field="brand" header="Brand" sortable />

      <Column header="Price" sortable :sort-field="'price.amount'">
        <template #body="{ data }">
          <PriceTag
            :amount="Number(data?.price?.amount ?? 0)"
            :currency="String(data?.price?.currency_code ?? 'USD')"
            :compare-at="data?.compare_at ?? null"
          />
        </template>
      </Column>

      <Column header="Stock" sortable :sort-field="'stock'">
        <template #body="{ data }">
          <StockBadge :count="Number(data?.stock ?? 0)" />
        </template>
      </Column>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
/**
 * ProductGrid — PrimeVue DataTable-backed product browse list.
 *
 * EJG-COMP-1 (no remount on filter): the component emits `filter-changed`
 * and stays mounted. The agent calls `update_component` on the same
 * componentId to swap in the filtered rows. The DataTable's `:value`
 * binding reactively re-renders without unmounting the component.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-1} — same componentId round-trip (no remount)
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProductCard from './ProductCard.vue';
import PriceTag from './PriceTag.vue';
import StockBadge from './StockBadge.vue';
import FilterChips from './FilterChips.vue';

interface ProductRow {
  id: string;
  title?: string;
  brand?: string;
  price?: { amount?: number; currency_code?: string };
  stock?: number;
  compare_at?: number | null;
}

interface FilterEntry {
  id: string;
  label: string;
  active?: boolean;
}

interface Props {
  /** Rows passed in from the agent. The grid never fetches. */
  rows: readonly ProductRow[];
  /** Optional filter chip definitions shown above the grid. */
  filters?: ReadonlyArray<FilterEntry>;
  /** Set true while a real fetch is in flight (parent-controlled). */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => [],
  loading: false,
});

const ProductGrid = 'ProductGrid';

const paginatorThreshold = 12;
const paginatorRows = 8;

const normalizedRows = computed<readonly ProductRow[]>(() =>
  Array.isArray(props.rows) ? props.rows : [],
);

const normalizedFilters = computed<readonly FilterEntry[]>(() =>
  Array.isArray(props.filters) ? props.filters.map((f) => ({
    id: String(f.id),
    label: String(f.label),
    active: Boolean(f.active),
  })) : [],
);

const emit = defineEmits<{
  (e: 'product-selected', payload: { id: string }): void;
  (e: 'filter-changed', payload: { id: string; active: boolean; activeIds: readonly string[] }): void;
}>();

/**
 * Keep a synthetic ref so the component instance identity is stable
 * across filter changes — the parent can use this in tests to assert
 * the same instance is reused (EJG-COMP-1).
 */
const instanceId = ref<string>(`grid-${Math.random().toString(36).slice(2, 10)}`);

function onProductSelected(payload: { id: string }, _row: ProductRow): void {
  void _row;
  emit('product-selected', payload);
}

function onFilterChanged(payload: { id: string; active: boolean; activeIds: readonly string[] }): void {
  emit('filter-changed', payload);
}
</script>

<style scoped>
.product-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.product-grid-empty {
  margin: 0;
  padding: 24px 8px;
  text-align: center;
  color: var(--gp-text-muted);
}

.product-grid-table :deep(.p-datatable-table) {
  background: var(--gp-surface);
  color: var(--gp-text);
}
</style>