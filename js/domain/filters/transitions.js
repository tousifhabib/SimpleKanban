// UI-store transitions for filter state: { filters, presets }.
// Merge semantics mirror the legacy FilterManager#update: object-valued
// criteria merge patches, scalar criteria replace.

import { DEFAULT_FILTERS } from './model.js';

const patchFilter = (state, key, patch) => ({
  ...state,
  filters: {
    ...state.filters,
    [key]:
      typeof patch === 'object' && !Array.isArray(patch) && patch !== null
        ? { ...state.filters[key], ...patch }
        : patch,
  },
});

export const filterTransitions = Object.freeze({
  'filters/searchSet': (state, { term, opts = {} }) =>
    patchFilter(state, 'search', { term: term || '', ...opts }),

  'filters/labelsSet': (state, { ids, mode }) =>
    patchFilter(state, 'labels', {
      selected: [].concat(ids),
      ...(mode && { matchMode: mode }),
    }),

  'filters/labelToggled': (state, { id }) =>
    patchFilter(state, 'labels', {
      selected: state.filters.labels.selected.includes(id)
        ? state.filters.labels.selected.filter((x) => x !== id)
        : [...state.filters.labels.selected, id],
    }),

  'filters/labelModeSet': (state, { mode }) =>
    patchFilter(state, 'labels', { matchMode: mode }),

  'filters/prioritiesSet': (state, { selected }) =>
    patchFilter(state, 'priority', { selected: [].concat(selected) }),

  'filters/dueDateSet': (state, { patch }) =>
    patchFilter(state, 'dueDate', patch),

  'filters/startDateSet': (state, { patch }) =>
    patchFilter(state, 'startDate', patch),

  'filters/completionSet': (state, { status }) =>
    patchFilter(state, 'completion', status),

  'filters/effortSet': (state, { min, max }) =>
    patchFilter(state, 'effort', { min, max }),

  'filters/agingSet': (state, { status }) =>
    patchFilter(state, 'aging', status),

  'filters/columnsSet': (state, { ids }) =>
    patchFilter(state, 'columns', [].concat(ids)),

  'filters/cleared': (state, { key }) => ({
    ...state,
    filters: { ...state.filters, [key]: DEFAULT_FILTERS[key] },
  }),

  'filters/allCleared': (state) => ({ ...state, filters: DEFAULT_FILTERS }),

  'filters/presetCreated': (state, { id, name }) => ({
    ...state,
    presets: [...state.presets, { id, name, filters: state.filters }],
  }),

  'filters/presetApplied': (state, { id }) => {
    const preset = state.presets.find((p) => p.id === id);
    return preset ? { ...state, filters: preset.filters } : state;
  },

  'filters/presetDeleted': (state, { id }) => ({
    ...state,
    presets: state.presets.filter((p) => p.id !== id),
  }),
});
