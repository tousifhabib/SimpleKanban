// Randomizer options: a small storage-backed adapter. Corrupt JSON
// degrades to defaults; writes are synchronous like the legacy manager.

import { DEFAULT_PICKER_OPTIONS } from '../domain/picker/weights.js';
import { getOrElse } from '../fp/result.js';

export const PICKER_OPTIONS_KEY = 'kanban-randomizer-options';

export const createPickerOptions = (env) => {
  const loaded = getOrElse(null)(env.storage.load(PICKER_OPTIONS_KEY).run());
  let options = { ...DEFAULT_PICKER_OPTIONS, ...(loaded || {}) };

  const save = () => env.storage.save(PICKER_OPTIONS_KEY, options).run();

  return Object.freeze({
    get: () => options,
    set(patch) {
      options = { ...options, ...patch };
      save();
    },
    reset() {
      options = { ...DEFAULT_PICKER_OPTIONS };
      save();
    },
  });
};
