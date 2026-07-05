// Test-harness adapter mapping the legacy FilterManager method API onto
// the real filter store + pure predicates, so the characterization suite
// keeps exercising production behavior unchanged.

import { createFilterStore } from '../../js/app/filterStore.js';
import { createEnv } from '../../js/ports/env.js';
import {
  filterCards,
  isActive,
  activeFilterCount,
} from '../../js/domain/filters/predicates.js';
import { activeChips } from '../../js/domain/filters/chips.js';
import { i18n } from '../../js/services/i18n/i18nService.js';

export const legacyFilterManager = () => {
  const env = createEnv(window);
  const store = createFilterStore(env);
  const dispatch = store.dispatch;
  const filters = () => store.getState().filters;
  const t = (k, p) => i18n.t(k, p);

  return {
    subscribe: store.subscribe,
    getFilters: filters,
    setSearch: (term, opts = {}) =>
      dispatch({ type: 'filters/searchSet', payload: { term, opts } }),
    setLabels: (ids, mode) =>
      dispatch({ type: 'filters/labelsSet', payload: { ids, mode } }),
    toggleLabel: (id) =>
      dispatch({ type: 'filters/labelToggled', payload: { id } }),
    setLabelMatchMode: (mode) =>
      dispatch({ type: 'filters/labelModeSet', payload: { mode } }),
    setPriorities: (selected) =>
      dispatch({ type: 'filters/prioritiesSet', payload: { selected } }),
    setDueDate: (patch) =>
      dispatch({ type: 'filters/dueDateSet', payload: { patch } }),
    setStartDate: (patch) =>
      dispatch({ type: 'filters/startDateSet', payload: { patch } }),
    setCompletion: (status) =>
      dispatch({ type: 'filters/completionSet', payload: { status } }),
    setEffort: (min, max) =>
      dispatch({ type: 'filters/effortSet', payload: { min, max } }),
    setAging: (status) =>
      dispatch({ type: 'filters/agingSet', payload: { status } }),
    setColumns: (ids) =>
      dispatch({ type: 'filters/columnsSet', payload: { ids } }),
    clearFilter: (key) =>
      dispatch({ type: 'filters/cleared', payload: { key } }),
    clearAll: () => dispatch({ type: 'filters/allCleared', payload: {} }),
    isActive: () => isActive(filters()),
    getActiveFilterCount: () => activeFilterCount(filters()),
    applyFilters: (cards, labels = []) =>
      filterCards(filters(), { labels, now: new Date() })(cards),
    createPreset: (name) =>
      dispatch({
        type: 'filters/presetCreated',
        payload: { id: env.fx.newId('p'), name },
      }),
    applyPreset: (id) =>
      dispatch({ type: 'filters/presetApplied', payload: { id } }),
    deletePreset: (id) =>
      dispatch({ type: 'filters/presetDeleted', payload: { id } }),
    getPresets: () => store.getState().presets,
    getActiveFilterChips: (labels = []) =>
      activeChips(filters(), labels, t).map((chip) => ({
        ...chip,
        clear: () =>
          dispatch({ type: 'filters/cleared', payload: { key: chip.type } }),
      })),
  };
};
