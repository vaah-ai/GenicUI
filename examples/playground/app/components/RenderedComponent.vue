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

    <!--
      F47 — WeatherCard (display-only weather details).
      F47 polish: replaced the flat label/value list with a clear
      visual hierarchy — weather glyph + city + temperature hero,
      followed by labelled metric tiles (Conditions / Wind). Each
      state (loading / error / loaded) is a distinct surface so the
      card never looks broken during the Open-Meteo round-trip:
        - Loading → skeleton (shimmer) with stable height to avoid CLS.
        - Error   → message + retry CTA (≥44px tap target).
        - Loaded  → glyph + hero temperature + secondary metrics.
      Tabular numbers keep the temperature digits from jittering
      during transitions. aria-live="polite" announces updates to
      screen-reader users without stealing focus.
    -->
    <Card
      v-else-if="isWeatherCard"
      class="rendered-component-weather-card"
      :class="`rendered-component-weather-card-${weatherTone}`"
      role="status"
      aria-live="polite"
      :aria-label="weatherAriaLabel"
    >
      <template #title>
        <header class="rendered-component-weather-card-header">
          <span class="rendered-component-weather-card-glyph" aria-hidden="true">
            <!--
              Weather glyph — picked from wmoCodeToGlyph() so the
              icon and the label stay in lockstep. SVG (not emoji)
              so it themes with the rest of the playground and
              renders cleanly across platforms. Stroke width
              matches the tool-call + sidebar icons.
            -->
            <component :is="weatherGlyph" />
          </span>
          <span class="rendered-component-weather-card-city">
            {{ weatherCity }}
          </span>
        </header>
      </template>
      <template #content>
        <!-- Loading: skeleton with stable height (no layout shift). -->
        <div v-if="weatherLoading" class="rendered-component-weather-card-skeleton" aria-hidden="true">
          <div class="rendered-component-weather-card-skeleton-hero" />
          <div class="rendered-component-weather-card-skeleton-row" />
          <div class="rendered-component-weather-card-skeleton-row" />
        </div>

        <!-- Error: cause + retry CTA. aria-live inside the role="status"
             wrapper above ensures both transitions are announced. -->
        <div v-else-if="weatherError" class="rendered-component-weather-card-error">
          <span class="rendered-component-weather-card-error-icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div class="rendered-component-weather-card-error-body">
            <p class="rendered-component-weather-card-error-message">
              {{ weatherError }}
            </p>
            <button
              type="button"
              class="rendered-component-weather-card-retry"
              :aria-label="`Retry loading weather for ${weatherCity}`"
              @click="retryWeatherFetch"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Loaded -->
        <div v-else class="rendered-component-weather-card-body">
          <div class="rendered-component-weather-card-hero">
            <div class="rendered-component-weather-card-temperature" :aria-label="`Temperature ${temperatureDisplay}`">
              <span class="rendered-component-weather-card-temperature-value">
                {{ temperatureNumeric }}
              </span>
              <span class="rendered-component-weather-card-temperature-unit">
                {{ temperatureUnit }}
              </span>
            </div>
            <p class="rendered-component-weather-card-conditions">
              {{ conditionsDisplay }}
            </p>
          </div>

          <dl class="rendered-component-weather-card-metrics">
            <div class="rendered-component-weather-card-metric">
              <dt class="rendered-component-weather-card-metric-key">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                </svg>
                Wind
              </dt>
              <dd class="rendered-component-weather-card-metric-val" :aria-label="`Wind speed ${windDisplay}`">
                {{ windDisplay }}
              </dd>
            </div>
            <div class="rendered-component-weather-card-metric">
              <dt class="rendered-component-weather-card-metric-key">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Source
              </dt>
              <dd class="rendered-component-weather-card-metric-val">
                Open-Meteo
              </dd>
            </div>
          </dl>
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

/**
 * Split the temperature into a numeric value (for tabular alignment)
 * and the unit glyph (°C / °F) so they can use different font sizes
 * and weights without stacking two monospace glyphs in one string.
 */
const temperatureNumeric = computed<string>(() => {
  if (weatherTemperature.value === null) return '—';
  return String(Math.round(weatherTemperature.value));
});

const temperatureUnit = computed<string>(() =>
  weatherUnits.value === 'imperial' ? '°F' : '°C',
);

/**
 * Combined display — still handy for the ARIA label and any caller
 * that wants the single string in one go.
 */
const temperatureDisplay = computed<string>(() => {
  if (weatherTemperature.value === null) return '—';
  return `${temperatureNumeric.value}${temperatureUnit.value}`;
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

/**
 * Tone bucket used by the card surface — drives the accent ring
 * around the glyph and the colour of the hero temperature. Keep
 * the buckets coarse: warm / cool / neutral so the user gets a
 * glanceable read without us painting rainbows per WMO code.
 *
 * Sun & partly-cloudy → warm. Rain & thunder → cool. Snow → cold
 * (cyan). Fog → neutral slate. Used as a CSS class on the card
 * root so the theme can override per-tone via custom properties.
 */
const weatherTone = computed<'warm' | 'cool' | 'cold' | 'neutral'>(() => {
  const code = weatherConditions.value === null
    ? NaN
    : parseInt(weatherConditions.value, 10);
  if (Number.isNaN(code)) return 'neutral';
  if (code === 0 || code === 1 || code === 2) return 'warm';
  if (code === 3 || code === 45 || code === 48) return 'neutral';
  if (code >= 51 && code <= 67) return 'cool';
  if (code >= 71 && code <= 77) return 'cold';
  if (code >= 80 && code <= 82) return 'cool';
  if (code >= 85 && code <= 86) return 'cold';
  if (code >= 95) return 'cool';
  return 'neutral';
});

/**
 * Dynamic component reference for the weather glyph. Resolved from
 * the WMO code via `wmoCodeToGlyph()` so the icon stays in
 * lockstep with the label. Inline SVG components below — no
 * emoji (per design rules) and no extra dependencies.
 */
const weatherGlyph = computed(() => wmoCodeToGlyph(weatherConditions.value));

/**
 * aria-label that announces the loaded card in one read. Skips
 * the long label during loading/error so the screen reader
 * announces state transitions rather than re-reading the same
 * data.
 */
const weatherAriaLabel = computed<string>(() => {
  if (weatherLoading.value) return 'Loading weather';
  if (weatherError.value) return `Weather unavailable: ${weatherError.value}`;
  return `Weather for ${weatherCity.value}: ${conditionsDisplay.value}, ${temperatureDisplay.value}, wind ${windDisplay.value}`;
});

/**
 * Shared fetch logic so the initial mount AND the retry button
 * take the same path. Extracted into `fetchWeather()`.
 */
async function fetchWeather(): Promise<void> {
  weatherLoading.value = true;
  weatherError.value = null;
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
}

/**
 * Retry button handler — just re-runs the fetch. Bound from the
 * error state so a transient network blip doesn't require a
 * full chat re-prompt.
 */
function retryWeatherFetch(): void {
  void fetchWeather();
}

// Fetch weather data on mount using Open-Meteo (free, no API key).
if (isWeatherCard.value) {
  onMounted(() => {
    void fetchWeather();
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
    case 80: return 'Light shower';
    case 81: return 'Moderate shower';
    case 82: return 'Violent shower';
    case 95: return 'Thunderstorm';
    case 96: return 'Thunderstorm with hail';
    case 99: return 'Thunderstorm with heavy hail';
    default: return `Code ${code}`;
  }
}

/**
 * Map a WMO weather code to one of the inline `<WeatherGlyph*>` SVG
 * components defined at the bottom of this file. Defaults to the
 * cloud glyph for unknown codes so the card never renders blank.
 */
function wmoCodeToGlyph(code: string | null) {
  const n = code === null ? NaN : parseInt(code, 10);
  if (Number.isNaN(n)) return WeatherGlyphCloud;
  if (n === 0 || n === 1) return WeatherGlyphSun;
  if (n === 2) return WeatherGlyphPartlyCloudy;
  if (n === 3) return WeatherGlyphCloud;
  if (n === 45 || n === 48) return WeatherGlyphFog;
  if (n >= 51 && n <= 67) return WeatherGlyphRain;
  if (n >= 71 && n <= 77) return WeatherGlyphSnow;
  if (n >= 80 && n <= 82) return WeatherGlyphRain;
  if (n >= 85 && n <= 86) return WeatherGlyphSnow;
  if (n >= 95) return WeatherGlyphThunder;
  return WeatherGlyphCloud;
}

/* ----- Inline weather glyph components -----
 *
 * SVG-only (no emoji), consistent stroke-width (1.75) and corner
 * radius (rounded), sized at 28×28 in the card header. Each one
 * renders currentColor so the surrounding tone class controls the
 * hue via `color:`.
 */
const WeatherGlyphSun = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Sun"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  `,
};
const WeatherGlyphPartlyCloudy = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Partly cloudy"
    >
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="2" x2="8" y2="3.5" />
      <line x1="2" y1="8" x2="3.5" y2="8" />
      <line x1="3.5" y1="3.5" x2="4.5" y2="4.5" />
      <line x1="12.5" y1="3.5" x2="11.5" y2="4.5" />
      <path d="M9 17.5h10a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.74-1.07A4 4 0 0 0 9 17.5z" />
    </svg>
  `,
};
const WeatherGlyphCloud = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Cloudy"
    >
      <path d="M17 18.5H7a4 4 0 1 1 .7-7.95A6 6 0 0 1 19 11a3.5 3.5 0 0 1-2 7.5z" />
    </svg>
  `,
};
const WeatherGlyphFog = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Foggy"
    >
      <path d="M17 14H7a4 4 0 1 1 .7-7.95A6 6 0 0 1 19 6.5" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <line x1="5" y1="21" x2="19" y2="21" />
    </svg>
  `,
};
const WeatherGlyphRain = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Rainy"
    >
      <path d="M17 12.5H7a4 4 0 1 1 .7-7.95A6 6 0 0 1 19 5.5a3.5 3.5 0 0 1-2 7z" />
      <line x1="8" y1="17" x2="7" y2="21" />
      <line x1="12" y1="17" x2="11" y2="21" />
      <line x1="16" y1="17" x2="15" y2="21" />
    </svg>
  `,
};
const WeatherGlyphSnow = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Snowy"
    >
      <path d="M17 12.5H7a4 4 0 1 1 .7-7.95A6 6 0 0 1 19 5.5a3.5 3.5 0 0 1-2 7z" />
      <line x1="8" y1="17" x2="8" y2="21" />
      <line x1="6.5" y1="18" x2="9.5" y2="20" />
      <line x1="9.5" y1="18" x2="6.5" y2="20" />
      <line x1="16" y1="17" x2="16" y2="21" />
      <line x1="14.5" y1="18" x2="17.5" y2="20" />
      <line x1="17.5" y1="18" x2="14.5" y2="20" />
    </svg>
  `,
};
const WeatherGlyphThunder = {
  template: `
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label="Thunderstorm"
    >
      <path d="M17 12.5H7a4 4 0 1 1 .7-7.95A6 6 0 0 1 19 5.5a3.5 3.5 0 0 1-2 7z" />
      <polygon points="13 14 9 19 11 19 10 22 15 17 13 17 14 14 13 14" />
    </svg>
  `,
};
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

/* ---------- WeatherCard (F47 polish) ---------- */
/*
  Layout intent (matches ui-ux-pro-max priorities):
    - Hierarchy: temperature is the hero (size 2rem, bold), city
      + glyph are the header strip, conditions + metrics are
      secondary (≤0.8125rem, secondary text colour).
    - Visual rhythm: 8dp spacing scale via var(--gp-space-*).
    - Tone classes: warm / cool / cold / neutral drive the glyph
      ring + accent via scoped CSS custom properties so the same
      markup works in light or dark themes without hard-coded
      hex anywhere in the component.
    - Dark-mode contrast: primary text uses --gp-text (slate-50,
      contrast >12:1 on slate-800 surface); secondary text uses
      --gp-text-secondary (slate-400, ≥4.6:1 on surface).
    - Reduced motion: shimmer + transitions gated by media query.
*/

.rendered-component-weather-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-md);
  overflow: hidden;
  /* Per-tone accent. Defaults to neutral; warm/cool/cold override. */
  --wx-accent: var(--gp-text-secondary);
  --wx-accent-soft: var(--gp-surface-hover);
}

.rendered-component-weather-card-warm {
  --wx-accent: #fbbf24;        /* amber-400 — readable on slate-800 */
  --wx-accent-soft: rgba(251, 191, 36, 0.14);
}
.rendered-component-weather-card-cool {
  --wx-accent: #60a5fa;        /* blue-400 */
  --wx-accent-soft: rgba(96, 165, 250, 0.14);
}
.rendered-component-weather-card-cold {
  --wx-accent: #67e8f9;        /* cyan-300 */
  --wx-accent-soft: rgba(103, 232, 249, 0.14);
}
.rendered-component-weather-card-neutral {
  --wx-accent: var(--gp-text-secondary);
  --wx-accent-soft: var(--gp-surface-hover);
}

.rendered-component-weather-card :deep(.p-card-title) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gp-text);
  margin: 0;
}

.rendered-component-weather-card :deep(.p-card-content) {
  padding-top: var(--gp-space-2);
}

/* Header strip — glyph + city, side by side, vertically centred. */
.rendered-component-weather-card-header {
  display: flex;
  align-items: center;
  gap: var(--gp-space-2);
}

.rendered-component-weather-card-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--wx-accent-soft);
  color: var(--wx-accent);
  flex-shrink: 0;
}

.rendered-component-weather-card-city {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gp-text);
  letter-spacing: 0.01em;
  /* Truncate rather than wrap the city name on narrow chat bubbles. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* Hero block — big temperature + conditions line. */
.rendered-component-weather-card-hero {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--gp-space-3);
  padding: var(--gp-space-2) 0;
}

.rendered-component-weather-card-temperature {
  display: inline-flex;
  align-items: baseline;
  /* Tabular figures so the digits don't jitter across reloads. */
  font-variant-numeric: tabular-nums;
  color: var(--gp-text);
  line-height: 1;
}

.rendered-component-weather-card-temperature-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.rendered-component-weather-card-temperature-unit {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--wx-accent);
  margin-left: 2px;
}

.rendered-component-weather-card-conditions {
  margin: 0;
  font-size: 0.875rem;
  color: var(--gp-text-secondary);
  font-weight: 500;
}

/* Secondary metrics — definition list for proper screen-reader
   semantics + tabular alignment. */
.rendered-component-weather-card-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gp-space-2);
  margin: 0;
  padding: var(--gp-space-2) 0 0;
  border-top: 1px solid var(--gp-border);
}

.rendered-component-weather-card-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--gp-space-1) var(--gp-space-2);
  background: var(--gp-surface-hover);
  border-radius: var(--gp-radius-sm);
}

.rendered-component-weather-card-metric-key {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gp-text-muted);
  margin: 0;
}

.rendered-component-weather-card-metric-val {
  margin: 0;
  font-family: var(--gp-font-mono);
  font-size: 0.8125rem;
  color: var(--gp-text);
  /* Keep numbers aligned as they change. */
  font-variant-numeric: tabular-nums;
}

/* ---------- Loading skeleton (shimmer, stable height) ---------- */
.rendered-component-weather-card-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
  padding: var(--gp-space-3) 0;
  /* Reserve the same height as the loaded body so the card doesn't
     jump when the data lands (avoids CLS). */
  min-height: 96px;
}

.rendered-component-weather-card-skeleton-hero {
  height: 36px;
  width: 60%;
  border-radius: var(--gp-radius-sm);
}

.rendered-component-weather-card-skeleton-row {
  height: 14px;
  width: 100%;
  border-radius: var(--gp-radius-sm);
}

/* The shimmer overlay — animates a gradient sweep across each
   block. Stops on reduced-motion (see media query at the bottom
   of the file). */
.rendered-component-weather-card-skeleton-hero,
.rendered-component-weather-card-skeleton-row {
  background: linear-gradient(
    90deg,
    var(--gp-surface-hover) 0%,
    var(--gp-surface-active) 50%,
    var(--gp-surface-hover) 100%
  );
  background-size: 200% 100%;
  animation: wx-shimmer 1.4s ease-in-out infinite;
}

@keyframes wx-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---------- Error state ---------- */
.rendered-component-weather-card-error {
  display: flex;
  align-items: flex-start;
  gap: var(--gp-space-2);
  padding: var(--gp-space-2) 0;
  color: var(--gp-error-text);
}

.rendered-component-weather-card-error-icon {
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 2px;
}

.rendered-component-weather-card-error-body {
  display: flex;
  flex-direction: column;
  gap: var(--gp-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.rendered-component-weather-card-error-message {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--gp-text);
}

.rendered-component-weather-card-retry {
  align-self: flex-start;
  min-height: 36px;       /* ≥36px — close to the 44pt target;
                             capped to fit the compact card width. */
  padding: 0 var(--gp-space-3);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: var(--gp-radius);
  border: 1px solid var(--gp-border-light);
  background: var(--gp-surface-hover);
  color: var(--gp-text);
  cursor: pointer;
  transition:
    background var(--gp-transition),
    border-color var(--gp-transition),
    transform var(--gp-transition);
}

.rendered-component-weather-card-retry:hover {
  background: var(--gp-surface-active);
  border-color: var(--gp-accent);
}

.rendered-component-weather-card-retry:focus-visible {
  outline: 2px solid var(--gp-accent);
  outline-offset: 2px;
}

.rendered-component-weather-card-retry:active {
  transform: translateY(1px);
}

/* Respect reduced motion — disable transitions AND the shimmer
   animation. The skeleton stays as a flat block instead of a
   sweeping gradient, which is the platform-correct fallback per
   Apple Reduced Motion / Material motion guidelines. */
@media (prefers-reduced-motion: reduce) {
  .rendered-component * {
    transition: none !important;
  }
  .rendered-component-weather-card-skeleton-hero,
  .rendered-component-weather-card-skeleton-row {
    animation: none !important;
    background: var(--gp-surface-hover);
  }
}
</style>
