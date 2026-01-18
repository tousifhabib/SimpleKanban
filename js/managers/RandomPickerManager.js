const STORAGE_KEY = 'kanban-randomizer-options';

const DEFAULT_OPTIONS = {
  includeColumns: [],
  factorPriority: true,
  factorDueDate: true,
  factorAging: true,
  excludeCompleted: true,
};

const PRIORITY_WEIGHTS = {
  high: 4,
  medium: 2,
  low: 1,
  none: 1,
};

export default class RandomPickerManager {
  constructor() {
    this.options = this.loadOptions();
  }

  loadOptions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? { ...DEFAULT_OPTIONS, ...JSON.parse(saved) }
        : { ...DEFAULT_OPTIONS };
    } catch {
      return { ...DEFAULT_OPTIONS };
    }
  }

  saveOptions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.options));
  }

  getOptions() {
    return this.options;
  }

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.saveOptions();
  }

  resetOptions() {
    this.options = { ...DEFAULT_OPTIONS };
    this.saveOptions();
  }

  pickRandomCard(boardState) {
    if (!boardState || !boardState.columns) return null;

    const eligibleCards = this.getEligibleCards(boardState);
    if (eligibleCards.length === 0) return null;

    const weightedCards = eligibleCards.map((item) => ({
      ...item,
      weight: this.calculateWeight(item.card),
    }));

    return this.weightedRandomSelect(weightedCards);
  }

  getEligibleCards(boardState) {
    const eligible = [];
    const { includeColumns, excludeCompleted } = this.options;

    boardState.columns.forEach((column) => {
      if (includeColumns.length > 0 && !includeColumns.includes(column.id)) {
        return;
      }

      column.cards.forEach((card) => {
        if (excludeCompleted && card.completed) {
          return;
        }

        eligible.push({ card, column });
      });
    });

    return eligible;
  }

  calculateWeight(card) {
    let weight = 1;

    if (this.options.factorPriority) {
      weight *= PRIORITY_WEIGHTS[card.priority] || 1;
    }

    if (this.options.factorDueDate && card.dueDate) {
      const now = new Date();
      const due = new Date(card.dueDate);
      const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) {
        weight *= 5;
      } else if (daysUntilDue === 0) {
        weight *= 4;
      } else if (daysUntilDue <= 3) {
        weight *= 3;
      } else if (daysUntilDue <= 7) {
        weight *= 2;
      }
    }

    if (this.options.factorAging && card.updatedAt) {
      const now = new Date();
      const updated = new Date(card.updatedAt);
      const daysAgo = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

      if (daysAgo >= 14) {
        weight *= 3;
      } else if (daysAgo >= 7) {
        weight *= 2.5;
      } else if (daysAgo >= 3) {
        weight *= 1.5;
      }
    }

    return weight;
  }

  weightedRandomSelect(weightedItems) {
    const totalWeight = weightedItems.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    if (totalWeight <= 0) {
      return weightedItems[Math.floor(Math.random() * weightedItems.length)];
    }

    let random = Math.random() * totalWeight;

    for (const item of weightedItems) {
      random -= item.weight;
      if (random <= 0) {
        return { card: item.card, column: item.column };
      }
    }

    return weightedItems[weightedItems.length - 1];
  }

  getPoolStats(boardState) {
    if (!boardState || !boardState.columns) {
      return { total: 0, eligible: 0, byColumn: {} };
    }

    const eligible = this.getEligibleCards(boardState);
    const byColumn = {};

    eligible.forEach(({ column }) => {
      byColumn[column.title] = (byColumn[column.title] || 0) + 1;
    });

    const totalCards = boardState.columns.reduce(
      (sum, col) => sum + col.cards.length,
      0
    );

    return {
      total: totalCards,
      eligible: eligible.length,
      byColumn,
    };
  }
}
