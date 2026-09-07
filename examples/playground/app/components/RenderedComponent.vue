<template>
  <!--
    RenderedComponent — runtime-agnostic Vue rendering of a GenicUI
    component. Takes the wire `{ name, props }` shape and produces the
    matching live UI (PrimeVue DataTable / InputPair / ResultCard).

    This is the playground's bridge between the server's framework-
    agnostic render_component call and a real interactive widget.
    The same component renders in the chat bubble's tool-call
    accordion so users see the actual rendered UI (POC parity), not
    a stub card.

    F43 — interactive components:
      - InputPair fires `submit` events through the component-event-bus
        when the user clicks Submit.
      - ResultCard is display-only.
      - componentId is passed through so InputPair can scope outbound
        `chat.component_event` frames to the right mounted component.
  -->
  <section class="rendered-component" :aria-label="ariaLabel">
    <!-- F40 — DataTable (table view) -->
    <DataTable
      v-if="isDataTable"
      :value="rows"
      :paginator="rows.length > paginatorThreshold"
      :rows="pageSize"
      :rows-per-page-options="[5, 10, 20]"
      striped-rows
      sort-mode="multiple"
      removable-sort
      data-key="id"
      class="rendered-component-grid"
    >
      <template #empty>
        <p class="rendered-component-empty">No rows to display.</p>
      </template>
      <Column
        v-for="col in columns"
        :key="col.key"
        :field="col.key"
        :header="col.label"
        :sortable="!!col.sortable"
      >
        <template v-if="isStatusColumn(col)" #body="{ data }">
          <Tag
            :value="data[col.key]"
            :severity="statusSeverity(data[col.key])"
            class="rendered-component-status"
          />
        </template>
      </Column>
    </DataTable>

    <!-- F43 — InputPair (two numeric inputs + Submit) -->
    <div v-else-if="isInputPair" class="rendered-component-input-pair">
      <label class="rendered-component-input-pair-field">
        <span class="rendered-component-input-pair-label">{{ label1 }}</span>
        <InputNumber
          v-model="input1Model"
          :min="null"
          :max="null"
          :input-style="{ width: '100%' }"
          class="rendered-component-input-pair-input"
          input-id="input-pair-input1"
        />
      </label>
      <label class="rendered-component-input-pair-field">
        <span class="rendered-component-input-pair-label">{{ label2 }}</span>
        <InputNumber
          v-model="input2Model"
          :min="null"
          :max="null"
          :input-style="{ width: '100%' }"
          class="rendered-component-input-pair-input"
          input-id="input-pair-input2"
        />
      </label>
      <Button
        :label="submitLabel"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :disabled="!canSubmit"
        class="rendered-component-input-pair-submit"
        :aria-label="`${submitLabel} ${label1} and ${label2}`"
        @click="handleSubmit"
      />
    </div>

    <!-- F43 — ResultCard (display-only) -->
    <Card v-else-if="isResultCard" class="rendered-component-result-card">
      <template #title>{{ resultTitle }}</template>
      <template #content>
        <div class="rendered-component-result-card-body">
          <div v-if="hasInput1" class="rendered-component-result-card-row">
            <span class="rendered-component-result-card-key">{{ resultLabel1 }}</span>
            <span class="rendered-component-result-card-val">{{ input1Display }}</span>
          </div>
          <div v-if="hasInput2" class="rendered-component-result-card-row">
            <span class="rendered-component-result-card-key">{{ resultLabel2 }}</span>
            <span class="rendered-component-result-card-val">{{ input2Display }}</span>
          </div>
          <div class="rendered-component-result-card-row rendered-component-result-card-row-sum">
            <span class="rendered-component-result-card-key">{{ resultOperationLabel }}</span>
            <span class="rendered-component-result-card-val rendered-component-result-card-val-sum">
              {{ sumDisplay }}
            </span>
          </div>
        </div>
      </template>
    </Card>

    <!-- Calculator — fully client-stateful 4-function calculator -->
    <Calculator v-else-if="isCalculator" />

    <!-- F47 — CityPicker (city dropdown + Submit) -->
    <div v-else-if="isCityPicker" class="rendered-component-city-picker">
      <label class="rendered-component-city-picker-label">{{ cityLabel }}</label>
      <Dropdown
        :model-value="selectedCity"
        :options="cityOptions"
        option-label="label"
        option-value="value"
        class="rendered-component-city-picker-dropdown"
        @change="handleCityChange"
      />
      <Button
        :label="citySubmitLabel"
        icon="pi pi-search"
        icon-pos="right"
        class="rendered-component-city-picker-submit"
        :aria-label="`Show weather for ${selectedCity ?? cityLabel}`"
        @click="handleCitySubmit"
      />
    </div>

    <!-- F47 — WeatherCard (display-only weather details) -->
    <Card v-else-if="isWeatherCard" class="rendered-component-weather-card">
      <template #title>{{ weatherCity }}</template>
      <template #content>
        <div class="rendered-component-weather-card-body">
          <div v-if="weatherLoading" class="rendered-component-weather-card-loading">
            Loading weather…
          </div>
          <div v-else-if="weatherError" class="rendered-component-weather-card-error">
            {{ weatherError }}
          </div>
          <template v-else>
            <div class="rendered-component-weather-card-row">
              <span class="rendered-component-weather-card-key">Temperature</span>
              <span class="rendered-component-weather-card-val rendered-component-weather-card-val-temp">
                {{ temperatureDisplay }}
              </span>
            </div>
            <div class="rendered-component-weather-card-row">
              <span class="rendered-component-weather-card-key">Conditions</span>
              <span class="rendered-component-weather-card-val">{{ conditionsDisplay }}</span>
            </div>
            <div class="rendered-component-weather-card-row">
              <span class="rendered-component-weather-card-key">Wind Speed</span>
              <span class="rendered-component-weather-card-val">{{ windDisplay }}</span>
            </div>
          </template>
        </div>
      </template>
    </Card>

    <div v-else class="rendered-component-unknown">
      <p>
        Component <code>{{ name }}</code> isn't rendered live yet; here's
        the JSON payload instead.
      </p>
      <pre>{{ JSON.stringify(props, null, 2) }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * RenderedComponent — generic PrimeVue renderer for one GenicUI
 * component, given its wire `{ name, props }` shape.
 *
 * Supported components:
 *  - `DataTable`     (F40) → PrimeVue DataTable with sortable columns
 *  - `InputPair`     (F43) → two numeric inputs + Submit (interactive)
 *  - `ResultCard`    (F43) → display-only card with the computed result
 *  - `Calculator`    (F43) → 4-function calculator with keyboard support
 *  - everything else       → fallback JSON view
 *
 * @see {F40} — PrimeVue DataTable registry
 * @see {F43} — Chat as the sole render surface (interactive components)
 */
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Dropdown from 'primevue/dropdown';

import Calculator from './Calculator.vue';

import { useComponents } from '~/composables/useComponents.ts';
import { on as busOn, off as busOff } from '~/composables/component-event-bus.ts';
import { useWebSocket } from '~/composables/useWebSocket.ts';

interface ColumnSpec {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
}

const props = defineProps<{
  /** Wire component name (e.g., "DataTable"). */
  name: string;
  /** Wire component props (e.g., { rows, columns, pageSize }). */
  props: Record<string, unknown>;
  /** Mounted component id (F43). Required for interactive components
   *  that emit `chat.component_event` frames so the server can scope
   *  the event back to the right component. */
  componentId?: string;
}>();

const ariaLabel = computed<string>(() => `${props.name} component preview`);
const isDataTable = computed<boolean>(() => props.name === 'DataTable');
const isInputPair = computed<boolean>(() => props.name === 'InputPair');
const isResultCard = computed<boolean>(() => props.name === 'ResultCard');
const isCalculator = computed<boolean>(() => props.name === 'Calculator');
const isCityPicker = computed<boolean>(() => props.name === 'CityPicker');
const isWeatherCard = computed<boolean>(() => props.name === 'WeatherCard');

// ---------------------------------------------------------------------------
// DataTable (F40)
// ---------------------------------------------------------------------------

const rows = computed<Record<string, unknown>[]>(() => {
  if (!isDataTable.value) return [];
  const r = props.props['rows'];
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : [];
});

const columns = computed<ColumnSpec[]>(() => {
  if (!isDataTable.value) return [];
  const c = props.props['columns'];
  if (Array.isArray(c) && c.length > 0) {
    return c.map((col, i) => {
      const obj = (col && typeof col === 'object') ? (col as Record<string, unknown>) : {};
      const key = typeof obj['key'] === 'string' ? obj['key'] : `col${i}`;
      const label = typeof obj['label'] === 'string' ? obj['label'] : key;
      return {
        key,
        label,
        sortable: obj['sortable'] === true,
        filterable: obj['filterable'] === true,
      };
    });
  }
  // Fallback: derive columns from the first row's keys.
  const fallbackOrder = ['id', 'name', 'customer', 'product', 'status', 'quantity', 'total', 'placedAt'];
  const seen = new Set<string>();
  const cols: ColumnSpec[] = [];
  if (rows.value.length > 0) {
    const first = rows.value[0]!;
    for (const key of fallbackOrder) {
      if (key in first && !seen.has(key)) {
        seen.add(key);
        cols.push({ key, label: prettifyKey(key), sortable: true });
      }
    }
    for (const key of Object.keys(first)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push({ key, label: prettifyKey(key), sortable: true });
      }
    }
  }
  return cols;
});

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const pageSize = computed<number>(() => {
  const p = props.props['pageSize'];
  return typeof p === 'number' && p > 0 ? p : 10;
});

const paginatorThreshold = 8;

function isStatusColumn(col: ColumnSpec): boolean {
  return col.key.toLowerCase() === 'status';
}

function statusSeverity(value: unknown): string {
  const v = typeof value === 'string' ? value.toLowerCase() : '';
  switch (v) {
    case 'paid':
    case 'active':
    case 'completed':
    case 'success':
      return 'success';
    case 'shipped':
    case 'processing':
    case 'info':
      return 'info';
    case 'pending':
    case 'warn':
      return 'warn';
    case 'cancelled':
    case 'failed':
    case 'refunded':
    case 'danger':
      return 'danger';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// InputPair (F43) — interactive
// ---------------------------------------------------------------------------

const label1 = computed<string>(() => {
  const v = props.props['label1'];
  return typeof v === 'string' && v.length > 0 ? v : 'Input 1';
});
const label2 = computed<string>(() => {
  const v = props.props['label2'];
  return typeof v === 'string' && v.length > 0 ? v : 'Input 2';
});
const submitLabel = computed<string>(() => {
  const v = props.props['submitLabel'];
  return typeof v === 'string' && v.length > 0 ? v : 'Submit';
});

const input1Model = ref<number>(
  typeof props.props['input1'] === 'number' ? (props.props['input1'] as number) : 0,
);
const input2Model = ref<number>(
  typeof props.props['input2'] === 'number' ? (props.props['input2'] as number) : 0,
);

// If the agent re-renders the InputPair with new initial values, sync
// the local refs without clobbering user typing. Only update when the
// incoming prop actually differs from the current value.
watch(
  () => props.props['input1'],
  (next) => {
    if (typeof next === 'number' && next !== input1Model.value) {
      input1Model.value = next;
    }
  },
);
watch(
  () => props.props['input2'],
  (next) => {
    if (typeof next === 'number' && next !== input2Model.value) {
      input2Model.value = next;
    }
  },
);

const canSubmit = computed<boolean>(() => {
  return typeof input1Model.value === 'number' && typeof input2Model.value === 'number';
});

function handleSubmit(): void {
  const ws = useWebSocket();
  const comps = useComponents();
  comps.sendComponentEvent(
    ws as unknown as { send: (data: Record<string, unknown>) => void },
    props.componentId ?? '',
    props.name,
    'submit',
    { input1: input1Model.value, input2: input2Model.value },
  );
}

// Bus hook: subscribe to inbound events on this component so the agent
// can re-render or push STATE_DELTAs back. We unsubscribe on unmount.
let busUnsub: (() => void) | null = null;
if (isInputPair.value && props.componentId) {
  busUnsub = busOn(props.componentId, (evt) => {
    // For now the InputPair only listens; it doesn't apply inbound
    // deltas locally (the agent re-renders the whole component when
    // needed). This hook is wired so future event types (e.g. an
    // `update` from the agent) can flow through the same path.
    if (evt.action === 'update' && evt.payload) {
      const p = evt.payload as { input1?: number; input2?: number };
      if (typeof p.input1 === 'number') input1Model.value = p.input1;
      if (typeof p.input2 === 'number') input2Model.value = p.input2;
    }
  });
}
onBeforeUnmount(() => {
  if (busUnsub) {
    if (props.componentId) busOff(props.componentId, busUnsub as never);
    busUnsub = null;
  }
});

// ---------------------------------------------------------------------------
// ResultCard (F43) — display-only
// ---------------------------------------------------------------------------

const resultTitle = computed<string>(() => {
  const v = props.props['title'];
  return typeof v === 'string' && v.length > 0 ? v : 'Result';
});

const hasInput1 = computed<boolean>(() => typeof props.props['input1'] === 'number');
const hasInput2 = computed<boolean>(() => typeof props.props['input2'] === 'number');

const input1Display = computed<string>(() => {
  const v = props.props['input1'];
  return typeof v === 'number' ? String(v) : '—';
});
const input2Display = computed<string>(() => {
  const v = props.props['input2'];
  return typeof v === 'number' ? String(v) : '—';
});

const sumDisplay = computed<string>(() => {
  const v = props.props['sum'];
  return typeof v === 'number' ? String(v) : '—';
});

const resultOperation = computed<string>(() => {
  const v = props.props['operation'];
  return typeof v === 'string' && v.length > 0 ? v : 'add';
});

const resultOperationLabel = computed<string>(() => {
  switch (resultOperation.value) {
    case 'add': return 'Sum';
    case 'subtract': return 'Difference';
    case 'multiply': return 'Product';
    case 'divide': return 'Quotient';
    default: return 'Result';
  }
});

const resultLabel1 = computed<string>(() => {
  const v = props.props['label1'];
  return typeof v === 'string' && v.length > 0 ? v : 'Input 1';
});
const resultLabel2 = computed<string>(() => {
  const v = props.props['label2'];
  return typeof v === 'string' && v.length > 0 ? v : 'Input 2';
});

// ---------------------------------------------------------------------------
// CityPicker (F47) — interactive city dropdown
// ---------------------------------------------------------------------------

const cityLabel = computed<string>(() => {
  const v = props.props['label'];
  return typeof v === 'string' && v.length > 0 ? v : 'City';
});

const citySubmitLabel = computed<string>(() => {
  const v = props.props['submitLabel'];
  return typeof v === 'string' && v.length > 0 ? v : 'Show weather';
});

const cityOptions = computed<Array<{ label: string; value: string }>>(() => {
  const opts = props.props['cityOptions'];
  if (Array.isArray(opts)) {
    return (opts as string[]).map((city) => ({ label: city, value: city }));
  }
  return [];
});

const selectedCity = ref<string>(
  typeof props.props['initialCity'] === 'string'
    ? props.props['initialCity'] as string
    : (cityOptions.value[0]?.value ?? ''),
);

function handleCityChange(evt: { value: string }): void {
  selectedCity.value = evt.value;
}

function handleCitySubmit(): void {
  const ws = useWebSocket();
  const comps = useComponents();
  comps.sendComponentEvent(
    ws as unknown as { send: (data: Record<string, unknown>) => void },
    props.componentId ?? '',
    props.name,
    'submit',
    { city: selectedCity.value },
  );
}

// ---------------------------------------------------------------------------
// WeatherCard (F47) — display-only, fetches from Open-Meteo API
// ---------------------------------------------------------------------------

const weatherCity = computed<string>(() => {
  const v = props.props['city'];
  return typeof v === 'string' && v.length > 0 ? v : 'Unknown';
});

const weatherUnits = computed<string>(() => {
  const v = props.props['units'];
  return (typeof v === 'string' && (v === 'metric' || v === 'imperial'))
    ? v
    : 'metric';
});

const weatherLoading = ref<boolean>(true);
const weatherError = ref<string | null>(null);
const weatherTemperature = ref<number | null>(null);
const weatherConditions = ref<string | null>(null);
const weatherWindSpeed = ref<number | null>(null);

const temperatureDisplay = computed<string>(() => {
  if (weatherTemperature.value === null) return '—';
  const unit = weatherUnits.value === 'imperial' ? '°F' : '°C';
  return `${Math.round(weatherTemperature.value)}${unit}`;
});

const conditionsDisplay = computed<string>(() => {
  if (weatherConditions.value === null) return '—';
  // WMO weather code → human-readable label
  const code = parseInt(weatherConditions.value, 10);
  return wmoCodeToLabel(code);
});

const windDisplay = computed<string>(() => {
  if (weatherWindSpeed.value === null) return '—';
  const unit = weatherUnits.value === 'imperial' ? 'mph' : 'km/h';
  return `${Math.round(weatherWindSpeed.value)} ${unit}`;
});

// Fetch weather data on mount using Open-Meteo (free, no API key).
if (isWeatherCard.value) {
  onMounted(async () => {
    try {
      // Geocode the city name to coordinates.
      const geoResp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity.value)}&count=1`,
      );
      const geoJson = await geoResp.json() as { results?: Array<{ latitude: number; longitude: number; name: string }> };
      const location = geoJson.results?.[0];
      if (!location) {
        weatherError.value = `City "${weatherCity.value}" not found.`;
        weatherLoading.value = false;
        return;
      }

      // Fetch current weather for the coordinates.
      const wxResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
          `&current=temperature_2m,weather_code,wind_speed_10m`
          + (weatherUnits.value === 'imperial' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&temperature_unit=celsius&wind_speed_unit=kmh'),
      );
      const wxJson = await wxResp.json() as { current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number } };
      const current = wxJson.current;
      if (!current) {
        weatherError.value = 'No weather data available.';
        weatherLoading.value = false;
        return;
      }

      weatherTemperature.value = current.temperature_2m;
      weatherConditions.value = String(current.weather_code);
      weatherWindSpeed.value = current.wind_speed_10m;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather';
      weatherError.value = message;
    } finally {
      weatherLoading.value = false;
    }
  });
}

function wmoCodeToLabel(code: number): string {
  // WMO weather interpretation codes (from Open-Meteo documentation).
  switch (code) {
    case 0: return 'Clear sky';
    case 1: return 'Mainly clear';
    case 2: return 'Partly cloudy';
    case 3: return 'Overcast';
    case 45:
    case 48: return 'Fog';
    case 51: return 'Light drizzle';
    case 53: return 'Moderate drizzle';
    case 55: return 'Dense drizzle';
    case 61: return 'Light rain';
    case 63: return 'Moderate rain';
    case 65: return 'Heavy rain';
    case 71: return 'Light snow';
    case 73: return 'Moderate snow';
    case 75: return 'Heavy snow';
    case 80: return 'Light show';
    case 81: return 'Moderate shower';
    case 82: return 'Violent shower';
    case 95: return 'Thunderstorm';
    case 96: return 'Thunderstorm with hail';
    case 99: return 'Thunderstorm with heavy hail';
    default: return `Code ${code}`;
  }
}
</script>

<style scoped>
.rendered-component {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
  width: 100%;
}

.rendered-component-grid :deep(.p-datatable-table) {
  background: var(--gp-surface, #1e293b);
  color: var(--gp-text, #f8fafc);
  font-size: 0.8125rem;
}

.rendered-component-grid :deep(.p-datatable-header),
.rendered-component-grid :deep(.p-datatable-thead > tr > th) {
  background: var(--gp-topbar, #0b1224);
  color: var(--gp-text-secondary, #94a3b8);
  border-color: var(--gp-surface-hover, #272f42);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rendered-component-grid :deep(.p-datatable-tbody > tr) {
  background: var(--gp-surface, #1e293b);
  color: var(--gp-text, #f8fafc);
}

.rendered-component-grid :deep(.p-datatable-tbody > tr.p-row-odd) {
  background: rgba(255, 255, 255, 0.02);
}

.rendered-component-grid :deep(.p-datatable-tbody > tr:hover) {
  background: var(--gp-surface-hover, #272f42);
}

.rendered-component-grid :deep(.p-paginator) {
  background: var(--gp-topbar, #0b1224);
  color: var(--gp-text-secondary, #94a3b8);
  border-color: var(--gp-surface-hover, #272f42);
}

.rendered-component-status {
  text-transform: capitalize;
}

/* ---------- InputPair ---------- */
.rendered-component-input-pair {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--gp-space-2);
  align-items: end;
  padding: var(--gp-space-2) 0;
}

.rendered-component-input-pair-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rendered-component-input-pair-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gp-text-muted);
}

.rendered-component-input-pair-input :deep(.p-inputnumber-input) {
  width: 100%;
}

.rendered-component-input-pair-submit {
  align-self: end;
  height: 40px;
}

/* ---------- ResultCard ---------- */
.rendered-component-result-card {
  background: var(--gp-surface, #1e293b);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md);
}

.rendered-component-result-card :deep(.p-card-title) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gp-text);
}

.rendered-component-result-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.rendered-component-result-card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gp-space-3);
  padding: 4px 0;
  border-bottom: 1px dashed var(--gp-border);
  font-size: 0.8125rem;
}

.rendered-component-result-card-row:last-child {
  border-bottom: none;
}

.rendered-component-result-card-key {
  color: var(--gp-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rendered-component-result-card-val {
  font-family: var(--gp-font-mono, monospace);
  color: var(--gp-text);
}

.rendered-component-result-card-row-sum {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--gp-border);
  border-bottom: none;
}

.rendered-component-result-card-val-sum {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gp-accent, #22c55e);
}

/* ---------- Unknown ---------- */
.rendered-component-unknown {
  background: var(--gp-bg);
  border: 1px dashed var(--gp-border);
  border-radius: var(--gp-radius-sm);
  padding: var(--gp-space-2) var(--gp-space-3);
}

.rendered-component-unknown p {
  margin: 0 0 var(--gp-space-2) 0;
  font-size: 0.75rem;
  color: var(--gp-text-secondary);
}

.rendered-component-unknown code {
  font-family: var(--gp-font-mono);
  background: var(--gp-surface);
  padding: 2px 4px;
  border-radius: 3px;
}

.rendered-component-unknown pre {
  margin: 0;
  font-family: var(--gp-font-mono);
  font-size: 0.75rem;
  color: var(--gp-text-secondary);
  overflow-x: auto;
}

.rendered-component-empty {
  margin: 0;
  padding: var(--gp-space-3);
  text-align: center;
  color: var(--gp-text-muted);
  font-style: italic;
  font-size: 0.8125rem;
}

/* ---------- CityPicker ---------- */
.rendered-component-city-picker {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--gp-space-2);
  align-items: end;
  padding: var(--gp-space-2) 0;
}

.rendered-component-city-picker-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gp-text-muted);
  grid-column: 1 / -1;
}

.rendered-component-city-picker-dropdown :deep(.p-dropdown) {
  width: 100%;
}

.rendered-component-city-picker-submit {
  height: 40px;
}

/* ---------- WeatherCard ---------- */
.rendered-component-weather-card {
  background: var(--gp-surface, #1e293b);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md);
}

.rendered-component-weather-card :deep(.p-card-title) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gp-text);
}

.rendered-component-weather-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-1);
}

.rendered-component-weather-card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--gp-space-3);
  padding: 4px 0;
  border-bottom: 1px dashed var(--gp-border);
  font-size: 0.8125rem;
}

.rendered-component-weather-card-row:last-child {
  border-bottom: none;
}

.rendered-component-weather-card-key {
  color: var(--gp-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rendered-component-weather-card-val {
  font-family: var(--gp-font-mono, monospace);
  color: var(--gp-text);
}

.rendered-component-weather-card-val-temp {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gp-accent, #22c55e);
}

.rendered-component-weather-card-loading {
  text-align: center;
  color: var(--gp-text-muted);
  font-style: italic;
  font-size: 0.8125rem;
  padding: var(--gp-space-3) 0;
}

.rendered-component-weather-card-error {
  color: #f87171;
  font-size: 0.8125rem;
  padding: var(--gp-space-2) 0;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .rendered-component * {
    transition: none !important;
  }
}
</style>
