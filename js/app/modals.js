// Modal registry as a closure factory. nameContaining gives event code a
// proper query instead of reaching into registry internals.

import { fromNullable } from '../fp/maybe.js';

export const createModals = (doc) => {
  const registry = new Map();

  const close = (name) => {
    const modal = registry.get(name);
    if (!modal) return;
    modal.el.classList.remove('active');
    modal.el.setAttribute('aria-hidden', 'true');
    modal.onReset?.() ?? modal.form?.reset();
  };

  const closeAll = () => registry.forEach((_, name) => close(name));

  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  return Object.freeze({
    register(name, { modalId, overlayId, formId, onReset }) {
      const modal = doc.getElementById(modalId);
      if (!modal) return;
      doc
        .getElementById(overlayId)
        ?.addEventListener('click', () => close(name));
      registry.set(name, {
        el: modal,
        form: formId ? doc.getElementById(formId) : null,
        onReset,
      });
    },

    open(name) {
      const modal = registry.get(name);
      modal?.el.classList.add('active');
      modal?.el.setAttribute('aria-hidden', 'false');
    },

    close,
    closeAll,

    // Maybe<string>: the registered modal whose element contains `element`.
    nameContaining: (element) =>
      fromNullable(
        [...registry.keys()].find((name) =>
          registry.get(name).el.contains(element)
        )
      ),
  });
};
