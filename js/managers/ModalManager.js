import { CONFIG } from '../components/kanbanBoardConfig.js';

export default class ModalManager {
  constructor() {
    this.modals = {};
    this.setupGlobalListeners();
  }

  register(name, { modalId, overlayId, formId, onReset }) {
    const el = document.getElementById(modalId);
    const overlay = document.getElementById(overlayId);
    const form = formId ? document.getElementById(formId) : null;

    if (!el) {
      console.warn(`Modal element ${modalId} not found`);
      return;
    }

    this.modals[name] = { el, overlay, form, onReset };

    if (overlay) {
      overlay.addEventListener('click', () => this.close(name));
    }
  }

  open(name) {
    const modal = this.modals[name];
    if (modal) {
      modal.el.classList.add('active');
      modal.el.setAttribute('aria-hidden', 'false');
    }
  }

  close(name) {
    const modal = this.modals[name];
    if (modal) {
      modal.el.classList.remove('active');
      modal.el.setAttribute('aria-hidden', 'true');
      if (modal.onReset) modal.onReset();
      else if (modal.form) modal.form.reset();
    }
  }

  closeAll() {
    Object.keys(this.modals).forEach((name) => this.close(name));
  }
  setupGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === CONFIG.keys.escape) {
        this.closeAll();
      }
    });
  }
}
