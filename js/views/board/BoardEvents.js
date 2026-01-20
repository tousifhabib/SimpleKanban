import { store } from '../../state/Store.js';
import { i18n } from '../../services/i18n/i18nService.js';

const ACTION_ALIASES = new Map([
  ['.label-delete-btn', 'delete-label'],
  ['.label-edit-btn', 'edit-label'],
  ['.dependency-remove-btn', 'remove-dependency'],
  ['.column-title-text', 'edit-column-title'],
  ['.add-card-btn', 'toggle-add-card'],
]);

export const setupBoardEvents = ({
  ui,
  modals,
  commands,
  formHandlers,
  openCard,
  saveColTitle,
}) => {
  const findAction = (target) => {
    const actionEl = target.closest('[data-action]');
    if (actionEl) return { key: actionEl.dataset.action, el: actionEl };

    for (const [selector, action] of ACTION_ALIASES) {
      if (target.matches(selector)) return { key: action, el: target };
    }

    return { key: target.id, el: target };
  };

  const handleClick = (e) => {
    const t = e.target;

    const viewBtn = t.closest('.nav-btn');
    if (viewBtn) return ui.onSwitchView?.(viewBtn.dataset.view);

    if (t.id?.startsWith('cancel') || t.id?.endsWith('CloseBtn')) {
      const modalName = [...modals.modals.keys()].find((k) =>
        modals.modals.get(k).el.contains(t)
      );
      if (modalName) return modals.close(modalName);
    }

    const { key, el } = findAction(t);
    if (commands.has(key)) return commands.get(key)(el);

    const card = t.closest('.card');
    if (
      card &&
      !card.classList.contains('dragging') &&
      !t.closest('.card-actions') &&
      !t.closest('.card-complete-toggle')
    ) {
      openCard(card.dataset.cardId, card.closest('.column').dataset.columnId);
    }
  };

  const handleChange = (e) => {
    const t = e.target;
    if (t.id === 'langSelector') i18n.setLanguage(t.value);
    if (t.id === 'boardSelector') store.setActiveBoard(t.value);
    if (t.id === 'importFileInput' && t.files[0]) {
      const r = new FileReader();
      r.onload = (ev) => store.importData(ev.target.result);
      r.readAsText(t.files[0]);
    }
    if (t.matches('.card-complete-checkbox')) {
      store.toggleCardComplete(
        t.closest('.column').dataset.columnId,
        t.closest('.card').dataset.cardId
      );
    }
    if (t.closest('#labelsSelector')) {
      ui.onLabelToggle?.(t.value, t.checked);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const handler = formHandlers.get(e.target.id);
    if (handler) {
      handler();
      modals.close(e.target.id.replace('Form', ''));
    }
  };

  const handleBlur = (e) => {
    if (e.target.matches('.column-title-input')) saveColTitle(e.target);
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter' && e.target.matches('.column-title-input'))
      e.target.blur();
  };

  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('submit', handleSubmit);
  ui.kanbanContainer.addEventListener('blur', handleBlur, true);
  ui.kanbanContainer.addEventListener('keydown', handleKeydown);

  return () => {
    document.removeEventListener('click', handleClick);
    document.removeEventListener('change', handleChange);
    document.removeEventListener('submit', handleSubmit);
  };
};
