<template>
  <div class="variation-picker" :data-component="VariationPicker" data-test="variation-picker">
    <fieldset
      v-for="axis in axes"
      :key="axis.name"
      class="variation-picker-axis"
      :data-test="`variation-picker-axis-${axis.name}`"
    >
      <legend class="variation-picker-axis-label">{{ axis.name }}</legend>
      <div class="variation-picker-options">
        <label
          v-for="opt in axis.options"
          :key="opt.value"
          class="variation-picker-option"
          :class="{ 'variation-picker-option--selected': opt.value === selected[axis.name] }"
          :data-test="`variation-picker-option-${axis.name}-${opt.value}`"
        >
          <RadioButton
            :name="`variation-${axis.name}`"
            :value="opt.value"
            :model-value="selected[axis.name]"
            @update:model-value="onAxisChange(axis.name, opt.value)"
          />
          <span>{{ opt.label }}</span>
        </label>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
/**
 * VariationPicker — extracted radio-group picker for product variations.
 *
 * Pure props-in component. Groups variations by axis (size, color,
 * width) and renders PrimeVue RadioButtons. Emits `variant-changed`
 * with the full selected-state map so the parent can resolve a
 * specific variation id.
 *
 * Debouncing is the parent's concern (`ProductDetail` debounces the
 * emit per EJG-COMP-2).
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-2} — variant-changed is debounced by ProductDetail
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed, reactive, watch } from 'vue';
import RadioButton from 'primevue/radiobutton';

interface Variation {
  id: string;
  size?: string;
  color?: string;
  width?: string;
}

interface Props {
  /** Variations array — each variation may have size/color/width keys. */
  variations: readonly Variation[];
}

const props = defineProps<Props>();

const VariationPicker = 'VariationPicker';

interface AxisOption {
  readonly value: string;
  readonly label: string;
}

interface Axis {
  readonly name: 'size' | 'color' | 'width';
  readonly options: readonly AxisOption[];
}

const AXIS_ORDER: ReadonlyArray<'size' | 'color' | 'width'> = ['size', 'color', 'width'];

const axes = computed<readonly Axis[]>(() => {
  const out: Axis[] = [];
  for (const axis of AXIS_ORDER) {
    const seen = new Map<string, string>();
    for (const v of props.variations) {
      const raw = v[axis];
      if (typeof raw !== 'string' || raw.length === 0) continue;
      if (!seen.has(raw)) {
        seen.set(raw, raw.charAt(0).toUpperCase() + raw.slice(1));
      }
    }
    if (seen.size > 0) {
      const options: AxisOption[] = Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
      options.sort((a, b) => a.label.localeCompare(b.label));
      out.push({ name: axis, options });
    }
  }
  return out;
});

const selected = reactive<Record<string, string>>({});

watch(
  axes,
  (next) => {
    for (const axis of next) {
      if (selected[axis.name] === undefined) {
        const first = axis.options[0];
        if (first) selected[axis.name] = first.value;
      }
    }
  },
  { immediate: true },
);

const emit = defineEmits<{
  (e: 'variant-changed', payload: Record<string, string>): void;
}>();

function onAxisChange(axisName: 'size' | 'color' | 'width', value: string): void {
  selected[axisName] = value;
  emit('variant-changed', { ...selected });
}
</script>

<style scoped>
.variation-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variation-picker-axis {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: none;
  padding: 0;
  margin: 0;
}

.variation-picker-axis-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gp-text);
  text-transform: capitalize;
}

.variation-picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variation-picker-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm, 4px);
  background: var(--gp-surface);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--gp-text);
  transition: border-color 0.1s ease, background 0.1s ease;
}

.variation-picker-option:hover {
  background: var(--gp-surface-hover);
}

.variation-picker-option--selected {
  border-color: var(--gp-accent);
  background: var(--gp-surface-hover);
}
</style>