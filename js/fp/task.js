// Task: a lazy asynchronous computation in continuation-passing style.
// fork(onDone) starts the work; composition is pure until fork. The timed
// constructors (delay etc.) live in js/core/timers.js — this module is
// only the pure algebra.

export const Task = (fork) => Object.freeze({ tag: 'Task', fork });

export const of = (x) => Task((done) => done(x));

export const map = (fn) => (t) => Task((done) => t.fork((x) => done(fn(x))));

export const chain = (fn) => (t) =>
  Task((done) => t.fork((x) => fn(x).fork(done)));

export const ap = (tFn) => (t) =>
  Task((done) => tFn.fork((fn) => t.fork((x) => done(fn(x)))));
