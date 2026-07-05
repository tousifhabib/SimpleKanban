// Test-harness adapter: exposes the pre-sprint method API over the real
// dispatch/selector store, so the characterization suites keep exercising
// real behavior without rewording every call site. This is test-only —
// application code speaks commands and selectors directly.

import * as make from '../../js/domain/board/commands.js';
import * as sel from '../../js/domain/board/selectors.js';
import { getOrElse, fold } from '../../js/fp/maybe.js';

export const legacyApi = (store, fx, localeTemplates) => {
  const { dispatch, getState, subscribe } = store;

  return {
    get state() {
      return getState();
    },
    get activeBoard() {
      return sel.activeBoard(getState());
    },
    get activeBoardId() {
      return sel.activeBoardId(getState());
    },
    subscribe,
    getState: () => sel.activeBoard(getState()),
    getBoards: () => sel.boardList(getState()),
    getLabels: () => sel.labels(getState()),
    getActiveBoardId: () => sel.activeBoardId(getState()),
    getCard: (id) => getOrElse(null)(sel.findCard(id)(getState())),
    getAllCards: () => sel.allCards(getState()),
    setActiveBoard: (id) => dispatch(make.selectBoard()(id)),
    createBoard: (name, type) =>
      dispatch(make.createBoard(fx)(name, type, localeTemplates)),
    renameBoard: (id, name) => dispatch(make.renameBoard()(id, name)),
    deleteBoard(id) {
      const deletable =
        sel.canDeleteBoard(getState()) &&
        getState().boards.some((b) => b?.id === id);
      dispatch(make.deleteBoard()(id));
      return deletable;
    },
    addLabel: (name, color) => dispatch(make.addLabel(fx)(name, color)),
    updateLabel: (id, name, color) =>
      dispatch(make.updateLabel()(id, name, color)),
    removeLabel: (id) => dispatch(make.removeLabel()(id)),
    addColumn: (title) => dispatch(make.addColumn(fx)(title)),
    removeColumn: (id) => dispatch(make.removeColumn()(id)),
    updateColumnTitle: (id, title) => dispatch(make.renameColumn()(id, title)),
    addCard: (columnId, text) => dispatch(make.addCard(fx)(columnId, text)),
    updateCardDetails: (columnId, cardId, changes) =>
      dispatch(make.updateCard(fx)(columnId, cardId, changes)),
    toggleCardComplete: (columnId, cardId) =>
      dispatch(make.toggleCardComplete(fx)(columnId, cardId)),
    removeCard: (columnId, cardId) =>
      dispatch(make.removeCard()(columnId, cardId)),
    duplicateCard(columnId, cardId) {
      const command = make.duplicateCard(fx)(columnId, cardId);
      const before = getState();
      dispatch(command);
      if (getState() === before) return null;
      return fold(
        () => null,
        ({ card }) => card
      )(sel.findCard(command.payload.newId)(getState()));
    },
    addCardLog: (columnId, cardId, text) =>
      dispatch(make.addCardLog(fx)(columnId, cardId, text)),
    addCardDependency: (columnId, cardId, depId, type = 'FS') =>
      dispatch(make.addCardDependency(fx)(columnId, cardId, depId, type)),
    removeCardDependency: (columnId, cardId, depId) =>
      dispatch(make.removeCardDependency(fx)(columnId, cardId, depId)),
    reorderColumns: (order) => dispatch(make.reorderColumns()(order)),
    reorderCards: (columnId, order) =>
      dispatch(make.reorderCards()(columnId, order)),
    moveCard: (cardId, fromColumnId, toColumnId, order) =>
      dispatch(make.moveCard(fx)(cardId, fromColumnId, toColumnId, order)),
  };
};
