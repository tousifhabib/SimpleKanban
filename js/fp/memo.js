// Single-slot memoization keyed on reference equality of the argument list.
// With immutable state, references change iff data changed — so this is the
// lazy-evaluation workhorse for derived data, with no cache-growth risk.

export const memoizeLast = (fn) => {
  let lastArgs = null;
  let lastResult;
  return (...args) => {
    if (
      lastArgs &&
      lastArgs.length === args.length &&
      lastArgs.every((a, i) => a === args[i])
    ) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
};
