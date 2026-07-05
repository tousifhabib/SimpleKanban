// Pure array helpers — every function returns a new array.

export const updateWhere = (pred, fn) => (xs) =>
  xs.map((x) => (pred(x) ? fn(x) : x));

export const removeWhere = (pred) => (xs) => xs.filter((x) => !pred(x));

export const insertAt = (idx, item) => (xs) => [
  ...xs.slice(0, idx),
  item,
  ...xs.slice(idx),
];

// Project xs into the order given by ids (matching on x.id).
// Ids without a match are dropped; xs entries omitted from ids are dropped —
// the whitelist semantics the drag-drop layer relies on.
export const reorderByIds = (ids) => (xs) => {
  const byId = new Map(xs.map((x) => [x.id, x]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
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
