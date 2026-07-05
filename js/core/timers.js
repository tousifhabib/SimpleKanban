import { Task } from '../fp/task.js';

// Timed Task constructors — the effectful complement to fp/task.js.

export const delay = (ms) => Task((done) => setTimeout(done, ms));

export const delayValue = (ms, value) =>
  Task((done) => setTimeout(() => done(value), ms));
