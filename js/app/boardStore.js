// Assembles the board store from its functional parts: boot effect ->
// pure migration -> reducer core, with persistence as a debounced effect
// anchored at dispatch time and skipped for no-op commands.

import { createStore } from '../core/store.js';
import { debounce } from '../core/debounce.js';
import { transitions } from '../domain/board/transitions.js';
import { migrate } from '../domain/board/migrate.js';
import { bootProgram } from '../effects/programs.js';
import { runInBrowser } from '../effects/browserInterpreter.js';

export const STORAGE_KEY = 'flexibleKanbanState';
export const SAVE_DEBOUNCE_MS = 150;

export const createBoardStore = (env, localeTemplates) => {
  const run = runInBrowser(env);

  const core = createStore({
    transitions,
    initialState: migrate(
      run(bootProgram(STORAGE_KEY)),
      env.fx,
      localeTemplates
    ),
  });

  const persist = debounce(SAVE_DEBOUNCE_MS, () =>
    env.storage.save(STORAGE_KEY, core.getState()).run()
  );

  const dispatch = (command) => {
    const before = core.getState();
    core.dispatch(command);
    if (core.getState() !== before) persist();
  };

  return Object.freeze({
    getState: core.getState,
    subscribe: core.subscribe,
    dispatch,
  });
};
