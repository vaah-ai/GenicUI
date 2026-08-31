// Browser-side wiring for TodoList. See ./counter.mjs for the rationale
// for a separate browser-side copy of the wire function and the optional
// `setState` updater.

export function wire(el, _props, onAction, setState) {
  const update = setState || (() => {});

  el.querySelectorAll('[data-act="toggle"]').forEach(cb => {
    cb.onchange = (e) => {
      const li = e.target.closest('.gu-todo-row');
      const id = li.dataset.id;
      onAction({ action: 'item_toggled', payload: { id } });
      update((s) => ({
        ...s,
        items: (s.items || []).map(it =>
          it.id === id ? { ...it, done: !it.done } : it
        ),
      }));
    };
  });
  el.querySelectorAll('[data-act="remove"]').forEach(btn => {
    btn.onclick = (e) => {
      const li = e.target.closest('.gu-todo-row');
      const id = li.dataset.id;
      onAction({
        action: 'item_removed',
        payload: { id, text: li.querySelector('span').textContent },
      });
      update((s) => ({
        ...s,
        items: (s.items || []).filter(it => it.id !== id),
      }));
    };
  });
  const form = el.querySelector('[data-act="add"]');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const input = form.querySelector('input[name=text]');
      const text = input.value.trim();
      if (!text) return;
      onAction({ action: 'item_added', payload: { text } });
      input.value = '';
      update((s) => ({
        ...s,
        items: [...(s.items || []), {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          done: false,
        }],
      }));
    };
  }
  const clearBtn = el.querySelector('[data-act="clear-completed"]');
  if (clearBtn) {
    clearBtn.onclick = () => {
      onAction({ action: 'clear_completed' });
      update((s) => ({
        ...s,
        items: (s.items || []).filter(it => !it.done),
      }));
    };
  }
}
