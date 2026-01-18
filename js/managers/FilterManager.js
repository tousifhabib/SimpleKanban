import { i18n } from '../services/i18n/i18nService.js';

export const SEARCH_OPERATORS = {
  CONTAINS: 'contains',
  EXACT: 'exact',
  STARTS_WITH: 'startsWith',
  NOT_CONTAINS: 'notContains',
};
export const LABEL_MATCH_MODE = { ANY: 'any', ALL: 'all', NONE: 'none' };
export const DUE_STATUS = {
  ALL: 'all',
  OVERDUE: 'overdue',
  DUE_TODAY: 'dueToday',
  DUE_THIS_WEEK: 'dueThisWeek',
  DUE_SOON: 'dueSoon',
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

const MS_DAY = 86400000;
const getDaysAgo = (d) =>
  !d ? 0 : Math.floor((new Date() - new Date(d)) / MS_DAY);
const toDate = (d, end) => {
  const x = new Date(d);
  x.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, 999);
  return x;
};

const FILTERS = {
  search: (c, { term, fields, operator, caseSensitive }, allLabels) => {
    if (!term) return true;
    const s = caseSensitive ? term : term.toLowerCase();
    const val = (v) => (caseSensitive ? v : v.toLowerCase());

    const getters = {
      text: (c) => c.text || '',
      description: (c) => c.description || '',
      labels: (c) =>
        (c.labels || [])
          .map((id) => allLabels.find((l) => l.id === id)?.name || '')
          .join(' '),
      logs: (c) => (c.logs || []).map((l) => l.text).join(' '),
    };

    const ops = {
      [SEARCH_OPERATORS.CONTAINS]: (a, b) => a.includes(b),
      [SEARCH_OPERATORS.EXACT]: (a, b) => a === b,
      [SEARCH_OPERATORS.STARTS_WITH]: (a, b) => a.startsWith(b),
      [SEARCH_OPERATORS.NOT_CONTAINS]: (a, b) => !a.includes(b),
    };

    return fields.some((f) => ops[operator](val(getters[f](c)), s));
  },

  labels: (c, { selected, matchMode }) => {
    if (!selected.length) return true;
    const has = (id) => (c.labels || []).includes(id);
    const modes = {
      [LABEL_MATCH_MODE.ALL]: () => selected.every(has),
      [LABEL_MATCH_MODE.NONE]: () => !selected.some(has),
      [LABEL_MATCH_MODE.ANY]: () => selected.some(has),
    };
    return modes[matchMode]();
  },

  priority: (c, { selected }) =>
    !selected.length || selected.includes(c.priority || 'none'),

  dueDate: (c, { status, from, to }) => {
    if (status !== DUE_STATUS.ALL) {
      if (!c.dueDate && status === DUE_STATUS.HAS_DUE_DATE) return false;
      if (c.dueDate && status === DUE_STATUS.NO_DUE_DATE) return false;
      if (!c.dueDate) return status === DUE_STATUS.NO_DUE_DATE;

      const d = new Date(c.dueDate);
      d.setHours(0, 0, 0, 0);
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const diff = (d - t) / MS_DAY;

      const checks = {
        [DUE_STATUS.OVERDUE]: () => toDate(c.dueDate, true) < new Date(),
        [DUE_STATUS.DUE_TODAY]: () => diff === 0,
        [DUE_STATUS.DUE_THIS_WEEK]: () => {
          const eow = new Date(t);
          eow.setDate(t.getDate() + (7 - t.getDay()));
          return d >= t && d <= eow;
        },
        [DUE_STATUS.DUE_SOON]: () => diff >= 0 && diff <= 3,
      };
      if (checks[status] && !checks[status]()) return false;
    }

    if (from && toDate(c.dueDate) < toDate(from)) return false;
    if (to && toDate(c.dueDate) > toDate(to, true)) return false;
    return true;
  },

  startDate: (c, { from, to }) => {
    if (!c.startDate && (from || to)) return false;
    if (from && toDate(c.startDate) < toDate(from)) return false;
    if (to && toDate(c.startDate) > toDate(to, true)) return false;
    return true;
  },

  completion: (c, status) =>
    status === COMPLETION_STATUS.ALL ||
    (status === COMPLETION_STATUS.COMPLETED ? c.completed : !c.completed),

  effort: (c, { min, max }) => {
    const e = Number(c.effort) || 0;
    return (min === null || e >= min) && (max === null || e <= max);
  },

  aging: (c, status) => {
    if (status === AGING_OPTIONS.ALL || c.completed) return true;
    const days = getDaysAgo(c.updatedAt);
    const ranges = {
      [AGING_OPTIONS.FRESH]: (d) => d < 3,
      [AGING_OPTIONS.AGING]: (d) => d >= 3 && d < 7,
      [AGING_OPTIONS.STALE]: (d) => d >= 7 && d < 14,
      [AGING_OPTIONS.ABANDONED]: (d) => d >= 14,
    };
    return ranges[status](days);
  },
};

const DEFAULT_STATE = {
  search: {
    term: '',
    fields: ['text', 'description', 'labels'],
    operator: SEARCH_OPERATORS.CONTAINS,
    caseSensitive: false,
  },
  labels: { selected: [], matchMode: LABEL_MATCH_MODE.ANY },
  priority: { selected: [] },
  dueDate: { status: DUE_STATUS.ALL, from: null, to: null },
  startDate: { from: null, to: null },
  completion: COMPLETION_STATUS.ALL,
  effort: { min: null, max: null },
  aging: AGING_OPTIONS.ALL,
  columns: [],
};

export default class FilterManager {
  constructor() {
    this.filters = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.presets = JSON.parse(
      localStorage.getItem('kanban-filter-presets') || '[]'
    );
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    this.listeners.forEach((fn) => fn(this.filters));
  }
  getFilters() {
    return this.filters;
  }

  update(key, val) {
    this.filters[key] =
      typeof val === 'object' && !Array.isArray(val)
        ? { ...this.filters[key], ...val }
        : val;
    this.notify();
  }

  setSearch(term, opts = {}) {
    this.update('search', { term: term || '', ...opts });
  }
  setLabels(ids, mode) {
    this.update('labels', {
      selected: [].concat(ids),
      ...(mode && { matchMode: mode }),
    });
  }
  toggleLabel(id) {
    const s = this.filters.labels.selected;
    this.setLabels(s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }
  setLabelMatchMode(mode) {
    this.update('labels', { matchMode: mode });
  }
  setPriorities(p) {
    this.update('priority', { selected: [].concat(p) });
  }
  setDueDate(opts) {
    this.update('dueDate', opts);
  }
  setStartDate(opts) {
    this.update('startDate', opts);
  }
  setCompletion(s) {
    this.update('completion', s);
  }
  setEffort(min, max) {
    this.update('effort', { min, max });
  }
  setAging(s) {
    this.update('aging', s);
  }
  setColumns(ids) {
    this.update('columns', [].concat(ids));
  }

  clearAll() {
    this.filters = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.notify();
  }
  clearFilter(k) {
    this.filters[k] = JSON.parse(JSON.stringify(DEFAULT_STATE[k]));
    this.notify();
  }

  isActive() {
    return JSON.stringify(this.filters) !== JSON.stringify(DEFAULT_STATE);
  }

  getActiveFilterCount() {
    return Object.keys(DEFAULT_STATE).reduce((acc, key) => {
      const isDef =
        JSON.stringify(this.filters[key]) ===
        JSON.stringify(DEFAULT_STATE[key]);
      return acc + (isDef ? 0 : 1);
    }, 0);
  }

  applyFilters(cards, labels = []) {
    if (!this.isActive()) return cards;
    return cards.filter((c) =>
      Object.keys(FILTERS).every((k) => FILTERS[k](c, this.filters[k], labels))
    );
  }

  createPreset(name) {
    this.presets.push({
      id: `p-${Date.now()}`,
      name,
      filters: JSON.parse(JSON.stringify(this.filters)),
    });
    this.savePresets();
  }

  applyPreset(id) {
    const p = this.presets.find((x) => x.id === id);
    if (p) {
      this.filters = JSON.parse(JSON.stringify(p.filters));
      this.notify();
    }
  }

  deletePreset(id) {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.savePresets();
  }

  savePresets() {
    localStorage.setItem('kanban-filter-presets', JSON.stringify(this.presets));
  }
  getPresets() {
    return this.presets;
  }

  getActiveFilterChips(allLabels = []) {
    const chips = [];
    const f = this.filters;
    const t = (k, p) => i18n.t(k, p) || k;

    if (f.search.term)
      chips.push({
        type: 'search',
        label: t('filters.chips.search', { term: f.search.term }),
        clear: () => this.clearFilter('search'),
      });

    if (f.labels.selected.length) {
      const names = f.labels.selected
        .map((id) => allLabels.find((l) => l.id === id)?.name || id)
        .join(', ');
      chips.push({
        type: 'labels',
        label: `Labels (${f.labels.matchMode}): ${names}`,
        clear: () => this.clearFilter('labels'),
      });
    }

    if (f.priority.selected.length) {
      chips.push({
        type: 'priority',
        label: `Priority: ${f.priority.selected.join(', ')}`,
        clear: () => this.clearFilter('priority'),
      });
    }

    if (f.dueDate.status !== DUE_STATUS.ALL || f.dueDate.from || f.dueDate.to) {
      const parts = [];
      if (f.dueDate.status !== DUE_STATUS.ALL)
        parts.push(t(`filters.dueStatus.${f.dueDate.status}`));
      if (f.dueDate.from) parts.push(`> ${f.dueDate.from}`);
      if (f.dueDate.to) parts.push(`< ${f.dueDate.to}`);
      chips.push({
        type: 'dueDate',
        label: `Due: ${parts.join(' ')}`,
        clear: () => this.clearFilter('dueDate'),
      });
    }

    if (f.startDate.from || f.startDate.to) {
      chips.push({
        type: 'startDate',
        label: `Start: ${f.startDate.from || ''} - ${f.startDate.to || ''}`,
        clear: () => this.clearFilter('startDate'),
      });
    }

    if (f.completion !== COMPLETION_STATUS.ALL) {
      chips.push({
        type: 'completion',
        label: t(`filters.completion.${f.completion}`),
        clear: () => this.clearFilter('completion'),
      });
    }

    if (f.effort.min !== null || f.effort.max !== null) {
      chips.push({
        type: 'effort',
        label: `Effort: ${f.effort.min ?? 0}h - ${f.effort.max ?? '∞'}h`,
        clear: () => this.clearFilter('effort'),
      });
    }

    if (f.aging !== AGING_OPTIONS.ALL) {
      chips.push({
        type: 'aging',
        label: t(`filters.aging.${f.aging}`),
        clear: () => this.clearFilter('aging'),
      });
    }

    return chips;
  }
}
