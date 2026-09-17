<template>
  <section class="order-processing" :data-component="OrderProcessing" data-test="order-processing">
    <h3 class="order-processing-title">Placing your order…</h3>

    <ol class="order-processing-steps">
      <li
        v-for="(s, idx) in normalizedSteps"
        :key="s.id"
        class="order-processing-step"
        :class="stepClass(s)"
        :data-test="`order-processing-step-${s.id}`"
      >
        <span class="order-processing-step-index" aria-hidden="true">{{ idx + 1 }}</span>
        <div class="order-processing-step-body">
          <div class="order-processing-step-label">{{ s.label }}</div>
          <div v-if="s.error" class="order-processing-step-error" :data-test="`order-processing-step-error-${s.id}`">
            {{ s.error }}
          </div>
        </div>
        <div class="order-processing-step-actions">
          <Tag
            v-if="s.status === 'success'"
            value="Done"
            severity="success"
            class="order-processing-step-tag"
            data-test="order-processing-step-status"
          />
          <Tag
            v-else-if="s.status === 'running'"
            value="Running"
            severity="info"
            class="order-processing-step-tag"
            data-test="order-processing-step-status"
          />
          <Tag
            v-else-if="s.status === 'failed'"
            value="Failed"
            severity="danger"
            class="order-processing-step-tag"
            data-test="order-processing-step-status"
          />
          <Button
            v-if="s.status === 'failed'"
            label="Retry"
            icon="pi pi-refresh"
            severity="danger"
            text
            size="small"
            :data-test="`order-processing-step-retry-${s.id}`"
            @click="emit('step-retry', { stepId: s.id })"
          />
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
/**
 * OrderProcessing — Step 7 progress indicator.
 *
 * EJG-COMP-4: each step reflects per-API-call status independently.
 * A failed step renders inline API error + Retry button; the other
 * steps keep their own state (no global reset).
 *
 * Pure props-in component. Emits `step-retry` on Retry click.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-4} — per-step status + retry
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed } from 'vue';
import Tag from 'primevue/tag';
import Button from 'primevue/button';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

interface Props {
  steps: readonly ProcessingStep[];
}

const props = defineProps<Props>();

const OrderProcessing = 'OrderProcessing';

const normalizedSteps = computed<readonly ProcessingStep[]>(() =>
  Array.isArray(props.steps) ? props.steps : [],
);

const emit = defineEmits<{
  (e: 'step-retry', payload: { stepId: string }): void;
}>();

function stepClass(s: ProcessingStep): string {
  return `order-processing-step--${s.status}`;
}
</script>

<style scoped>
.order-processing {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 640px;
  margin: 16px auto;
}

.order-processing-title {
  margin: 0;
  font-size: 1.125rem;
  color: var(--gp-text);
}

.order-processing-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-processing-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm, 4px);
  background: var(--gp-surface);
}

.order-processing-step--success {
  border-color: var(--gp-accent);
}

.order-processing-step--failed {
  border-color: var(--gp-danger, #d04);
  background: color-mix(in srgb, var(--gp-danger, #d04) 8%, var(--gp-surface));
}

.order-processing-step--running {
  border-color: var(--gp-info, #39c);
}

.order-processing-step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--gp-surface-hover);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gp-text);
  flex-shrink: 0;
}

.order-processing-step--success .order-processing-step-index {
  background: var(--gp-accent);
  color: var(--gp-accent-on, #fff);
}

.order-processing-step--failed .order-processing-step-index {
  background: var(--gp-danger, #d04);
  color: #fff;
}

.order-processing-step-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-processing-step-label {
  font-weight: 500;
  color: var(--gp-text);
}

.order-processing-step-error {
  font-size: 0.8125rem;
  color: var(--gp-danger, #d04);
}

.order-processing-step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.order-processing-step-tag {
  text-transform: capitalize;
}
</style>