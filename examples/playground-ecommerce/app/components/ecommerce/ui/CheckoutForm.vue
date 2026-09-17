<template>
  <form
    class="checkout-form"
    :data-component="CheckoutForm"
    :data-step="step"
    data-test="checkout-form"
    @submit.prevent="onPlaceOrder"
  >
    <TabView class="checkout-form-tabs">
      <TabPanel header="Contact">
        <div class="checkout-form-section">
          <CheckoutField
            label="Email"
            :value="contact.email"
            :error="errors.email"
            @checkout-field-changed="(v) => onField('contact.email', v)"
          />
          <CheckoutField
            label="Phone (optional)"
            :value="contact.phone"
            :error="errors.phone"
            @checkout-field-changed="(v) => onField('contact.phone', v)"
          />
        </div>
      </TabPanel>

      <TabPanel header="Shipping address">
        <div class="checkout-form-section">
          <CheckoutField
            label="Full name"
            :value="shipping.name"
            :error="errors['shipping.name']"
            @checkout-field-changed="(v) => onField('shipping.name', v)"
          />
          <CheckoutField
            label="Address line 1"
            :value="shipping.line1"
            :error="errors['shipping.line1']"
            @checkout-field-changed="(v) => onField('shipping.line1', v)"
          />
          <CheckoutField
            label="Address line 2 (optional)"
            :value="shipping.line2 ?? ''"
            :error="errors['shipping.line2']"
            @checkout-field-changed="(v) => onField('shipping.line2', v)"
          />
          <div class="checkout-form-row">
            <CheckoutField
              label="City"
              :value="shipping.city"
              :error="errors['shipping.city']"
              @checkout-field-changed="(v) => onField('shipping.city', v)"
            />
            <CheckoutField
              label="Postal code"
              :value="shipping.postal_code"
              :error="errors['shipping.postal_code']"
              @checkout-field-changed="(v) => onField('shipping.postal_code', v)"
            />
          </div>
          <CheckoutField
            label="Country"
            :value="shipping.country"
            :error="errors['shipping.country']"
            @checkout-field-changed="(v) => onField('shipping.country', v)"
          />
        </div>
      </TabPanel>

      <TabPanel header="Shipping method">
        <div class="checkout-form-section">
          <div v-if="shippingMethods.length === 0" class="checkout-form-empty">
            No shipping methods available.
          </div>
          <label
            v-for="method in shippingMethods"
            :key="method.id"
            class="checkout-form-radio"
            :data-test="`checkout-form-shipping-${method.id}`"
          >
            <RadioButton
              :name="'shipping-method'"
              :value="method.id"
              :model-value="selectedShippingMethod"
              @update:model-value="onShippingMethod"
            />
            <div class="checkout-form-radio-body">
              <strong>{{ method.label }}</strong>
              <span v-if="method.description" class="checkout-form-radio-meta">{{ method.description }}</span>
            </div>
            <PriceTag :amount="method.amount" :currency="method.currency_code" />
          </label>
        </div>
      </TabPanel>

      <TabPanel header="Payment">
        <div class="checkout-form-section">
          <div v-if="paymentMethods.length === 0" class="checkout-form-empty">
            No payment methods available.
          </div>
          <label
            v-for="method in paymentMethods"
            :key="method.id"
            class="checkout-form-radio"
            :data-test="`checkout-form-payment-${method.id}`"
          >
            <RadioButton
              :name="'payment-method'"
              :value="method.id"
              :model-value="selectedPaymentMethod"
              @update:model-value="onPaymentMethod"
            />
            <div class="checkout-form-radio-body">
              <strong>{{ method.label }}</strong>
              <span v-if="method.description" class="checkout-form-radio-meta">{{ method.description }}</span>
            </div>
          </label>
        </div>
      </TabPanel>
    </TabView>

    <div class="checkout-form-actions">
      <Button
        type="submit"
        label="Place order"
        icon="pi pi-check"
        severity="primary"
        data-test="checkout-form-place-order"
        @click="onPlaceOrder"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
/**
 * CheckoutForm — Step 6 one-screen checkout (contact + shipping + shipping-method + payment).
 *
 * Pure props-in component. Owns local form state. Emits:
 *   - `checkout-field-changed` debounced (per EJG-COMP-2 style) so the
 *     agent can recalc shipping
 *   - `payment-method-selected` on selection change
 *   - `place-order` on submit
 *
 * @see {M5.2-T4-AC2} — ui/ has no data fetching
 * @see {EJG-LAYOUT-1} — three-layer rule
 */
import { computed, reactive, ref, watch } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import RadioButton from 'primevue/radiobutton';
import Button from 'primevue/button';
import CheckoutField from './CheckoutField.vue';
import PriceTag from './PriceTag.vue';

interface Contact {
  email: string;
  phone?: string;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

interface ShippingMethod {
  id: string;
  label: string;
  description?: string;
  amount: number;
  currency_code: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  /** Step index 0-3 (0=contact, 1=shipping, 2=shipping-method, 3=payment). */
  step?: number;
  /** Optional initial contact values. */
  contact?: Partial<Contact>;
  /** Optional initial shipping address values. */
  shipping?: Partial<ShippingAddress>;
}

const props = withDefaults(defineProps<Props>(), {
  step: 0,
  contact: () => ({}),
  shipping: () => ({}),
});

const CheckoutForm = 'CheckoutForm';

interface FormState {
  email: string;
  phone: string;
}

interface ShippingState {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
}

const contact = reactive<FormState>({
  email: String(props.contact?.email ?? ''),
  phone: String(props.contact?.phone ?? ''),
});

const shipping = reactive<ShippingState>({
  name: String(props.shipping?.name ?? ''),
  line1: String(props.shipping?.line1 ?? ''),
  line2: String(props.shipping?.line2 ?? ''),
  city: String(props.shipping?.city ?? ''),
  postal_code: String(props.shipping?.postal_code ?? ''),
  country: String(props.shipping?.country ?? 'US'),
});

/** Static placeholder options — real wire-up passes these in via props. */
const shippingMethods = ref<readonly ShippingMethod[]>([
  { id: 'standard', label: 'Standard (3-5 days)', description: 'USPS', amount: 0, currency_code: 'USD' },
  { id: 'express', label: 'Express (1-2 days)', description: 'UPS', amount: 9.99, currency_code: 'USD' },
]);

const paymentMethods = ref<readonly PaymentMethod[]>([
  { id: 'card', label: 'Credit / debit card', description: 'Visa, Mastercard, Amex' },
  { id: 'paypal', label: 'PayPal', description: 'You will be redirected' },
]);

const selectedShippingMethod = ref<string>(shippingMethods.value[0]?.id ?? '');
const selectedPaymentMethod = ref<string>(paymentMethods.value[0]?.id ?? '');

interface ErrorMap {
  [key: string]: string;
}

const errors = reactive<ErrorMap>({});

const emit = defineEmits<{
  (
    e: 'checkout-field-changed',
    payload: { field: string; value: string; contact: FormState; shipping: ShippingState },
  ): void;
  (e: 'payment-method-selected', payload: { methodId: string }): void;
  (e: 'place-order', payload: { contact: FormState; shipping: ShippingState; shippingMethod: string; paymentMethod: string }): void;
}>();

let debounceHandle: ReturnType<typeof setTimeout> | null = null;

function scheduleEmit(field: string, value: string): void {
  if (debounceHandle !== null) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    debounceHandle = null;
    emit('checkout-field-changed', {
      field,
      value,
      contact: { ...contact },
      shipping: { ...shipping },
    });
  }, 250);
}

function onField(field: string, value: string): void {
  if (field.startsWith('contact.')) {
    const k = field.slice('contact.'.length) as keyof FormState;
    contact[k] = value;
  } else if (field.startsWith('shipping.')) {
    const k = field.slice('shipping.'.length) as keyof ShippingState;
    shipping[k] = value;
  }
  if (Object.prototype.hasOwnProperty.call(errors, field)) {
    delete errors[field];
  }
  scheduleEmit(field, value);
}

function onShippingMethod(value: string | undefined): void {
  selectedShippingMethod.value = value ?? '';
}

function onPaymentMethod(value: string | undefined): void {
  selectedPaymentMethod.value = value ?? '';
  emit('payment-method-selected', { methodId: selectedPaymentMethod.value });
}

function onPlaceOrder(): void {
  // Light client-side validation — server-side validation is the agent's
  // responsibility (F14 trust boundary + VaahStore API validation).
  if (contact.email.trim().length === 0) errors.email = 'Email is required.';
  if (shipping.line1.trim().length === 0) errors['shipping.line1'] = 'Address line 1 is required.';
  if (shipping.city.trim().length === 0) errors['shipping.city'] = 'City is required.';
  if (shipping.postal_code.trim().length === 0) errors['shipping.postal_code'] = 'Postal code is required.';
  if (Object.keys(errors).length > 0) return;

  emit('place-order', {
    contact: { ...contact },
    shipping: { ...shipping },
    shippingMethod: selectedShippingMethod.value,
    paymentMethod: selectedPaymentMethod.value,
  });
}

watch(
  () => props.step,
  (next) => {
    void next;
  },
);
</script>

<style scoped>
.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.checkout-form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
}

.checkout-form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.checkout-form-empty {
  padding: 12px 0;
  color: var(--gp-text-muted);
}

.checkout-form-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--gp-border);
  border-radius: var(--gp-radius-sm, 4px);
  background: var(--gp-surface);
  cursor: pointer;
}

.checkout-form-radio:hover {
  background: var(--gp-surface-hover);
}

.checkout-form-radio-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkout-form-radio-meta {
  font-size: 0.8125rem;
  color: var(--gp-text-muted);
}

.checkout-form-actions {
  display: flex;
  justify-content: flex-end;
}
</style>