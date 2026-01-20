import {
  getDaysDiff,
  getDaysUntil,
  AGING_THRESHOLDS,
  DUE_SOON_DAYS,
  DUE_WEEK_DAYS,
} from '../utils/dateUtils.js';

const STORAGE_KEY = 'kanban-randomizer-options';

const DEFAULT_OPTIONS = {
  includeColumns: [],
  factorPriority: true,
  factorDueDate: true,
  factorAging: true,
  excludeCompleted: true,
};

const PRIORITY_WEIGHTS = { high: 4, medium: 2, low: 1, none: 1 };

export default class RandomPickerManager {
  constructor() {
    this.options = this.loadOptions();
  }

  loadOptions() {
    try {
      return {
        ...DEFAULT_OPTIONS,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
      };
    } catch {
      return { ...DEFAULT_OPTIONS };
    }
  }

  saveOptions = () =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.options));
  getOptions = () => this.options;

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.saveOptions();
  }

  resetOptions() {
    this.options = { ...DEFAULT_OPTIONS };
    this.saveOptions();
  }

  pickRandomCard(boardState) {
    if (!boardState?.columns) return null;

    const eligible = this.getEligibleCards(boardState);
    if (!eligible.length) return null;

    const weighted = eligible.map((item) => ({
      ...item,
      weight: this.calculateWeight(item.card),
    }));
    return this.weightedRandomSelect(weighted);
  }

  getEligibleCards(boardState) {
    const { includeColumns, excludeCompleted } = this.options;

    return boardState.columns.flatMap((column) => {
      if (includeColumns.length && !includeColumns.includes(column.id))
        return [];
      return column.cards
        .filter((card) => !(excludeCompleted && card.completed))
        .map((card) => ({ card, column }));
    });
  }

  calculateWeight(card) {
    let weight = 1;

    if (this.options.factorPriority) {
      weight *= PRIORITY_WEIGHTS[card.priority] ?? 1;
    }

    if (this.options.factorDueDate && card.dueDate) {
      const daysUntil = getDaysUntil(card.dueDate);
      if (daysUntil < 0) weight *= 5;
      else if (daysUntil === 0) weight *= 4;
      else if (daysUntil <= DUE_SOON_DAYS) weight *= 3;
      else if (daysUntil <= DUE_WEEK_DAYS) weight *= 2;
    }

    if (this.options.factorAging && card.updatedAt) {
      const daysAgo = getDaysDiff(card.updatedAt);
      if (daysAgo >= AGING_THRESHOLDS.STALE) weight *= 3;
      else if (daysAgo >= AGING_THRESHOLDS.AGING) weight *= 2.5;
      else if (daysAgo >= AGING_THRESHOLDS.FRESH) weight *= 1.5;
    }

    return weight;
  }

  weightedRandomSelect(weightedItems) {
    const totalWeight = weightedItems.reduce(
      (sum, item) => sum + item.weight,
      0
    );
    if (totalWeight <= 0)
      return weightedItems[Math.floor(Math.random() * weightedItems.length)];

    let random = Math.random() * totalWeight;
    for (const item of weightedItems) {
      random -= item.weight;
      if (random <= 0) return { card: item.card, column: item.column };
    }
    return weightedItems.at(-1);
  }

  getPoolStats(boardState) {
    if (!boardState?.columns) return { total: 0, eligible: 0, byColumn: {} };

    const eligible = this.getEligibleCards(boardState);
    const byColumn = Object.groupBy(eligible, ({ column }) => column.title);
    const byColumnCounts = Object.fromEntries(
      Object.entries(byColumn).map(([k, v]) => [k, v.length])
    );

    return {
      total: boardState.columns.reduce((sum, col) => sum + col.cards.length, 0),
      eligible: eligible.length,
      byColumn: byColumnCounts,
    };
  }
}
