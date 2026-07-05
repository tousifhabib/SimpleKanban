// Filter predicates: (config, ctx) => (card) => boolean, where
// ctx = { labels, now }. Ambient time is gone — `now` is an input.
// Semantics are frozen by the characterization suite, quirks included.

import {
  toDate,
  getDaysDiff,
  getEndOfWeek,
  AGING_THRESHOLDS,
  DUE_SOON_DAYS,
  MS_DAY,
} from '../dates.js';
import {
  SEARCH_OPERATORS,
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
  DEFAULT_FILTERS,
} from './model.js';

const PREDICATES = {
  search:
    ({ term, fields, operator, caseSensitive }, { labels }) =>
    (card) => {
      if (!term) return true;
      const needle = caseSensitive ? term : term.toLowerCase();
      const val = (v) => (caseSensitive ? v : v.toLowerCase());

      const getters = {
        text: (c) => c.text || '',
        description: (c) => c.description || '',
        labels: (c) =>
          (c.labels || [])
            .map((id) => labels.find((l) => l.id === id)?.name || '')
            .join(' '),
        logs: (c) => (c.logs || []).map((l) => l.text).join(' '),
      };

      const ops = {
        [SEARCH_OPERATORS.CONTAINS]: (a, b) => a.includes(b),
        [SEARCH_OPERATORS.EXACT]: (a, b) => a === b,
        [SEARCH_OPERATORS.STARTS_WITH]: (a, b) => a.startsWith(b),
        [SEARCH_OPERATORS.NOT_CONTAINS]: (a, b) => !a.includes(b),
      };

      // Positive operators match if ANY field matches; the negative
      // operator requires the term absent from EVERY field — making
      // NOT_CONTAINS the true complement of CONTAINS.
      const combine =
        operator === SEARCH_OPERATORS.NOT_CONTAINS ? 'every' : 'some';
      return fields[combine]((f) =>
        ops[operator](val(getters[f](card)), needle)
      );
    },

  labels:
    ({ selected, matchMode }) =>
    (card) => {
      if (!selected.length) return true;
      const has = (id) => (card.labels || []).includes(id);
      const modes = {
        [LABEL_MATCH_MODE.ALL]: () => selected.every(has),
        [LABEL_MATCH_MODE.NONE]: () => !selected.some(has),
        [LABEL_MATCH_MODE.ANY]: () => selected.some(has),
      };
      return modes[matchMode]();
    },

  priority:
    ({ selected }) =>
    (card) =>
      !selected.length || selected.includes(card.priority || 'none'),

  dueDate:
    ({ status, from, to }, { now }) =>
    (card) => {
      if (status !== DUE_STATUS.ALL) {
        if (!card.dueDate && status === DUE_STATUS.HAS_DUE_DATE) return false;
        if (card.dueDate && status === DUE_STATUS.NO_DUE_DATE) return false;
        if (!card.dueDate) return status === DUE_STATUS.NO_DUE_DATE;

        const d = toDate(card.dueDate);
        const t = toDate(now);
        const diffDays = Math.ceil((d - t) / MS_DAY);

        const checks = {
          [DUE_STATUS.OVERDUE]: () => toDate(card.dueDate, true) < now,
          [DUE_STATUS.DUE_TODAY]: () => diffDays === 0,
          [DUE_STATUS.DUE_THIS_WEEK]: () => d >= t && d <= getEndOfWeek(now),
          [DUE_STATUS.DUE_SOON]: () =>
            diffDays >= 0 && diffDays <= DUE_SOON_DAYS,
        };
        if (checks[status] && !checks[status]()) return false;
      }

      // The from/to range constrains DATED cards only; visibility of
      // undated cards is governed by the status dropdown. (Previously
      // any range silently hid every undated card, and combining a
      // range with NO_DUE_DATE returned nothing.)
      if (card.dueDate) {
        if (from && toDate(card.dueDate) < toDate(from)) return false;
        if (to && toDate(card.dueDate) > toDate(to, true)) return false;
      }
      return true;
    },

  startDate:
    ({ from, to }) =>
    (card) => {
      if (!card.startDate && (from || to)) return false;
      if (from && toDate(card.startDate) < toDate(from)) return false;
      if (to && toDate(card.startDate) > toDate(to, true)) return false;
      return true;
    },

  completion: (status) => (card) =>
    status === COMPLETION_STATUS.ALL ||
    (status === COMPLETION_STATUS.COMPLETED ? card.completed : !card.completed),

  effort:
    ({ min, max }) =>
    (card) => {
      const e = Number(card.effort) || 0;
      return (min === null || e >= min) && (max === null || e <= max);
    },

  aging:
    (status, { now }) =>
    (card) => {
      if (status === AGING_OPTIONS.ALL || card.completed) return true;
      const days = getDaysDiff(card.updatedAt, now);
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

  columns: () => () => true,
};

// Structural equality against defaults — legacy semantics (key-order
// sensitive JSON comparison, preserved deliberately).
export const isActive = (filters) =>
  JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

export const activeFilterCount = (filters) =>
  Object.keys(DEFAULT_FILTERS).filter(
    (key) =>
      JSON.stringify(filters[key]) !== JSON.stringify(DEFAULT_FILTERS[key])
  ).length;

// filterCards: (filters, ctx) => (cards) => cards
// Inactive filters are the identity — the SAME array reference.
export const filterCards = (filters, ctx) => (cards) => {
  if (!isActive(filters)) return cards;
  const activePredicates = Object.keys(PREDICATES).map((key) =>
    PREDICATES[key](filters[key], ctx)
  );
  return cards.filter((card) => activePredicates.every((p) => p(card)));
};
