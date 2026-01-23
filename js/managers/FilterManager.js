import { createObservable } from '../core/Observable.js';
import { i18n } from '../services/i18n/i18nService.js';
import {
  toDate,
  getDaysDiff,
  getEndOfWeek,
  AGING_THRESHOLDS,
  DUE_SOON_DAYS,
} from '../utils/dateUtils.js';

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

const FILTERS = {
  search: (card, { term, fields, operator, caseSensitive }, allLabels) => {
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

    return fields.some((f) => ops[operator](val(getters[f](card)), s));
  },

  labels: (card, { selected, matchMode }) => {
    if (!selected.length) return true;
    const has = (id) => (card.labels || []).includes(id);
    const modes = {
      [LABEL_MATCH_MODE.ALL]: () => selected.every(has),
      [LABEL_MATCH_MODE.NONE]: () => !selected.some(has),
      [LABEL_MATCH_MODE.ANY]: () => selected.some(has),
    };
    return modes[matchMode]();
  },

  priority: (card, { selected }) =>
    !selected.length || selected.includes(card.priority || 'none'),

  dueDate: (card, { status, from, to }) => {
    if (status !== DUE_STATUS.ALL) {
      if (!card.dueDate && status === DUE_STATUS.HAS_DUE_DATE) return false;
      if (card.dueDate && status === DUE_STATUS.NO_DUE_DATE) return false;
      if (!card.dueDate) return status === DUE_STATUS.NO_DUE_DATE;

      const d = toDate(card.dueDate);
      const t = toDate(new Date());
      const diffDays = Math.ceil((d - t) / 86400000);

      const checks = {
        [DUE_STATUS.OVERDUE]: () => toDate(card.dueDate, true) < new Date(),
        [DUE_STATUS.DUE_TODAY]: () => diffDays === 0,
        [DUE_STATUS.DUE_THIS_WEEK]: () => d >= t && d <= getEndOfWeek(),
        [DUE_STATUS.DUE_SOON]: () => diffDays >= 0 && diffDays <= DUE_SOON_DAYS,
      };
      if (checks[status] && !checks[status]()) return false;
    }

    if (from && toDate(card.dueDate) < toDate(from)) return false;
    if (to && toDate(card.dueDate) > toDate(to, true)) return false;
    return true;
  },

  startDate: (card, { from, to }) => {
    if (!card.startDate && (from || to)) return false;
    if (from && toDate(card.startDate) < toDate(from)) return false;
    if (to && toDate(card.startDate) > toDate(to, true)) return false;
    return true;
  },

  completion: (card, status) =>
    status === COMPLETION_STATUS.ALL ||
    (status === COMPLETION_STATUS.COMPLETED ? card.completed : !card.completed),

  effort: (card, { min, max }) => {
    const e = Number(card.effort) || 0;
    return (min === null || e >= min) && (max === null || e <= max);
  },

  aging: (card, status) => {
    if (status === AGING_OPTIONS.ALL || card.completed) return true;
    const days = getDaysDiff(card.updatedAt);
    const checks = {
      [AGING_OPTIONS.FRESH]: (d) => d < AGING_THRESHOLDS.FRESH,
      [AGING_OPTIONS.AGING]: (d) =>
        d >= AGING_THRESHOLDS.FRESH && d < AGING_THRESHOLDS.AGING,
      [AGING_OPTIONS.STALE]: (d) =>
        d >= AGING_THRESHOLDS.AGING && d < AGING_THRESHOLDS.STALE,
      [AGING_OPTIONS.ABANDONED]: (d) => d >= AGING_THRESHOLDS.STALE,
    };
    return checks[status](days);
  },

  columns: () => true,
};

const CHIP_CONFIGS = [
  {
    key: 'search',
    test: (f) => f.search.term,
    chip: (f) => ({
      label: i18n.t('filters.chips.search', { term: f.search.term }),
    }),
  },
  {
    key: 'labels',
    test: (f) => f.labels.selected.length,
    chip: (f, labels) => ({
      label: `Labels (${f.labels.matchMode}): ${f.labels.selected
        .map((id) => labels.find((l) => l.id === id)?.name || id)
        .join(', ')}`,
    }),
  },
  {
    key: 'priority',
    test: (f) => f.priority.selected.length,
    chip: (f) => ({ label: `Priority: ${f.priority.selected.join(', ')}` }),
  },
  {
    key: 'dueDate',
    test: (f) =>
      f.dueDate.status !== DUE_STATUS.ALL || f.dueDate.from || f.dueDate.to,
    chip: (f) => {
      const parts = [];
      if (f.dueDate.status !== DUE_STATUS.ALL)
        parts.push(i18n.t(`filters.dueStatus.${f.dueDate.status}`));
      if (f.dueDate.from) parts.push(`> ${f.dueDate.from}`);
      if (f.dueDate.to) parts.push(`< ${f.dueDate.to}`);
      return { label: `Due: ${parts.join(' ')}` };
    },
  },
  {
    key: 'startDate',
    test: (f) => f.startDate.from || f.startDate.to,
    chip: (f) => ({
      label: `Start: ${f.startDate.from || ''} - ${f.startDate.to || ''}`,
    }),
  },
  {
    key: 'completion',
    test: (f) => f.completion !== COMPLETION_STATUS.ALL,
    chip: (f) => ({ label: i18n.t(`filters.completion.${f.completion}`) }),
  },
  {
    key: 'effort',
    test: (f) => f.effort.min !== null || f.effort.max !== null,
    chip: (f) => ({
      label: `Effort: ${f.effort.min ?? 0}h - ${f.effort.max ?? '∞'}h`,
    }),
  },
  {
    key: 'aging',
    test: (f) => f.aging !== AGING_OPTIONS.ALL,
    chip: (f) => ({ label: i18n.t(`filters.aging.${f.aging}`) }),
  },
];

export default class FilterManager {
  constructor() {
    this.observable = createObservable();
    this.filters = structuredClone(DEFAULT_STATE);
    this.presets = JSON.parse(
      localStorage.getItem('kanban-filter-presets') || '[]'
    );
  }

  subscribe(fn) {
    return this.observable.subscribe(fn);
  }

  notify(data) {
    this.observable.notify(data);
  }

  getFilters = () => this.filters;

  #update(key, val) {
    this.filters[key] =
      typeof val === 'object' && !Array.isArray(val)
        ? { ...this.filters[key], ...val }
        : val;
    this.notify(this.filters);
  }

  setSearch = (term, opts = {}) =>
    this.#update('search', { term: term || '', ...opts });

  setLabels = (ids, mode) =>
    this.#update('labels', {
      selected: [].concat(ids),
      ...(mode && { matchMode: mode }),
    });

  toggleLabel = (id) =>
    this.setLabels(
      this.filters.labels.selected.includes(id)
        ? this.filters.labels.selected.filter((x) => x !== id)
        : [...this.filters.labels.selected, id]
    );

  setLabelMatchMode = (mode) => this.#update('labels', { matchMode: mode });
  setPriorities = (p) => this.#update('priority', { selected: [].concat(p) });
  setDueDate = (opts) => this.#update('dueDate', opts);
  setStartDate = (opts) => this.#update('startDate', opts);
  setCompletion = (s) => this.#update('completion', s);
  setEffort = (min, max) => this.#update('effort', { min, max });
  setAging = (s) => this.#update('aging', s);
  setColumns = (ids) => this.#update('columns', [].concat(ids));

  clearAll() {
    this.filters = structuredClone(DEFAULT_STATE);
    this.notify(this.filters);
  }

  clearFilter(k) {
    this.filters[k] = structuredClone(DEFAULT_STATE[k]);
    this.notify(this.filters);
  }

  isActive = () =>
    JSON.stringify(this.filters) !== JSON.stringify(DEFAULT_STATE);

  getActiveFilterCount = () =>
    Object.keys(DEFAULT_STATE).filter(
      (k) =>
        JSON.stringify(this.filters[k]) !== JSON.stringify(DEFAULT_STATE[k])
    ).length;

  applyFilters = (cards, labels = []) =>
    this.isActive()
      ? cards.filter((c) =>
          Object.keys(FILTERS).every((k) =>
            FILTERS[k](c, this.filters[k], labels)
          )
        )
      : cards;

  createPreset(name) {
    this.presets.push({
      id: `p-${Date.now()}`,
      name,
      filters: structuredClone(this.filters),
    });
    this.savePresets();
  }

  applyPreset(id) {
    const p = this.presets.find((x) => x.id === id);
    if (p) {
      this.filters = structuredClone(p.filters);
      this.notify(this.filters);
    }
  }

  deletePreset(id) {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.savePresets();
  }

  savePresets = () =>
    localStorage.setItem('kanban-filter-presets', JSON.stringify(this.presets));

  getPresets = () => this.presets;

  getActiveFilterChips(allLabels = []) {
    return CHIP_CONFIGS.filter((cfg) => cfg.test(this.filters)).map((cfg) => ({
      type: cfg.key,
      ...cfg.chip(this.filters, allLabels),
      clear: () => this.clearFilter(cfg.key),
    }));
  }
}
