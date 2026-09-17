<template>
  <Transition name="mini-cart-toast-fade">
    <Card
      v-if="visible"
      class="mini-cart-toast"
      :data-component="MiniCartToast"
      data-test="mini-cart-toast"
      role="status"
      aria-live="polite"
    >
      <template #content>
        <div class="mini-cart-toast-row">
          <span class="mini-cart-toast-icon" aria-hidden="true">✓</span>
          <div class="mini-cart-toast-text">
            <strong>Added</strong>
            <span class="mini-cart-toast-product"> — {{ productName }}</span>
            <div class="mini-cart-toast-actions">
              <Button
                label="Keep browsing"
                severity="secondary"
                text
                size="small"
                data-test="mini-cart-toast-dismiss"
                @click="onDismiss"
              />
              <Button
                label="Go to cart"
                severity="primary"
                text
                size="small"
                data-test="mini-cart-toast-cart"
                @click="onGoToCart"
              />
            </div>
          </div>
          <Button
            icon="pi pi-times"
            severity="secondary"
            text
            rounded
            size="small"
            aria-label="Dismiss"
            class="mini-cart-toast-close"
            data-test="mini-cart-toast-close"
            @click="onDismiss"
          />
        </div>
      </template>
    </Card>
  </Transition>
</template>

<script setup lang="ts">
/**
 * MiniCartToast — transient "Added to cart" notification (Step 4 Path A).
 *
 * EJG-COMP-3: this component mounts OVER `ProductDetail` (rendered
 * as a separate component by the agent) and does NOT unmount it.
 * The component itself owns the auto-dismiss timer; the parent
 * surfaces both this toast and the underlying product detail as
 * siblings — they're independent mounts in the chat-panel tree.
 *
 * Auto-dismiss after `AUTO_DISMISS_MS` (3000ms). User-click on the
 * close button or the "Keep browsing" button dismisses immediately.
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-COMP-3} — mounts over ProductDetail without unmounting it
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { onBeforeUnmount, ref, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';

interface Props {
  /** Display name of the added product. */
  productName: string;
}

const props = defineProps<Props>();

const MiniCartToast = 'MiniCartToast';

const AUTO_DISMISS_MS = 3000;

const visible = ref<boolean>(true);

let dismissHandle: ReturnType<typeof setTimeout> | null = null;

function clearTimer(): void {
  if (dismissHandle !== null) {
    clearTimeout(dismissHandle);
    dismissHandle = null;
  }
}

function armTimer(): void {
  clearTimer();
  dismissHandle = setTimeout(() => {
    dismissHandle = null;
    visible.value = false;
  }, AUTO_DISMISS_MS);
}

const emit = defineEmits<{
  (e: 'dismiss', payload: Record<string, never>): void;
  (e: 'go-to-cart', payload: Record<string, never>): void;
}>();

function onDismiss(): void {
  clearTimer();
  visible.value = false;
  emit('dismiss', {});
}

function onGoToCart(): void {
  clearTimer();
  visible.value = false;
  emit('go-to-cart', {});
}

/** Reset the timer if the product changes (e.g. another add-to-cart). */
watch(() => props.productName, () => {
  visible.value = true;
  armTimer();
});

armTimer();

onBeforeUnmount(() => {
  clearTimer();
});
</script>

<style scoped>
.mini-cart-toast {
  width: 100%;
  max-width: 360px;
  border: 1px solid var(--gp-border);
  background: var(--gp-surface);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.mini-cart-toast-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.mini-cart-toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--gp-accent);
  color: var(--gp-accent-on, #fff);
  font-weight: 700;
  flex-shrink: 0;
}

.mini-cart-toast-text {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-cart-toast-product {
  color: var(--gp-text);
}

.mini-cart-toast-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.mini-cart-toast-close {
  flex-shrink: 0;
}

.mini-cart-toast-fade-enter-active,
.mini-cart-toast-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.mini-cart-toast-fade-enter-from,
.mini-cart-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>