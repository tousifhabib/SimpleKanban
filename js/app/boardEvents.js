// Global event delegation. Routes DOM events to the command map or the
// injected handlers — no singleton imports; everything arrives as deps.

import { fold as foldMaybe } from '../fp/maybe.js';
import * as make from '../domain/board/commands.js';

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
  dispatch,
  fx,
  setLanguage,
  importJson,
  openCard,
  saveColTitle,
  onSwitchView,
  onLabelToggle,
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
    if (viewBtn) return onSwitchView?.(viewBtn.dataset.view);

    if (t.id?.startsWith('cancel') || t.id?.endsWith('CloseBtn')) {
      const closed = foldMaybe(
        () => false,
        (name) => {
          modals.close(name);
          return true;
        }
      )(modals.nameContaining(t));
      if (closed) return;
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
    if (t.id === 'langSelector') setLanguage(t.value);
    if (t.id === 'boardSelector') dispatch(make.selectBoard()(t.value));
    if (t.id === 'importFileInput' && t.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => importJson(ev.target.result);
      reader.readAsText(t.files[0]);
    }
    if (t.matches('.card-complete-checkbox')) {
      dispatch(
        make.toggleCardComplete(fx)(
          t.closest('.column').dataset.columnId,
          t.closest('.card').dataset.cardId
        )
      );
    }
    if (t.closest('#labelsSelector')) {
      onLabelToggle?.(t.value, t.checked);
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
    if (e.key !== 'Enter') return;
    if (e.target.matches('.column-title-input')) {
      e.target.blur();
    } else if (e.target.matches('.card')) {
      // Cards are focusable; Enter opens the detail modal.
      openCard(
        e.target.dataset.cardId,
        e.target.closest('.column').dataset.columnId
      );
    } else if (e.target.matches('.column-title-text')) {
      // Column titles are focusable; Enter starts the rename.
      commands.get('edit-column-title')?.(e.target);
    }
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
