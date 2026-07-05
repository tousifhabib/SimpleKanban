// Maybe: the ADT for values that may be absent. Frozen tagged records;
// all combinators are curried data-last so they compose with pipe().

export const Just = (value) => Object.freeze({ tag: 'Just', value });

export const Nothing = Object.freeze({ tag: 'Nothing' });

export const of = Just;

export const isJust = (m) => m.tag === 'Just';

export const isNothing = (m) => m.tag === 'Nothing';

export const fromNullable = (x) => (x == null ? Nothing : Just(x));

export const map = (fn) => (m) => (isJust(m) ? Just(fn(m.value)) : m);

export const chain = (fn) => (m) => (isJust(m) ? fn(m.value) : m);

export const ap = (mFn) => (m) =>
  isJust(mFn) && isJust(m) ? Just(mFn.value(m.value)) : Nothing;

export const getOrElse = (fallback) => (m) => (isJust(m) ? m.value : fallback);

export const fold = (onNothing, onJust) => (m) =>
  isJust(m) ? onJust(m.value) : onNothing();

export const filter = (pred) => (m) =>
  isJust(m) && pred(m.value) ? m : Nothing;

// traverse for arrays: [A] -> (A -> Maybe<B>) -> Maybe<[B]>
// Nothing short-circuits the whole traversal.
export const traverse = (fn) => (xs) => {
  const out = [];
  for (const x of xs) {
    const m = fn(x);
    if (isNothing(m)) return Nothing;
    out.push(m.value);
  }
  return Just(out);
};
