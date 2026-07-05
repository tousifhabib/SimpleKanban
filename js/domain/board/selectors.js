// Queries: pure functions of state. The read side of CQRS.

import { Just, Nothing } from '../../fp/maybe.js';

const byId = (id) => (x) => x?.id === id;

export const activeBoard = (state) =>
  state.boards.find(byId(state.activeBoardId)) ?? state.boards[0];

export const activeBoardId = (state) => state.activeBoardId;

export const boardList = (state) =>
  state.boards
    .filter((b) => b?.id)
    .map(({ id, name }) => ({ id, name: name || 'Untitled' }));

export const labels = (state) => activeBoard(state)?.labels ?? [];

export const canDeleteBoard = (state) => state.boards.length > 1;

// findCard: (cardId) -> (state) -> Maybe<{ card, columnId }>
export const findCard = (cardId) => (state) => {
  for (const col of activeBoard(state).columns) {
    const card = col.cards.find(byId(cardId));
    if (card) return Just({ card, columnId: col.id });
  }
  return Nothing;
};

export const allCards = (state) =>
  activeBoard(state).columns.flatMap((col) =>
    col.cards.map((card) => ({
      card,
      columnId: col.id,
      columnTitle: col.title,
    }))
  );

export const columnOf = (colId) => (state) =>
  activeBoard(state)?.columns.find(byId(colId));
