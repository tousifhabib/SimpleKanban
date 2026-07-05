// State transitions: pure reducers (state, payload) -> state, one per
// command type. Built with lenses; every function is total — a missing
// target returns the SAME state reference so the store can skip notify.
// Field-level semantics mirror the legacy Store method-for-method,
// including whitelist reorders and the updatedAt touch table.

import { view, over } from '../../fp/lens.js';
import { pipe } from '../../fp/fn.js';
import { reorderByIds, removeWhere, insertAt } from '../../fp/arrays.js';
import {
  boardById,
  labelsL,
  columnsL,
  columnById,
  cardsOf,
  cardById,
} from './lenses.js';
import { mkCard, mkLog } from './model.js';

const byId = (id) => (x) => x?.id === id;

const touch = (now) => (card) => ({ ...card, updatedAt: now });

// Strip every reference to a card id from all dependencies on the board.
const stripDependenciesTo = (cardId) =>
  over(columnsL)((columns) =>
    columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.dependencies?.some(byId(cardId))
          ? {
              ...card,
              dependencies: card.dependencies.filter((d) => d.id !== cardId),
            }
          : card
      ),
    }))
  );

export const transitions = Object.freeze({
  'board/selected': (state, { id }) =>
    state.activeBoardId !== id && state.boards.some(byId(id))
      ? { ...state, activeBoardId: id }
      : state,

  'board/created': (state, { board }) => ({
    ...state,
    boards: [...state.boards, board],
    activeBoardId: board.id,
  }),

  'board/renamed': (state, { id, name }) => {
    const board = view(boardById(id))(state);
    return board === undefined || board.name === name
      ? state
      : over(boardById(id))((b) => ({ ...b, name }))(state);
  },

  'board/deleted': (state, { id }) => {
    if (state.boards.length <= 1 || !state.boards.some(byId(id))) return state;
    const survivors = state.boards.filter((b) => !byId(id)(b));
    return {
      ...state,
      boards: survivors,
      activeBoardId:
        state.activeBoardId === id ? survivors[0].id : state.activeBoardId,
    };
  },

  'label/added': (state, { label }) =>
    over(labelsL)((labels) => [...labels, label])(state),

  'label/updated': (state, { id, name, color }) =>
    view(labelsL)(state)?.some(byId(id))
      ? over(labelsL)((labels) =>
          labels.map((l) => (byId(id)(l) ? { ...l, name, color } : l))
        )(state)
      : state,

  'label/removed': (state, { id }) =>
    pipe(
      over(labelsL)(removeWhere(byId(id))),
      over(columnsL)((columns) =>
        columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.labels?.includes(id)
              ? { ...card, labels: card.labels.filter((l) => l !== id) }
              : card
          ),
        }))
      )
    )(state),

  'column/added': (state, { column }) =>
    over(columnsL)((columns) => [...columns, column])(state),

  'column/removed': (state, { id }) =>
    view(columnById(id))(state) === undefined
      ? state
      : over(columnsL)(removeWhere(byId(id)))(state),

  'column/renamed': (state, { id, title }) => {
    const column = view(columnById(id))(state);
    return column === undefined || column.title === title
      ? state
      : over(columnById(id))((col) => ({ ...col, title }))(state);
  },

  'card/added': (state, { columnId, card }) =>
    view(columnById(columnId))(state) === undefined
      ? state
      : over(cardsOf(columnId))((cards) => [...cards, card])(state),

  'card/updated': (state, { columnId, cardId, changes, now }) =>
    view(cardById(columnId, cardId))(state) === undefined
      ? state
      : over(cardById(columnId, cardId))((card) => ({
          ...card,
          ...changes,
          updatedAt: now,
        }))(state),

  'card/completionToggled': (state, { columnId, cardId, now }) =>
    view(cardById(columnId, cardId))(state) === undefined
      ? state
      : over(cardById(columnId, cardId))((card) => ({
          ...card,
          completed: !card.completed,
          updatedAt: now,
        }))(state),

  'card/removed': (state, { columnId, cardId }) =>
    view(cardById(columnId, cardId))(state) === undefined
      ? state
      : pipe(
          stripDependenciesTo(cardId),
          over(cardsOf(columnId))(removeWhere(byId(cardId)))
        )(state),

  // Insert the clone right after the original — the legacy code's clear
  // intent (indexOf + 1), which its deep-Proxy identity bug reduced to
  // index 0. Fixed deliberately at the engine swap.
  'card/duplicated': (state, { columnId, cardId, newId, now }) => {
    const cards = view(cardsOf(columnId))(state);
    const idx = cards?.findIndex(byId(cardId)) ?? -1;
    if (idx === -1) return state;
    const clone = mkCard(
      {
        ...cards[idx],
        id: undefined,
        logs: [],
        dependencies: [],
        createdAt: undefined,
        updatedAt: undefined,
      },
      newId,
      now
    );
    return over(cardsOf(columnId))(insertAt(idx + 1, clone))(state);
  },

  'card/logAdded': (state, { columnId, cardId, text, logId, now }) => {
    const column = view(columnById(columnId))(state);
    if (!column || view(cardById(columnId, cardId))(state) === undefined) {
      return state;
    }
    return over(cardById(columnId, cardId))((card) => ({
      ...card,
      logs: [...(card.logs || []), mkLog(text, column.title, logId, now)],
      updatedAt: now,
    }))(state);
  },

  'card/dependencyAdded': (state, { columnId, cardId, depId, depType, now }) =>
    view(cardById(columnId, cardId))(state) === undefined
      ? state
      : over(cardById(columnId, cardId))((card) => ({
          ...card,
          dependencies: [
            ...(card.dependencies || []).filter((d) => d.id !== depId),
            { id: depId, type: depType },
          ],
          updatedAt: now,
        }))(state),

  'card/dependencyRemoved': (state, { columnId, cardId, depId, now }) =>
    view(cardById(columnId, cardId))(state) === undefined
      ? state
      : over(cardById(columnId, cardId))((card) => ({
          ...card,
          dependencies: (card.dependencies || []).filter((d) => d.id !== depId),
          updatedAt: now,
        }))(state),

  'columns/reordered': (state, { order }) =>
    over(columnsL)(reorderByIds(order))(state),

  'cards/reordered': (state, { columnId, order }) =>
    view(columnById(columnId))(state) === undefined
      ? state
      : over(cardsOf(columnId))(reorderByIds(order))(state),

  'card/moved': (state, { cardId, fromColumnId, toColumnId, order, now }) => {
    const card = view(cardById(fromColumnId, cardId))(state);
    if (card === undefined) return state;
    if (view(columnById(toColumnId))(state) === undefined) return state;
    return pipe(
      over(cardsOf(fromColumnId))(removeWhere(byId(cardId))),
      over(cardsOf(toColumnId))((cards) => [...cards, touch(now)(card)]),
      over(cardsOf(toColumnId))(reorderByIds(order))
    )(state);
  },
});
