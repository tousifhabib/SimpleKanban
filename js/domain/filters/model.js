// Filter criteria as data: enums and the default (inactive) criteria
// record. Filter state lives in the UI store; these are its vocabulary.

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

export const DEFAULT_FILTERS = Object.freeze({
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
});

export const initialFilterState = (presets = []) => ({
  filters: DEFAULT_FILTERS,
  presets,
});
