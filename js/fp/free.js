// Free monad: programs as data. An instruction set (plain tagged records)
// is lifted into Free values, composed with chain, and only given meaning
// by an interpreter's step function — the browser interpreter performs real
// effects, the test interpreter threads pure fixtures.
//
// Representation includes an explicit FlatMap node so interpretation never
// grows the JS call stack: the interpreter walks the program with a
// trampoline and an immutable cons-list of continuations, making it
// stack-safe for arbitrarily long and arbitrarily nested programs.

import { bounce, done, trampoline } from './trampoline.js';

export const Pure = (value) => Object.freeze({ tag: 'Pure', value });

export const Impure = (instruction) =>
  Object.freeze({ tag: 'Impure', instruction });

const FlatMap = (free, fn) => Object.freeze({ tag: 'FlatMap', free, fn });

export const liftF = Impure;

export const of = Pure;

export const chain = (fn) => (fa) => FlatMap(fa, fn);

export const map = (fn) => chain((x) => Pure(fn(x)));

// runFree(step): interpret a program with a synchronous step function
// (instruction) => value.
export const runFree = (step) => (program) => {
  const go = (current, conts) =>
    current.tag === 'FlatMap'
      ? bounce(() => go(current.free, { fn: current.fn, prev: conts }))
      : current.tag === 'Impure'
        ? bounce(() => go(Pure(step(current.instruction)), conts))
        : conts
          ? bounce(() => go(conts.fn(current.value), conts.prev))
          : done(current.value);
  return trampoline(go(program, null));
};
