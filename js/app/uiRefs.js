// Read-only convenience: ui.someId resolves document.getElementById at
// access time, so references never go stale across re-renders.

export const createUiRefs = (doc) =>
  new Proxy({}, { get: (_, id) => doc.getElementById(id) });
