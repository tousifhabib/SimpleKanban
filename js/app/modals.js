// Modal registry as a closure factory. nameContaining gives event code a
// proper query instead of reaching into registry internals. Open modals
// trap Tab focus inside themselves and return focus to the opener on
// close.

import { fromNullable } from '../fp/maybe.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const createModals = (doc) => {
  const registry = new Map();

  const visibleFocusables = (root) =>
    Array.from(root.querySelectorAll(FOCUSABLE)).filter(
      (elem) => elem.offsetParent !== null
    );

  const close = (name) => {
    const modal = registry.get(name);
    if (!modal || !modal.el.classList.contains('active')) return;
    modal.el.classList.remove('active');
    modal.el.setAttribute('aria-hidden', 'true');
    if (modal.trap) {
      modal.el.removeEventListener('keydown', modal.trap);
      modal.trap = null;
    }
    modal.onReset?.() ?? modal.form?.reset();
    modal.lastFocused?.focus?.();
    modal.lastFocused = null;
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
      if (!modal) return;
      modal.lastFocused = doc.activeElement;
      modal.el.classList.add('active');
      modal.el.setAttribute('aria-hidden', 'false');

      visibleFocusables(modal.el)[0]?.focus();

      modal.trap = (e) => {
        if (e.key !== 'Tab') return;
        const items = visibleFocusables(modal.el);
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && doc.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && doc.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      modal.el.addEventListener('keydown', modal.trap);
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
