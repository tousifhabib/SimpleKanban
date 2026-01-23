import { store } from '../../state/Store.js';
import { i18n } from '../../services/i18n/i18nService.js';
export const createBoardCommands = (ctx) => {
  const {
    ui,
    modals,
    picker,
    openCard,
    renderLabels,
    renderDependencies,
    populateDependencySelect,
    populateOptions,
    saveOptions,
    pickRandom,
    toggleAddCard,
  } = ctx;

  return new Map([
    [
      'addBoardBtn',
      () => {
        modals.open('createBoard');
        ui.newBoardName.focus();
      },
    ],
    [
      'renameBoardBtn',
      () => {
        ui.renameBoardName.value = store.activeBoard?.name;
        modals.open('renameBoard');
      },
    ],
    [
      'deleteBoardBtn',
      () => {
        ui.deleteBoardMessage.textContent = i18n.t(
          'modals.deleteBoard.warning',
          { boardName: store.activeBoard?.name }
        );
        modals.open('deleteBoard');
      },
    ],
    [
      'confirmDeleteBoard',
      () =>
        store.deleteBoard(store.activeBoardId) && modals.close('deleteBoard'),
    ],
    [
      'addColumnBtn',
      () => {
        modals.open('addColumn');
        ui.columnTitleInput.focus();
      },
    ],
    [
      'manageLabelBtn',
      () => {
        renderLabels();
        modals.open('labels');
      },
    ],
    [
      'addLabelBtn',
      () => {
        const name = ui.newLabelName.value.trim();
        if (name) {
          store.addLabel(name, ui.newLabelColor.value);
          ui.newLabelName.value = '';
          renderLabels();
        }
      },
    ],
    ['manageLabelCloseBtn', () => modals.close('labels')],
    [
      'addLogBtn',
      () => {
        const text = ui.newLogInput.value.trim();
        if (text) {
          store.addCardLog(ctx.cardCtx.colId, ctx.cardCtx.cardId, text);
          ctx.renderLogs(store.getCard(ctx.cardCtx.cardId).card.logs);
          ui.newLogInput.value = '';
        }
      },
    ],
    [
      'addDependencyBtn',
      () => {
        const depId = ui.dependencySelect.value;
        const depType = ui.dependencyTypeSelect.value;

        if (!depId) return;

        store.addCardDependency(
          ctx.cardCtx.colId,
          ctx.cardCtx.cardId,
          depId,
          depType
        );

        const card = store.getCard(ctx.cardCtx.cardId).card;
        renderDependencies(card.dependencies);
        populateDependencySelect();
        ui.dependencySelect.value = '';
      },
    ],
    ['cardDetailCloseBtn', () => modals.close('cardDetail')],
    ['importBtn', () => ui.importFileInput.click()],
    [
      'exportBtn',
      () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(
          new Blob([JSON.stringify(store.state, null, 2)], {
            type: 'application/json',
          })
        );
        a.download = 'kanban-backup.json';
        a.click();
      },
    ],
    [
      'optionsBtn',
      () => {
        populateOptions();
        modals.open('options');
      },
    ],
    [
      'saveOptionsBtn',
      () => {
        saveOptions();
        modals.close('options');
      },
    ],
    [
      'resetOptionsBtn',
      () => {
        picker.resetOptions();
        populateOptions();
      },
    ],
    ['randomPickerBtn', () => pickRandom()],
    [
      'goToCardBtn',
      () => {
        const picked = ctx.picked;
        if (picked) {
          modals.close('randomPicker');
          openCard(picked.card.id, picked.column.id);
        }
      },
    ],
    ['pickAgainBtn', () => pickRandom()],
    [
      'delete-column',
      (el) =>
        confirm(i18n.t('board.confirmDeleteColumn')) &&
        store.removeColumn(el.closest('.column').dataset.columnId),
    ],
    [
      'confirm-add-card',
      (el) => {
        const col = el.closest('.column');
        const val = col.querySelector('.card-input').value.trim();
        if (val) store.addCard(col.dataset.columnId, val);
        toggleAddCard(col, false);
      },
    ],
    ['cancel-add-card', (el) => toggleAddCard(el.closest('.column'), false)],
    ['toggle-add-card', (el) => toggleAddCard(el.closest('.column'), true)],
    [
      'edit-column-title',
      (el) => {
        el.style.display = 'none';
        const inp = el.nextElementSibling;
        inp.style.display = 'block';
        inp.focus();
      },
    ],
    [
      'edit',
      (el) =>
        openCard(
          el.closest('.card').dataset.cardId,
          el.closest('.column').dataset.columnId
        ),
    ],
    [
      'duplicate',
      (el) =>
        ctx.dupCard(
          el.closest('.card').dataset.cardId,
          el.closest('.column').dataset.columnId
        ),
    ],
    [
      'delete',
      (el) =>
        confirm(i18n.t('board.confirmDeleteCard')) &&
        store.removeCard(
          el.closest('.column').dataset.columnId,
          el.closest('.card').dataset.cardId
        ),
    ],
    [
      'delete-label',
      (el) => {
        if (confirm(i18n.t('board.confirmDeleteLabel')))
          store.removeLabel(el.dataset.id);
        renderLabels();
      },
    ],
    [
      'edit-label',
      (el) => {
        const l = store.getLabels().find((x) => x.id === el.dataset.id);
        const n = prompt(i18n.t('board.promptLabelName'), l.name);
        if (n?.trim())
          store.updateLabel(
            l.id,
            n.trim(),
            prompt(i18n.t('board.promptLabelColor'), l.color) || l.color
          );
        renderLabels();
      },
    ],
    [
      'remove-dependency',
      (el) => {
        store.removeCardDependency(
          ctx.cardCtx.colId,
          ctx.cardCtx.cardId,
          el.dataset.id
        );
        const card = store.getCard(ctx.cardCtx.cardId).card;
        renderDependencies(card.dependencies);
        populateDependencySelect();
      },
    ],
  ]);
};

export const createFormSubmitHandlers = (ui) =>
  new Map([
    [
      'createBoardForm',
      () =>
        store.createBoard(
          ui.newBoardName.value.trim(),
          ui.newBoardTemplate.value
        ),
    ],
    [
      'renameBoardForm',
      () =>
        store.renameBoard(store.getActiveBoardId(), ui.renameBoardName.value),
    ],
    ['addColumnForm', () => store.addColumn(ui.columnTitleInput.value.trim())],
  ]);
