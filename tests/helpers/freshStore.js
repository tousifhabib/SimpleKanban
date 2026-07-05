// Boot a fresh board store against seeded localStorage. Since the store
// is a factory (no module singleton), no module-reset gymnastics are
// needed anymore — construction is just a function call.

import { vi } from 'vitest';
import { createBoardStore } from '../../js/app/boardStore.js';
import { createEnv } from '../../js/ports/env.js';
import { locales } from '../../js/services/i18n/locales/index.js';
import { legacyApi } from './legacyApi.js';

export const STORAGE_KEY = 'flexibleKanbanState';

let uuidCounter = 0;

export const stubDeterministicIds = () => {
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${String(++uuidCounter).padStart(4, '0')}`,
  });
};

// async kept for suite compatibility; construction is synchronous now.
export const freshStore = async (seedState) => {
  localStorage.clear();
  if (seedState != null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
  }
  const env = createEnv(window);
  const store = createBoardStore(env, locales.en.templates);
  return legacyApi(store, env.fx, locales.en.templates);
};

export const flushMicrotasks = () => Promise.resolve().then(() => {});

export const savedState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};
