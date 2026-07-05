import { IO } from '../fp/io.js';

// Id port — absorbs js/utils/idUtils.js. Prefix-tagged unique ids.

export const createIds = () =>
  Object.freeze({
    newId: (prefix) =>
      IO(() =>
        crypto.randomUUID
          ? `${prefix}-${crypto.randomUUID()}`
          : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      ),
  });
