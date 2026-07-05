// migrate: (rawOrNull, fx, localeTemplates) -> state
//
// Pure given its inputs (fx = { newId, nowIso } supplies identity and time
// as values). Handles all three persisted shapes:
//   null / undefined      -> default board from the basic template
//   { columns: [...] }    -> legacy single-board, lifted to multi-board
//   { boards: [...] }     -> modern shape, cards re-normalized
// Exactly mirrors the legacy Store #load / #createDefault semantics.

import { mkCard, mkBoard } from './model.js';
import { instantiateTemplate, DEFAULT_TEMPLATE } from './templates.js';

const normalizeBoard = (board, fx) => ({
  ...board,
  columns: board.columns.map((col) => ({
    ...col,
    cards: col.cards.map((card) => mkCard(card, fx.newId('card'), fx.nowIso())),
  })),
});

const defaultState = (fx, localeTemplates) => {
  const id = fx.newId('board');
  return {
    activeBoardId: id,
    boards: [
      mkBoard({
        id,
        name: 'My First Board',
        ...instantiateTemplate(DEFAULT_TEMPLATE, localeTemplates, fx.newId),
      }),
    ],
  };
};

export const migrate = (raw, fx, localeTemplates) => {
  if (!raw) return defaultState(fx, localeTemplates);

  const boards = (
    Array.isArray(raw.columns)
      ? [
          {
            id: fx.newId('board'),
            name: 'My Board',
            columns: raw.columns,
            labels: raw.labels,
          },
        ]
      : raw.boards
  ).map((b) => normalizeBoard(b, fx));

  return { activeBoardId: raw.activeBoardId ?? boards[0].id, boards };
};
