// Boot a fresh Store singleton against seeded localStorage. The legacy
// Store reads storage at import time, so each test run must reset the
// module registry and re-import dynamically.

import { vi } from 'vitest';

export const STORAGE_KEY = 'flexibleKanbanState';

let uuidCounter = 0;

export const stubDeterministicIds = () => {
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${String(++uuidCounter).padStart(4, '0')}`,
  });
};

export const freshStore = async (seedState) => {
  localStorage.clear();
  if (seedState != null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
  }
  vi.resetModules();
  const mod = await import('../../js/state/Store.js');
  return mod.store;
};

export const flushMicrotasks = () => Promise.resolve().then(() => {});

export const savedState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};
