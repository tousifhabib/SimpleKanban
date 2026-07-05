// Compatibility facade over the pure functional core.
//
// The deep-Proxy mutable Store is gone. State now lives in an immutable
// reducer store (js/core/store.js) driven by pure transitions
// (js/domain/board/transitions.js); this module keeps the legacy method
// surface so existing call sites work unchanged while they migrate to
// dispatch/selectors. It is deliberately a thin shell: every method is
// creator -> dispatch or selector -> fold, and persistence is a debounced
// effect scheduled only when a dispatch actually changed state.
//
// This facade is deleted at the end of the sprint; the composition root
// (js/index.js) takes over store construction.

import { createStore } from '../core/store.js';
import { debounce } from '../core/debounce.js';
import { transitions } from '../domain/board/transitions.js';
import * as make from '../domain/board/commands.js';
import * as sel from '../domain/board/selectors.js';
import { migrate } from '../domain/board/migrate.js';
import { createEnv } from '../ports/env.js';
import { bootProgram, importProgram } from '../effects/programs.js';
import { runInBrowser } from '../effects/browserInterpreter.js';
import { getOrElse, fold } from '../fp/maybe.js';
import { i18n } from '../services/i18n/i18nService.js';

const STORAGE_KEY = 'flexibleKanbanState';
const SAVE_DEBOUNCE_MS = 150;

const env = createEnv(window);
const run = runInBrowser(env);
const fx = env.fx;

const core = createStore({
  transitions,
  initialState: migrate(
    run(bootProgram(STORAGE_KEY)),
    fx,
    i18n.getLocale().templates
  ),
});

const persist = debounce(SAVE_DEBOUNCE_MS, () =>
  env.storage.save(STORAGE_KEY, core.getState()).run()
);

// Persistence is anchored at dispatch time (like the legacy proxy trap)
// and skipped entirely for no-op commands.
const dispatch = (command) => {
  const before = core.getState();
  core.dispatch(command);
  if (core.getState() !== before) persist();
};

const state = () => core.getState();

export const store = Object.freeze({
  get state() {
    return state();
  },

  get activeBoard() {
    return sel.activeBoard(state());
  },

  get activeBoardId() {
    return sel.activeBoardId(state());
  },

  subscribe: core.subscribe,

  // Legacy quirk preserved: getState() returns the ACTIVE BOARD.
  getState: () => sel.activeBoard(state()),

  getBoards: () => sel.boardList(state()),

  getLabels: () => sel.labels(state()),

  getActiveBoardId: () => sel.activeBoardId(state()),

  getCard: (id) => getOrElse(null)(sel.findCard(id)(state())),

  getAllCards: () => sel.allCards(state()),

  setActiveBoard: (id) => dispatch(make.selectBoard()(id)),

  createBoard: (name, type) =>
    dispatch(make.createBoard(fx)(name, type, i18n.getLocale().templates)),

  renameBoard: (id, name) => dispatch(make.renameBoard()(id, name)),

  deleteBoard(id) {
    const deletable =
      sel.canDeleteBoard(state()) && state().boards.some((b) => b?.id === id);
    dispatch(make.deleteBoard()(id));
    return deletable;
  },

  importData(json) {
    try {
      return run(importProgram(STORAGE_KEY, json));
    } catch {
      return false;
    }
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
    const before = state();
    dispatch(command);
    if (state() === before) return null;
    return fold(
      () => null,
      ({ card }) => card
    )(sel.findCard(command.payload.newId)(state()));
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
});
