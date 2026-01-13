import { i18n } from '../services/i18n/i18nService.js';

export const SEARCH_OPERATORS = {
  CONTAINS: 'contains',
  EXACT: 'exact',
  STARTS_WITH: 'startsWith',
  NOT_CONTAINS: 'notContains',
};

export const LABEL_MATCH_MODE = {
  ANY: 'any',
  ALL: 'all',
  NONE: 'none',
};

export const DUE_STATUS = {
  ALL: 'all',
  OVERDUE: 'overdue',
  DUE_TODAY: 'dueToday',
  DUE_THIS_WEEK: 'dueThisWeek',
  DUE_SOON: 'dueSoon', // Within 3 days
  NO_DUE_DATE: 'noDueDate',
  HAS_DUE_DATE: 'hasDueDate',
};

export const COMPLETION_STATUS = {
  ALL: 'all',
  COMPLETED: 'completed',
  INCOMPLETE: 'incomplete',
};

export const AGING_OPTIONS = {
  ALL: 'all',
  FRESH: 'fresh',
  AGING: 'aging',
  STALE: 'stale',
  ABANDONED: 'abandoned',
};

const DEFAULT_FILTERS = {
  search: {
    term: '',
    fields: ['text', 'description', 'labels'],
    operator: SEARCH_OPERATORS.CONTAINS,
    caseSensitive: false,
  },
  labels: {
    selected: [],
    matchMode: LABEL_MATCH_MODE.ANY,
  },
  priority: {
    selected: [],
  },
  dueDate: {
    status: DUE_STATUS.ALL,
    from: null,
    to: null,
  },
  startDate: {
    from: null,
    to: null,
  },
  completion: COMPLETION_STATUS.ALL,
  effort: {
    min: null,
    max: null,
  },
  aging: AGING_OPTIONS.ALL,
  columns: [],
};

export default class FilterManager {
  constructor() {
    this.filters = this.getDefaultFilters();
    this.presets = this.loadPresets();
    this.listeners = [];
  }

  getDefaultFilters() {
    return JSON.parse(JSON.stringify(DEFAULT_FILTERS));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.filters));
  }

  getFilters() {
    return this.filters;
  }

  isActive() {
    const f = this.filters;
    return (
      f.search.term.length > 0 ||
      f.labels.selected.length > 0 ||
      f.priority.selected.length > 0 ||
      f.dueDate.status !== DUE_STATUS.ALL ||
      f.dueDate.from !== null ||
      f.dueDate.to !== null ||
      f.startDate.from !== null ||
      f.startDate.to !== null ||
      f.completion !== COMPLETION_STATUS.ALL ||
      f.effort.min !== null ||
      f.effort.max !== null ||
      f.aging !== AGING_OPTIONS.ALL ||
      f.columns.length > 0
    );
  }

  getActiveFilterCount() {
    let count = 0;
    const f = this.filters;

    if (f.search.term.length > 0) count++;
    if (f.labels.selected.length > 0) count++;
    if (f.priority.selected.length > 0) count++;
    if (f.dueDate.status !== DUE_STATUS.ALL || f.dueDate.from || f.dueDate.to)
      count++;
    if (f.startDate.from || f.startDate.to) count++;
    if (f.completion !== COMPLETION_STATUS.ALL) count++;
    if (f.effort.min !== null || f.effort.max !== null) count++;
    if (f.aging !== AGING_OPTIONS.ALL) count++;
    if (f.columns.length > 0) count++;

    return count;
  }

  setSearch(term, options = {}) {
    this.filters.search = {
      ...this.filters.search,
      term: term || '',
      ...options,
    };
    this.notify();
  }

  setLabels(labelIds, matchMode = null) {
    this.filters.labels.selected = Array.isArray(labelIds)
      ? labelIds
      : [labelIds];
    if (matchMode) {
      this.filters.labels.matchMode = matchMode;
    }
    this.notify();
  }

  toggleLabel(labelId) {
    const idx = this.filters.labels.selected.indexOf(labelId);
    if (idx === -1) {
      this.filters.labels.selected.push(labelId);
    } else {
      this.filters.labels.selected.splice(idx, 1);
    }
    this.notify();
  }

  setLabelMatchMode(mode) {
    this.filters.labels.matchMode = mode;
    this.notify();
  }

  setPriorities(priorities) {
    this.filters.priority.selected = Array.isArray(priorities)
      ? priorities
      : [priorities];
    this.notify();
  }

  togglePriority(priority) {
    const idx = this.filters.priority.selected.indexOf(priority);
    if (idx === -1) {
      this.filters.priority.selected.push(priority);
    } else {
      this.filters.priority.selected.splice(idx, 1);
    }
    this.notify();
  }

  setDueDate(options) {
    this.filters.dueDate = {
      ...this.filters.dueDate,
      ...options,
    };
    this.notify();
  }

  setStartDate(options) {
    this.filters.startDate = {
      ...this.filters.startDate,
      ...options,
    };
    this.notify();
  }

  setCompletion(status) {
    this.filters.completion = status;
    this.notify();
  }

  setEffort(min, max) {
    this.filters.effort = { min, max };
    this.notify();
  }

  setAging(status) {
    this.filters.aging = status;
    this.notify();
  }

  setColumns(columnIds) {
    this.filters.columns = Array.isArray(columnIds) ? columnIds : [columnIds];
    this.notify();
  }

  clearAll() {
    this.filters = this.getDefaultFilters();
    this.notify();
  }

  clearFilter(category) {
    const defaults = this.getDefaultFilters();
    if (this.filters[category] !== undefined) {
      this.filters[category] = defaults[category];
      this.notify();
    }
  }

  applyFilters(cards, allLabels = []) {
    return cards.filter((card) => this.matchesAllFilters(card, allLabels));
  }

  matchesAllFilters(card, allLabels = []) {
    return (
      this.matchesSearch(card, allLabels) &&
      this.matchesLabels(card) &&
      this.matchesPriority(card) &&
      this.matchesDueDate(card) &&
      this.matchesStartDate(card) &&
      this.matchesCompletion(card) &&
      this.matchesEffort(card) &&
      this.matchesAging(card)
    );
  }

  matchesSearch(card, allLabels) {
    const { term, fields, operator, caseSensitive } = this.filters.search;
    if (!term) return true;

    const searchTerm = caseSensitive ? term : term.toLowerCase();

    const getFieldValue = (field) => {
      switch (field) {
        case 'text':
          return card.text || '';
        case 'description':
          return card.description || '';
        case 'labels':
          return (card.labels || [])
            .map((id) => {
              const label = allLabels.find((l) => l.id === id);
              return label ? label.name : '';
            })
            .join(' ');
        case 'logs':
          return (card.logs || []).map((log) => log.text).join(' ');
        default:
          return '';
      }
    };

    const matchField = (value) => {
      const compareValue = caseSensitive ? value : value.toLowerCase();
      switch (operator) {
        case SEARCH_OPERATORS.EXACT:
          return compareValue === searchTerm;
        case SEARCH_OPERATORS.STARTS_WITH:
          return compareValue.startsWith(searchTerm);
        case SEARCH_OPERATORS.NOT_CONTAINS:
          return !compareValue.includes(searchTerm);
        case SEARCH_OPERATORS.CONTAINS:
        default:
          return compareValue.includes(searchTerm);
      }
    };

    return fields.some((field) => matchField(getFieldValue(field)));
  }

  matchesLabels(card) {
    const { selected, matchMode } = this.filters.labels;
    if (selected.length === 0) return true;

    const cardLabels = card.labels || [];

    switch (matchMode) {
      case LABEL_MATCH_MODE.ALL:
        return selected.every((labelId) => cardLabels.includes(labelId));
      case LABEL_MATCH_MODE.NONE:
        return !selected.some((labelId) => cardLabels.includes(labelId));
      case LABEL_MATCH_MODE.ANY:
      default:
        return selected.some((labelId) => cardLabels.includes(labelId));
    }
  }

  matchesPriority(card) {
    const { selected } = this.filters.priority;
    if (selected.length === 0) return true;
    return selected.includes(card.priority || 'none');
  }

  matchesDueDate(card) {
    const { status, from, to } = this.filters.dueDate;

    if (status !== DUE_STATUS.ALL) {
      const hasDueDate = !!card.dueDate;

      switch (status) {
        case DUE_STATUS.NO_DUE_DATE:
          if (hasDueDate) return false;
          break;
        case DUE_STATUS.HAS_DUE_DATE:
          if (!hasDueDate) return false;
          break;
        case DUE_STATUS.OVERDUE:
          if (!hasDueDate || !this.isOverdue(card.dueDate)) return false;
          break;
        case DUE_STATUS.DUE_TODAY:
          if (!hasDueDate || !this.isDueToday(card.dueDate)) return false;
          break;
        case DUE_STATUS.DUE_THIS_WEEK:
          if (!hasDueDate || !this.isDueThisWeek(card.dueDate)) return false;
          break;
        case DUE_STATUS.DUE_SOON:
          if (!hasDueDate || !this.isDueSoon(card.dueDate)) return false;
          break;
      }
    }

    if (from || to) {
      if (!card.dueDate) return false;
      const dueDate = new Date(card.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        if (dueDate < fromDate) return false;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        if (dueDate > toDate) return false;
      }
    }

    return true;
  }

  matchesStartDate(card) {
    const { from, to } = this.filters.startDate;
    if (!from && !to) return true;
    if (!card.startDate) return false;

    const startDate = new Date(card.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      if (startDate < fromDate) return false;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (startDate > toDate) return false;
    }

    return true;
  }

  matchesCompletion(card) {
    const status = this.filters.completion;
    if (status === COMPLETION_STATUS.ALL) return true;

    const isCompleted = card.completed === true;
    return status === COMPLETION_STATUS.COMPLETED ? isCompleted : !isCompleted;
  }

  matchesEffort(card) {
    const { min, max } = this.filters.effort;
    if (min === null && max === null) return true;

    const effort = Number(card.effort) || 0;

    if (min !== null && effort < min) return false;
    if (max !== null && effort > max) return false;

    return true;
  }

  matchesAging(card) {
    const status = this.filters.aging;
    if (status === AGING_OPTIONS.ALL) return true;
    if (card.completed) return true; // Don't filter completed cards by aging

    const days = this.getDaysAgo(card.updatedAt);

    switch (status) {
      case AGING_OPTIONS.FRESH:
        return days < 3;
      case AGING_OPTIONS.AGING:
        return days >= 3 && days < 7;
      case AGING_OPTIONS.STALE:
        return days >= 7 && days < 14;
      case AGING_OPTIONS.ABANDONED:
        return days >= 14;
      default:
        return true;
    }
  }

  isOverdue(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  }

  isDueToday(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    return (
      due.getFullYear() === today.getFullYear() &&
      due.getMonth() === today.getMonth() &&
      due.getDate() === today.getDate()
    );
  }

  isDueThisWeek(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    return due >= today && due <= endOfWeek;
  }

  isDueSoon(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);
    threeDays.setHours(23, 59, 59, 999);

    return due >= today && due <= threeDays;
  }

  getDaysAgo(dateStr) {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((now - date) / msPerDay);
  }

  loadPresets() {
    try {
      const saved = localStorage.getItem('kanban-filter-presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  savePresets() {
    localStorage.setItem('kanban-filter-presets', JSON.stringify(this.presets));
  }

  getPresets() {
    return this.presets;
  }

  createPreset(name) {
    const preset = {
      id: `preset-${Date.now()}`,
      name,
      filters: JSON.parse(JSON.stringify(this.filters)),
      createdAt: new Date().toISOString(),
    };
    this.presets.push(preset);
    this.savePresets();
    return preset;
  }

  applyPreset(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (preset) {
      this.filters = JSON.parse(JSON.stringify(preset.filters));
      this.notify();
      return true;
    }
    return false;
  }

  deletePreset(presetId) {
    const idx = this.presets.findIndex((p) => p.id === presetId);
    if (idx !== -1) {
      this.presets.splice(idx, 1);
      this.savePresets();
      return true;
    }
    return false;
  }

  getActiveFilterChips(allLabels = []) {
    const chips = [];

    if (this.filters.search.term) {
      chips.push({
        type: 'search',
        label:
          i18n.t('filters.chips.search', { term: this.filters.search.term }) ||
          `Search: "${this.filters.search.term}"`,
        value: this.filters.search.term,
        clear: () => this.clearFilter('search'),
      });
    }

    if (this.filters.labels.selected.length > 0) {
      const labelNames = this.filters.labels.selected
        .map((id) => {
          const label = allLabels.find((l) => l.id === id);
          return label ? label.name : id;
        })
        .join(', ');

      const modeText =
        this.filters.labels.matchMode === LABEL_MATCH_MODE.ALL
          ? 'ALL'
          : this.filters.labels.matchMode === LABEL_MATCH_MODE.NONE
            ? 'NONE'
            : 'ANY';

      chips.push({
        type: 'labels',
        label: `Labels (${modeText}): ${labelNames}`,
        value: this.filters.labels.selected,
        clear: () => this.clearFilter('labels'),
      });
    }

    if (this.filters.priority.selected.length > 0) {
      const priorityNames = this.filters.priority.selected
        .map((p) => i18n.t(`card.priorities.${p}`) || p)
        .join(', ');

      chips.push({
        type: 'priority',
        label: `Priority: ${priorityNames}`,
        value: this.filters.priority.selected,
        clear: () => this.clearFilter('priority'),
      });
    }

    if (
      this.filters.dueDate.status !== DUE_STATUS.ALL ||
      this.filters.dueDate.from ||
      this.filters.dueDate.to
    ) {
      let label = 'Due: ';
      if (this.filters.dueDate.status !== DUE_STATUS.ALL) {
        label +=
          i18n.t(`filters.dueStatus.${this.filters.dueDate.status}`) ||
          this.filters.dueDate.status;
      }
      if (this.filters.dueDate.from || this.filters.dueDate.to) {
        if (this.filters.dueDate.status !== DUE_STATUS.ALL) label += ', ';
        if (this.filters.dueDate.from)
          label += `from ${this.filters.dueDate.from}`;
        if (this.filters.dueDate.to) label += ` to ${this.filters.dueDate.to}`;
      }

      chips.push({
        type: 'dueDate',
        label,
        clear: () => this.clearFilter('dueDate'),
      });
    }

    if (this.filters.startDate.from || this.filters.startDate.to) {
      let label = 'Start: ';
      if (this.filters.startDate.from)
        label += `from ${this.filters.startDate.from}`;
      if (this.filters.startDate.to)
        label += ` to ${this.filters.startDate.to}`;

      chips.push({
        type: 'startDate',
        label,
        clear: () => this.clearFilter('startDate'),
      });
    }

    if (this.filters.completion !== COMPLETION_STATUS.ALL) {
      chips.push({
        type: 'completion',
        label: `Status: ${i18n.t(`filters.completion.${this.filters.completion}`) || this.filters.completion}`,
        value: this.filters.completion,
        clear: () => this.clearFilter('completion'),
      });
    }

    if (this.filters.effort.min !== null || this.filters.effort.max !== null) {
      let label = 'Effort: ';
      if (
        this.filters.effort.min !== null &&
        this.filters.effort.max !== null
      ) {
        label += `${this.filters.effort.min}h - ${this.filters.effort.max}h`;
      } else if (this.filters.effort.min !== null) {
        label += `≥ ${this.filters.effort.min}h`;
      } else {
        label += `≤ ${this.filters.effort.max}h`;
      }

      chips.push({
        type: 'effort',
        label,
        clear: () => this.clearFilter('effort'),
      });
    }

    if (this.filters.aging !== AGING_OPTIONS.ALL) {
      chips.push({
        type: 'aging',
        label: `Activity: ${i18n.t(`filters.aging.${this.filters.aging}`) || this.filters.aging}`,
        value: this.filters.aging,
        clear: () => this.clearFilter('aging'),
      });
    }

    return chips;
  }

  exportFilters() {
    return JSON.stringify(this.filters, null, 2);
  }

  importFilters(json) {
    try {
      const imported = JSON.parse(json);
      this.filters = { ...this.getDefaultFilters(), ...imported };
      this.notify();
      return true;
    } catch {
      return false;
    }
  }
}
