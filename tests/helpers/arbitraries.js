// Shared fast-check generators for the kanban domain. One arbState feeds
// store transitions, filters, gantt, and picker suites alike.

import fc from 'fast-check';

// ISO date strings in a fixed DST-free-ish window around the frozen test
// clock (2026-07-05). Kept as date-only strings, matching what the date
// inputs in the app produce.
export const arbDateStr = fc
  .date({
    min: new Date('2026-01-01T00:00:00Z'),
    max: new Date('2026-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10));

export const arbIso = fc
  .date({
    min: new Date('2026-01-01T00:00:00Z'),
    max: new Date('2026-12-31T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const arbPriority = fc.constantFrom('none', 'low', 'medium', 'high');

const arbText = fc.string({ minLength: 1, maxLength: 20 });

let uniqueCounter = 0;
const arbUniqueId = (prefix) =>
  fc.integer({ min: 0, max: 1 }).map(() => `${prefix}-arb-${++uniqueCounter}`);

export const arbLabel = fc.record({
  id: arbUniqueId('label'),
  name: arbText,
  color: fc.constantFrom('#e53935', '#43a047', '#1976d2'),
});

export const arbCard = fc.record({
  id: arbUniqueId('card'),
  text: arbText,
  description: fc.oneof(fc.constant(''), arbText),
  startDate: fc.oneof(fc.constant(null), arbDateStr),
  dueDate: fc.oneof(fc.constant(null), arbDateStr),
  completed: fc.boolean(),
  priority: arbPriority,
  labels: fc.constant([]),
  logs: fc.constant([]),
  dependencies: fc.constant([]),
  effort: fc.integer({ min: 0, max: 40 }),
  createdAt: arbIso,
  updatedAt: arbIso,
});

export const arbColumn = fc.record({
  id: arbUniqueId('column'),
  title: arbText,
  cards: fc.array(arbCard, { maxLength: 5 }),
});

export const arbBoard = fc.record({
  id: arbUniqueId('board'),
  name: arbText,
  columns: fc.array(arbColumn, { maxLength: 4 }),
  labels: fc.array(arbLabel, { maxLength: 3 }),
});

export const arbState = fc
  .array(arbBoard, { minLength: 1, maxLength: 3 })
  .map((boards) => ({ activeBoardId: boards[0].id, boards }));

// The pre-multi-board persisted shape.
export const arbLegacyState = fc.record({
  columns: fc.array(arbColumn, { maxLength: 4 }),
  labels: fc.array(arbLabel, { maxLength: 3 }),
});

export const allCardsOf = (board) => board.columns.flatMap((c) => c.cards);

export const cardIdsOf = (board) =>
  board.columns.flatMap((c) => c.cards.map((k) => k.id)).sort();
