// Pure array helpers — every function returns a new array.

export const updateWhere = (pred, fn) => (xs) =>
  xs.map((x) => (pred(x) ? fn(x) : x));

export const removeWhere = (pred) => (xs) => xs.filter((x) => !pred(x));

export const insertAt = (idx, item) => (xs) => [
  ...xs.slice(0, idx),
  item,
  ...xs.slice(idx),
];

// Project xs into the order given by ids (matching on x.id), PRESERVING
// entries omitted from ids by appending them in their original relative
// order. Unknown ids are ignored. A reorder can therefore never lose
// data — the old whitelist semantics silently deleted any card missing
// from the order array (e.g. a reorder computed from a filtered DOM).
export const reorderByIds = (ids) => (xs) => {
  const byId = new Map(xs.map((x) => [x.id, x]));
  const listed = ids.map((id) => byId.get(id)).filter(Boolean);
  const listedIds = new Set(ids);
  const unlisted = xs.filter((x) => !listedIds.has(x.id));
  return [...listed, ...unlisted];
};

export const uniqueBy = (keyFn) => (xs) => {
  const seen = new Set();
  return xs.filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
