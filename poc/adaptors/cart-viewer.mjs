// CartViewer adaptor — composite component (proves the pattern + voice resolution).
// Demonstrates: a richer UI surface, computed totals, and a getState() rich
// enough to resolve "remove the first item" via index lookup.

import { BaseAdaptor } from './base-adaptor.mjs';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatCurrency(n) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export const cartViewerAdaptor = new BaseAdaptor({
  schema: {
    name: 'CartViewer',
    description: 'A shopping cart showing line items with quantity controls, ' +
                 'remove buttons, subtotal/tax/total breakdown, and a ' +
                 'checkout button. State supports voice resolution like ' +
                 '"remove the first item" via get_component_state.',
    whenToUse: [
      'show the cart',
      'shopping cart with items and total',
      'review cart before checkout',
      'user asks "what is in my cart" or "show my cart"',
    ],
    category: 'ecommerce',
    propDescriptors: [
      {
        name: 'items',
        type: 'array',
        required: true,
        itemShape: { id: 'string', name: 'string', price: 'number', qty: 'number' },
      },
      { name: 'tax',      type: 'number', required: false },
      { name: 'shipping', type: 'number', required: false },
    ],
    actions: [
      { name: 'item_removed',       description: 'User removed an item' },
      { name: 'quantity_changed',   description: 'User changed item quantity' },
      { name: 'checkout_requested', description: 'User clicked checkout' },
      { name: 'clear_cart_requested', description: 'User clicked clear cart' },
    ],
  },

  component: {
    html(props) {
      const items = Array.isArray(props.items) ? props.items : [];
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const tax = props.tax ?? Math.round(subtotal * 0.08 * 100) / 100;
      const shipping = props.shipping ?? 0;
      const total = subtotal + tax + shipping;

      const rows = items.map(it => `
        <tr data-id="${escapeHtml(it.id)}">
          <td>${escapeHtml(it.name)}</td>
          <td class="gu-cart-qty">
            <button data-act="qty-dec" class="gu-btn gu-btn-tiny">−</button>
            <span>${it.qty}</span>
            <button data-act="qty-inc" class="gu-btn gu-btn-tiny">+</button>
          </td>
          <td>${formatCurrency(it.price)}</td>
          <td>${formatCurrency(it.price * it.qty)}</td>
          <td><button data-act="remove" class="gu-btn gu-btn-tiny">×</button></td>
        </tr>`).join('');

      return `
<div class="gu-comp gu-cart">
  <div class="gu-cart-title">🛒 Cart</div>
  ${items.length === 0 ? '<div class="gu-cart-empty">Your cart is empty.</div>' : `
  <table class="gu-cart-table">
    <thead><tr>
      <th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" align="right">Subtotal:</td><td>${formatCurrency(subtotal)}</td><td></td></tr>
      <tr><td colspan="3" align="right">Tax:</td><td>${formatCurrency(tax)}</td><td></td></tr>
      <tr><td colspan="3" align="right">Shipping:</td><td>${formatCurrency(shipping)}</td><td></td></tr>
      <tr class="gu-cart-grand"><td colspan="3" align="right"><b>Total:</b></td><td><b>${formatCurrency(total)}</b></td><td></td></tr>
    </tfoot>
  </table>
  <div class="gu-cart-actions">
    <button data-act="clear" class="gu-btn gu-btn-secondary">Clear cart</button>
    <button data-act="checkout" class="gu-btn gu-btn-primary" ${items.length === 0 ? 'disabled' : ''}>Checkout →</button>
  </div>`}
</div>`;
    },

    wire(el, props, onAction) {
      el.querySelectorAll('[data-act="remove"]').forEach(btn => {
        btn.onclick = (e) => {
          const tr = e.target.closest('tr');
          const id = tr.dataset.id;
          const name = tr.querySelector('td').textContent;
          onAction({ action: 'item_removed', payload: { id, name } });
        };
      });
      el.querySelectorAll('[data-act="qty-inc"]').forEach(btn => {
        btn.onclick = (e) => {
          const tr = e.target.closest('tr');
          const id = tr.dataset.id;
          const qty = parseInt(tr.querySelector('.gu-cart-qty span').textContent, 10);
          onAction({ action: 'quantity_changed', payload: { id, newQuantity: qty + 1 } });
        };
      });
      el.querySelectorAll('[data-act="qty-dec"]').forEach(btn => {
        btn.onclick = (e) => {
          const tr = e.target.closest('tr');
          const id = tr.dataset.id;
          const qty = parseInt(tr.querySelector('.gu-cart-qty span').textContent, 10);
          onAction({
            action: 'quantity_changed',
            payload: { id, newQuantity: Math.max(1, qty - 1) },
          });
        };
      });
      const checkoutBtn = el.querySelector('[data-act="checkout"]');
      if (checkoutBtn) checkoutBtn.onclick = () => onAction({ action: 'checkout_requested' });
      const clearBtn = el.querySelector('[data-act="clear"]');
      if (clearBtn) clearBtn.onclick = () => onAction({ action: 'clear_cart_requested' });
    },
  },

  getState(props) {
    const items = Array.isArray(props.items) ? props.items : [];
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const tax = props.tax ?? Math.round(subtotal * 0.08 * 100) / 100;
    const shipping = props.shipping ?? 0;
    return {
      items: items.map((it, idx) => ({
        index: idx,
        id: it.id,
        name: it.name,
        price: it.price,
        qty: it.qty,
        lineTotal: it.price * it.qty,
      })),
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
      itemCount: items.reduce((s, it) => s + it.qty, 0),
      uniqueItemCount: items.length,
    };
  },
});
