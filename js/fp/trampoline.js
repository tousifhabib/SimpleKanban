// Trampolining: JS engines don't implement tail-call optimization, so deep
// recursion is rewritten as a loop over Bounce thunks. Used by the Free
// interpreter to stay stack-safe on arbitrarily long programs.

export const done = (value) => Object.freeze({ tag: 'Done', value });

export const bounce = (thunk) => Object.freeze({ tag: 'Bounce', thunk });

export const trampoline = (t) => {
  let current = t;
  while (current.tag === 'Bounce') {
    current = current.thunk();
  }
  return current.value;
};
