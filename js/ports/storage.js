import { IO } from '../fp/io.js';
import { Ok, tryCatch, map as mapResult } from '../fp/result.js';

// Storage port: JSON persistence over any Web Storage implementation.
// load yields Ok(null) when the key is absent and Err on corrupt JSON —
// callers decide how absence and corruption degrade.

export const createStorage = (webStorage) =>
  Object.freeze({
    load: (key) =>
      IO(() => {
        const raw = webStorage.getItem(key);
        return raw == null ? Ok(null) : tryCatch(() => JSON.parse(raw));
      }),

    save: (key, value) =>
      IO(() =>
        mapResult(() => undefined)(
          tryCatch(() => webStorage.setItem(key, JSON.stringify(value)))
        )
      ),
  });
