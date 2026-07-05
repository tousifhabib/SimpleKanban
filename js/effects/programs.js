// Free programs: multi-step effectful flows expressed as data. Each returns
// a Free value; nothing happens until an interpreter runs it.

import * as Free from '../fp/free.js';
import { tryCatch, isOk, fold as foldResult } from '../fp/result.js';
import { storageGet, storagePut, reload, download } from './instructions.js';

// Boot: read persisted state. Absent key -> null; corrupt JSON also folds
// to null so a bad payload degrades to the default board instead of
// crashing the app (deliberate fix over the legacy behavior).
export const bootProgram = (storageKey) =>
  Free.map(
    foldResult(
      () => null,
      (value) => value
    )
  )(storageGet(storageKey));

// Import: parse user-supplied JSON. On success save the RAW parsed value
// (so legacy-shape migration still runs on next boot) and reload; on parse
// failure do nothing and yield false — matching legacy import semantics.
export const importProgram = (storageKey, jsonText) => {
  const parsed = tryCatch(() => JSON.parse(jsonText));
  return isOk(parsed)
    ? Free.chain(() => Free.map(() => true)(reload()))(
        storagePut(storageKey, parsed.value)
      )
    : Free.of(false);
};

// Export: serialize state and trigger a file download.
export const exportProgram = (filename, state) =>
  download(filename, JSON.stringify(state, null, 2));

// Persist: write current state under the storage key.
export const persistProgram = (storageKey, state) =>
  storagePut(storageKey, state);
