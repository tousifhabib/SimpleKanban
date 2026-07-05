// Filter UI store: reducer core + preset persistence anchored at
// dispatch time (synchronous, like the legacy manager) and only when the
// presets slice actually changed.

import { createStore } from '../core/store.js';
import { filterTransitions } from '../domain/filters/transitions.js';
import { initialFilterState } from '../domain/filters/model.js';
import { getOrElse } from '../fp/result.js';

export const FILTER_PRESETS_KEY = 'kanban-filter-presets';

export const createFilterStore = (env) => {
  const loaded = getOrElse(null)(env.storage.load(FILTER_PRESETS_KEY).run());
  const presets = Array.isArray(loaded) ? loaded : [];

  const core = createStore({
    transitions: filterTransitions,
    initialState: initialFilterState(presets),
  });

  const dispatch = (command) => {
    const before = core.getState();
    core.dispatch(command);
    const after = core.getState();
    if (after.presets !== before.presets) {
      env.storage.save(FILTER_PRESETS_KEY, after.presets).run();
    }
  };

  return Object.freeze({
    getState: core.getState,
    subscribe: core.subscribe,
    dispatch,
  });
};
