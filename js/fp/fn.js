export const identity = (x) => x;

export const constant = (x) => () => x;

export const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((acc, fn) => fn(acc), x);
