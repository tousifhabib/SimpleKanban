// Result: the ADT for computations that can fail with a reason.
// Frozen tagged records; combinators curried data-last.

import { Just, Nothing } from './maybe.js';

export const Ok = (value) => Object.freeze({ tag: 'Ok', value });

export const Err = (error) => Object.freeze({ tag: 'Err', error });

export const of = Ok;

export const isOk = (r) => r.tag === 'Ok';

export const isErr = (r) => r.tag === 'Err';

export const tryCatch = (fn) => {
  try {
    return Ok(fn());
  } catch (error) {
    return Err(error);
  }
};

export const map = (fn) => (r) => (isOk(r) ? Ok(fn(r.value)) : r);

export const mapErr = (fn) => (r) => (isErr(r) ? Err(fn(r.error)) : r);

export const chain = (fn) => (r) => (isOk(r) ? fn(r.value) : r);

export const ap = (rFn) => (r) =>
  isOk(rFn) ? (isOk(r) ? Ok(rFn.value(r.value)) : r) : rFn;

export const getOrElse = (fallback) => (r) => (isOk(r) ? r.value : fallback);

export const fold = (onErr, onOk) => (r) =>
  isOk(r) ? onOk(r.value) : onErr(r.error);

export const toMaybe = (r) => (isOk(r) ? Just(r.value) : Nothing);

// traverse for arrays: [A] -> (A -> Result<E, B>) -> Result<E, [B]>
// The first Err short-circuits the whole traversal.
export const traverse = (fn) => (xs) => {
  const out = [];
  for (const x of xs) {
    const r = fn(x);
    if (isErr(r)) return r;
    out.push(r.value);
  }
  return Ok(out);
};
