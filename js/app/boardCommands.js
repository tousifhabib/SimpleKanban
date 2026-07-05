// UI intents -> domain commands. Each handler reads the DOM it needs,
// builds a command via a creator (nondeterminism resolved through fx),
// dispatches, and performs local DOM effects. Dialogs go through `ask`,
// file export/import through Free programs, timed highlights through Task.

import * as make from '../domain/board/commands.js';
import * as sel from '../domain/board/selectors.js';
import { exportProgram } from '../effects/programs.js';
import { fold as foldMaybe, getOrElse, map } from '../fp/maybe.js';
import * as T from '../fp/task.js';
import { delayValue } from '../core/timers.js';

// Duplicate-highlight: 50ms until the re-render has landed, add the class,
// remove it 1s later. Pure Task composition, forked at the end.
const highlightCard = (container, cardId) =>
  T.chain((elem) =>
    T.map(() => elem?.classList.remove('card-duplicated'))(
      delayValue(1000, null)
    )
  )(
    T.map(() => {
      const elem = container.querySelector(`[data-card-id="${cardId}"]`);
      elem?.classList.add('card-duplicated');
      return elem;
    })(delayValue(50, null))
  );

export const createBoardCommands = (ctx) => {
  const {
    ui,
    modals,
    picker,
    dispatch,
    query,
    fx,
    t,
    ask,
    runEffects,
    openCard,
    renderLabels,
    renderLogs,
    renderDependencies,
    populateDependencySelect,
    populateOptions,
    saveOptions,
    pickRandom,
    toggleAddCard,
  } = ctx;

  const activeBoard = () => sel.activeBoard(query());

  const dupCard = (cardId, colId) => {
    const command = make.duplicateCard(fx)(colId, cardId);
    const before = query();
    dispatch(command);
    if (query() !== before) {
      highlightCard(ui.kanbanContainer, command.payload.newId).fork(() => {});
    }
  };

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
        ui.renameBoardName.value = activeBoard()?.name;
        modals.open('renameBoard');
      },
    ],
    [
      'deleteBoardBtn',
      () => {
        ui.deleteBoardMessage.textContent = t('modals.deleteBoard.warning', {
          boardName: activeBoard()?.name,
        });
        modals.open('deleteBoard');
      },
    ],
    [
      'confirmDeleteBoard',
      () => {
        if (!sel.canDeleteBoard(query())) return;
        dispatch(make.deleteBoard()(sel.activeBoardId(query())));
        modals.close('deleteBoard');
      },
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
          dispatch(make.addLabel(fx)(name, ui.newLabelColor.value));
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
          const { colId, cardId } = ctx.cardCtx;
          dispatch(make.addCardLog(fx)(colId, cardId, text));
          renderLogs(
            getOrElse([])(
              map(({ card }) => card.logs)(sel.findCard(cardId)(query()))
            )
          );
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

        const { colId, cardId } = ctx.cardCtx;
        dispatch(make.addCardDependency(fx)(colId, cardId, depId, depType));
        renderDependencies(
          getOrElse([])(
            map(({ card }) => card.dependencies)(sel.findCard(cardId)(query()))
          )
        );
        populateDependencySelect();
        ui.dependencySelect.value = '';
      },
    ],
    ['cardDetailCloseBtn', () => modals.close('cardDetail')],
    ['importBtn', () => ui.importFileInput.click()],
    [
      'exportBtn',
      () => runEffects(exportProgram('kanban-backup.json', query())),
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
        const picked = ctx.picked();
        if (picked) {
          modals.close('randomPicker');
          openCard(picked.card.id, picked.column.id);
        }
      },
    ],
    ['pickAgainBtn', () => pickRandom()],
    [
      'delete-column',
      (elem) => {
        if (ask.confirm(t('board.confirmDeleteColumn'))) {
          dispatch(
            make.removeColumn()(elem.closest('.column').dataset.columnId)
          );
        }
      },
    ],
    [
      'confirm-add-card',
      (elem) => {
        const col = elem.closest('.column');
        const value = col.querySelector('.card-input').value.trim();
        if (value) dispatch(make.addCard(fx)(col.dataset.columnId, value));
        toggleAddCard(col, false);
      },
    ],
    [
      'cancel-add-card',
      (elem) => toggleAddCard(elem.closest('.column'), false),
    ],
    ['toggle-add-card', (elem) => toggleAddCard(elem.closest('.column'), true)],
    [
      'edit-column-title',
      (elem) => {
        elem.style.display = 'none';
        const input = elem.nextElementSibling;
        input.style.display = 'block';
        input.focus();
      },
    ],
    [
      'edit',
      (elem) =>
        openCard(
          elem.closest('.card').dataset.cardId,
          elem.closest('.column').dataset.columnId
        ),
    ],
    [
      'duplicate',
      (elem) =>
        dupCard(
          elem.closest('.card').dataset.cardId,
          elem.closest('.column').dataset.columnId
        ),
    ],
    [
      'delete',
      (elem) => {
        if (ask.confirm(t('board.confirmDeleteCard'))) {
          dispatch(
            make.removeCard()(
              elem.closest('.column').dataset.columnId,
              elem.closest('.card').dataset.cardId
            )
          );
        }
      },
    ],
    [
      'delete-label',
      (elem) => {
        if (ask.confirm(t('board.confirmDeleteLabel'))) {
          dispatch(make.removeLabel()(elem.dataset.id));
        }
        renderLabels();
      },
    ],
    [
      'edit-label',
      (elem) => {
        const label = sel.labels(query()).find((l) => l.id === elem.dataset.id);
        if (!label) return;
        foldMaybe(
          () => {},
          (name) => {
            const color = getOrElse(label.color)(
              ask.prompt(t('board.promptLabelColor'), label.color)
            );
            dispatch(make.updateLabel()(label.id, name.trim(), color));
          }
        )(ask.prompt(t('board.promptLabelName'), label.name));
        renderLabels();
      },
    ],
    [
      'remove-dependency',
      (elem) => {
        const { colId, cardId } = ctx.cardCtx;
        dispatch(make.removeCardDependency(fx)(colId, cardId, elem.dataset.id));
        renderDependencies(
          getOrElse([])(
            map(({ card }) => card.dependencies)(sel.findCard(cardId)(query()))
          )
        );
        populateDependencySelect();
      },
    ],
  ]);
};

export const createFormSubmitHandlers = ({
  ui,
  dispatch,
  query,
  fx,
  localeTemplates,
}) =>
  new Map([
    [
      'createBoardForm',
      () =>
        dispatch(
          make.createBoard(fx)(
            ui.newBoardName.value.trim(),
            ui.newBoardTemplate.value,
            localeTemplates()
          )
        ),
    ],
    [
      'renameBoardForm',
      () =>
        dispatch(
          make.renameBoard()(
            sel.activeBoardId(query()),
            ui.renameBoardName.value
          )
        ),
    ],
    [
      'addColumnForm',
      () => dispatch(make.addColumn(fx)(ui.columnTitleInput.value.trim())),
    ],
  ]);
