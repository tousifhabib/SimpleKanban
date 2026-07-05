// Domain lenses: composable foci into the nested state
// { activeBoardId, boards: [{ columns: [{ cards: [...] }], labels }] }.
// All total — a missing focus makes set/over the identity.

import { lens, lensProp, lensWhere, composeL } from '../../fp/lens.js';

const byId = (id) => (x) => x?.id === id;

export const boardsL = lensProp('boards');

export const boardById = (id) => composeL(boardsL, lensWhere(byId(id)));

// The active board, falling back to boards[0] — mirroring the legacy
// Store's #board() on both read and write.
export const activeBoardL = lens(
  (s) => s.boards.find(byId(s.activeBoardId)) ?? s.boards[0],
  (board, s) => {
    const idx = s.boards.findIndex(byId(s.activeBoardId));
    const at = idx === -1 ? 0 : idx;
    return {
      ...s,
      boards: s.boards.map((b, i) => (i === at ? board : b)),
    };
  }
);

export const labelsL = composeL(activeBoardL, lensProp('labels'));

export const columnsL = composeL(activeBoardL, lensProp('columns'));

export const columnById = (colId) => composeL(columnsL, lensWhere(byId(colId)));

export const cardsOf = (colId) =>
  composeL(columnById(colId), lensProp('cards'));

export const cardById = (colId, cardId) =>
  composeL(cardsOf(colId), lensWhere(byId(cardId)));
