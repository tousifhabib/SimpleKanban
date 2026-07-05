import { IO } from '../fp/io.js';

export const createClock = () =>
  Object.freeze({
    now: IO(() => new Date()),
    nowIso: IO(() => new Date().toISOString()),
  });
