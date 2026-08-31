// TodoList adaptor — proves array props + item-level actions.
// Two-way state: the browser holds the source-of-truth (the items array,
// which lives in the props), and the agent can update it via
// update_component with a new items array.

import { BaseAdaptor } from './base-adaptor.mjs';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export const todoListAdaptor = new BaseAdaptor({
  schema: {
    name: 'TodoList',
    description: 'A list of todo items with checkboxes. Users can toggle ' +
                 'items as done, add new items, remove items, and clear ' +
                 'completed items. The list lives entirely in props; the ' +
                 'agent updates it by sending a new items array.',
    whenToUse: [
      'show a todo list',
      'list of tasks to do',
      'checklist or checkbox list',
      'user wants to track tasks or items to do',
    ],
    category: 'data-display',
    propDescriptors: [
      { name: 'title', type: 'string', required: false },
      {
        name: 'items',
        type: 'array',
        required: true,
        itemShape: { id: 'string', text: 'string', done: 'boolean' },
      },
    ],
    actions: [
      { name: 'item_toggled',  description: 'User toggled a checkbox' },
      { name: 'item_added',    description: 'User added a new item' },
      { name: 'item_removed',  description: 'User removed an item' },
      { name: 'clear_completed', description: 'User removed all done items' },
    ],
  },

  component: {
    html(props) {
      const items = Array.isArray(props.items) ? props.items : [];
      const title = escapeHtml(props.title ?? 'Todo');
      const rows = items.map(i => `
        <li class="gu-todo-row" data-id="${escapeHtml(i.id)}">
          <input type="checkbox" ${i.done ? 'checked' : ''} data-act="toggle" />
          <span class="${i.done ? 'gu-todo-done' : ''}">${escapeHtml(i.text)}</span>
          <button data-act="remove" class="gu-btn gu-btn-tiny" title="remove">×</button>
        </li>`).join('');
      return `
<div class="gu-comp gu-todo">
  <div class="gu-todo-title">${title} <span class="gu-todo-count">(${items.length})</span></div>
  <ul class="gu-todo-list">${rows || '<li class="gu-todo-empty">No items</li>'}</ul>
  <form class="gu-todo-add" data-act="add">
    <input type="text" placeholder="Add an item…" name="text" />
    <button type="submit" class="gu-btn">Add</button>
  </form>
  ${items.some(i => i.done) ? '<button data-act="clear-completed" class="gu-btn gu-btn-secondary">Clear completed</button>' : ''}
</div>`;
    },

    wire(el, props, onAction) {
      el.querySelectorAll('[data-act="toggle"]').forEach(cb => {
        cb.onchange = (e) => {
          const li = e.target.closest('.gu-todo-row');
          onAction({
            action: 'item_toggled',
            payload: { id: li.dataset.id },
          });
        };
      });
      el.querySelectorAll('[data-act="remove"]').forEach(btn => {
        btn.onclick = (e) => {
          const li = e.target.closest('.gu-todo-row');
          onAction({
            action: 'item_removed',
            payload: { id: li.dataset.id, text: li.querySelector('span').textContent },
          });
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
        };
      }
      const clearBtn = el.querySelector('[data-act="clear-completed"]');
      if (clearBtn) {
        clearBtn.onclick = () => onAction({ action: 'clear_completed' });
      }
    },
  },

  getState(props) {
    const items = Array.isArray(props.items) ? props.items : [];
    return {
      items: items.map((it, idx) => ({ index: idx, ...it })),
      totalCount: items.length,
      pendingCount: items.filter(i => !i.done).length,
      completedCount: items.filter(i => i.done).length,
    };
  },
});
