// Weighted random picking as pure functions. The sampled random number u
// is an INPUT to pickWeighted — determinism ends at the caller, where the
// rng port supplies u. Weight semantics frozen by the characterization
// suite (multiplicative factors, all >= 1).

import {
  getDaysDiff,
  getDaysUntil,
  AGING_THRESHOLDS,
  DUE_SOON_DAYS,
  DUE_WEEK_DAYS,
} from '../dates.js';

export const DEFAULT_PICKER_OPTIONS = Object.freeze({
  includeColumns: [],
  factorPriority: true,
  factorDueDate: true,
  factorAging: true,
  excludeCompleted: true,
});

const PRIORITY_WEIGHTS = { high: 4, medium: 2, low: 1, none: 1 };

export const eligibleCards = (options) => (board) => {
  const { includeColumns, excludeCompleted } = options;
  return board.columns.flatMap((column) => {
    if (includeColumns.length && !includeColumns.includes(column.id)) return [];
    return column.cards
      .filter((card) => !(excludeCompleted && card.completed))
      .map((card) => ({ card, column }));
  });
};

export const cardWeight = (options, now) => (card) => {
  let weight = 1;

  if (options.factorPriority) {
    weight *= PRIORITY_WEIGHTS[card.priority] ?? 1;
  }

  if (options.factorDueDate && card.dueDate) {
    const daysUntil = getDaysUntil(card.dueDate, now);
    if (daysUntil < 0) weight *= 5;
    else if (daysUntil === 0) weight *= 4;
    else if (daysUntil <= DUE_SOON_DAYS) weight *= 3;
    else if (daysUntil <= DUE_WEEK_DAYS) weight *= 2;
  }

  if (options.factorAging && card.updatedAt) {
    const daysAgo = getDaysDiff(card.updatedAt, now);
    if (daysAgo >= AGING_THRESHOLDS.STALE) weight *= 3;
    else if (daysAgo >= AGING_THRESHOLDS.AGING) weight *= 2.5;
    else if (daysAgo >= AGING_THRESHOLDS.FRESH) weight *= 1.5;
  }

  return weight;
};

// pickWeighted: (u) => (weightedItems) => pick | null
// Inverse-CDF selection over cumulative weights; u in [0, 1).
export const pickWeighted = (u) => (weightedItems) => {
  if (!weightedItems.length) return null;
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0)
    return weightedItems[Math.floor(u * weightedItems.length)];

  let remaining = u * totalWeight;
  for (const item of weightedItems) {
    remaining -= item.weight;
    if (remaining <= 0) return { card: item.card, column: item.column };
  }
  return weightedItems.at(-1);
};

// The full pick: (board, options, now, u) -> {card, column} | null
export const pickRandomCard = (board, options, now, u) => {
  if (!board?.columns) return null;
  const eligible = eligibleCards(options)(board);
  if (!eligible.length) return null;
  const weighted = eligible.map((item) => ({
    ...item,
    weight: cardWeight(options, now)(item.card),
  }));
  return pickWeighted(u)(weighted);
};

export const poolStats = (options) => (board) => {
  if (!board?.columns) return { total: 0, eligible: 0, byColumn: {} };

  const eligible = eligibleCards(options)(board);
  const byColumn = {};
  for (const { column } of eligible) {
    byColumn[column.title] = (byColumn[column.title] || 0) + 1;
  }

  return {
    total: board.columns.reduce((sum, col) => sum + col.cards.length, 0),
    eligible: eligible.length,
    byColumn,
  };
};
