const ESCAPE_KEY = 'Escape';

export default class ModalManager {
  modals = new Map();

  constructor() {
    document.addEventListener('keydown', (e) => {
      if (e.key === ESCAPE_KEY) this.closeAll();
    });
  }

  register(name, config) {
    const modal = document.getElementById(config.modalId);
    if (!modal) return;

    const overlay = document.getElementById(config.overlayId);
    overlay?.addEventListener('click', () => this.close(name));

    this.modals.set(name, {
      el: modal,
      form: config.formId ? document.getElementById(config.formId) : null,
      onReset: config.onReset,
    });
  }

  open(name) {
    const modal = this.modals.get(name);
    modal?.el.classList.add('active');
    modal?.el.setAttribute('aria-hidden', 'false');
  }

  close(name) {
    const modal = this.modals.get(name);
    if (!modal) return;
    modal.el.classList.remove('active');
    modal.el.setAttribute('aria-hidden', 'true');
    modal.onReset?.() ?? modal.form?.reset();
  }

  closeAll() {
    this.modals.forEach((_, name) => this.close(name));
  }
}
