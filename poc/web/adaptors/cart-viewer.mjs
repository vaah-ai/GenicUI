// Browser-side wiring for CartViewer. See ./counter.mjs for the rationale
// for a separate browser-side copy of the wire function and the optional
// `setState` updater.

export function wire(el, _props, onAction, setState) {
  const update = setState || (() => {});

  el.querySelectorAll('[data-act="remove"]').forEach(btn => {
    btn.onclick = (e) => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      const name = tr.querySelector('td').textContent;
      onAction({ action: 'item_removed', payload: { id, name } });
      update((s) => ({
        ...s,
        items: (s.items || []).filter(it => it.id !== id),
      }));
    };
  });
  el.querySelectorAll('[data-act="qty-inc"]').forEach(btn => {
    btn.onclick = (e) => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      const qty = parseInt(tr.querySelector('.gu-cart-qty span').textContent, 10);
      onAction({ action: 'quantity_changed', payload: { id, newQuantity: qty + 1 } });
      update((s) => ({
        ...s,
        items: (s.items || []).map(it =>
          it.id === id ? { ...it, qty: qty + 1 } : it
        ),
      }));
    };
  });
  el.querySelectorAll('[data-act="qty-dec"]').forEach(btn => {
    btn.onclick = (e) => {
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      const qty = parseInt(tr.querySelector('.gu-cart-qty span').textContent, 10);
      const nextQty = Math.max(1, qty - 1);
      onAction({ action: 'quantity_changed', payload: { id, newQuantity: nextQty } });
      update((s) => ({
        ...s,
        items: (s.items || []).map(it =>
          it.id === id ? { ...it, qty: nextQty } : it
        ),
      }));
    };
  });
  const checkoutBtn = el.querySelector('[data-act="checkout"]');
  if (checkoutBtn) checkoutBtn.onclick = () => onAction({ action: 'checkout_requested' });
  const clearBtn = el.querySelector('[data-act="clear"]');
  if (clearBtn) clearBtn.onclick = () => {
    onAction({ action: 'clear_cart_requested' });
    update((s) => ({ ...s, items: [] }));
  };
}
