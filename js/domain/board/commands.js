// Command creators: the write side of CQRS. Each creator resolves all
// nondeterminism through fx = { newId, nowIso } BEFORE dispatch, so the
// transitions stay total, pure, and replayable. Curried: creator(fx) is
// bound once at the composition root.

import { mkCard, mkBoard } from './model.js';
import { instantiateTemplate, DEFAULT_TEMPLATE } from './templates.js';

export const selectBoard = () => (id) => ({
  type: 'board/selected',
  payload: { id },
});

// localeTemplates: the active locale's `templates` record — localized
// column/label names are data, resolved at the edge like time and ids.
export const createBoard =
  (fx) =>
  (name, templateType = DEFAULT_TEMPLATE, localeTemplates) => ({
    type: 'board/created',
    payload: {
      board: mkBoard({
        id: fx.newId('board'),
        name: name || 'New Board',
        ...instantiateTemplate(templateType, localeTemplates, fx.newId),
      }),
    },
  });

export const renameBoard = () => (id, name) => ({
  type: 'board/renamed',
  payload: { id, name: name.trim() },
});

export const deleteBoard = () => (id) => ({
  type: 'board/deleted',
  payload: { id },
});

export const addLabel = (fx) => (name, color) => ({
  type: 'label/added',
  payload: { label: { id: fx.newId('label'), name, color } },
});

export const updateLabel = () => (id, name, color) => ({
  type: 'label/updated',
  payload: { id, name, color },
});

export const removeLabel = () => (id) => ({
  type: 'label/removed',
  payload: { id },
});

export const addColumn = (fx) => (title) => ({
  type: 'column/added',
  payload: {
    column: { id: fx.newId('column'), title: title || 'New Column', cards: [] },
  },
});

export const removeColumn = () => (id) => ({
  type: 'column/removed',
  payload: { id },
});

export const renameColumn = () => (id, title) => ({
  type: 'column/renamed',
  payload: { id, title },
});

export const addCard = (fx) => (columnId, text) => ({
  type: 'card/added',
  payload: {
    columnId,
    card: mkCard({ text }, fx.newId('card'), fx.nowIso()),
  },
});

export const updateCard = (fx) => (columnId, cardId, changes) => ({
  type: 'card/updated',
  payload: { columnId, cardId, changes, now: fx.nowIso() },
});

export const toggleCardComplete = (fx) => (columnId, cardId) => ({
  type: 'card/completionToggled',
  payload: { columnId, cardId, now: fx.nowIso() },
});

export const removeCard = () => (columnId, cardId) => ({
  type: 'card/removed',
  payload: { columnId, cardId },
});

// The clone id is minted HERE — the caller already knows it before
// dispatch, which is how the highlight animation finds the new card
// without dispatch returning anything (command-query separation).
export const duplicateCard = (fx) => (columnId, cardId) => ({
  type: 'card/duplicated',
  payload: { columnId, cardId, newId: fx.newId('card'), now: fx.nowIso() },
});

export const addCardLog = (fx) => (columnId, cardId, text) => ({
  type: 'card/logAdded',
  payload: { columnId, cardId, text, logId: fx.newId('log'), now: fx.nowIso() },
});

export const addCardDependency =
  (fx) =>
  (columnId, cardId, depId, depType = 'FS') => ({
    type: 'card/dependencyAdded',
    payload: { columnId, cardId, depId, depType, now: fx.nowIso() },
  });

export const removeCardDependency = (fx) => (columnId, cardId, depId) => ({
  type: 'card/dependencyRemoved',
  payload: { columnId, cardId, depId, now: fx.nowIso() },
});

export const reorderColumns = () => (order) => ({
  type: 'columns/reordered',
  payload: { order },
});

export const reorderCards = () => (columnId, order) => ({
  type: 'cards/reordered',
  payload: { columnId, order },
});

export const moveCard = (fx) => (cardId, fromColumnId, toColumnId, order) => ({
  type: 'card/moved',
  payload: { cardId, fromColumnId, toColumnId, order, now: fx.nowIso() },
});
