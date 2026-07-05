// van Laarhoven-lite lenses: a lens is a frozen { get, set } pair obeying
// the lens laws (get-set, set-get, set-set). set never mutates — it builds
// a new structure sharing unchanged parts.

export const lens = (get, set) => Object.freeze({ get, set });

export const view = (l) => (s) => l.get(s);

export const set = (l) => (v) => (s) => l.set(v, s);

export const over = (l) => (fn) => (s) => l.set(fn(l.get(s)), s);

export const lensProp = (key) =>
  lens(
    (s) => s[key],
    (v, s) => ({ ...s, [key]: v })
  );

export const lensPath = (keys) => keys.map(lensProp).reduce(composeL2, idLens);

// Focus the first array element matching pred. get yields undefined when
// absent; set/over leave the array untouched when absent (total functions).
export const lensWhere = (pred) =>
  lens(
    (xs) => xs.find(pred),
    (v, xs) => {
      const idx = xs.findIndex(pred);
      return idx === -1 ? xs : xs.map((x, i) => (i === idx ? v : x));
    }
  );

const idLens = lens(
  (s) => s,
  (v) => v
);

const composeL2 = (outer, inner) =>
  lens(
    (s) => {
      const o = outer.get(s);
      return o === undefined ? undefined : inner.get(o);
    },
    (v, s) => {
      const o = outer.get(s);
      return o === undefined ? s : outer.set(inner.set(v, o), s);
    }
  );

export const composeL = (...lenses) => lenses.reduce(composeL2, idLens);
