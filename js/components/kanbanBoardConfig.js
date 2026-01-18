export const CONFIG = {
  selectors: new Proxy({}, { get: (_, p) => p }),
  keys: { escape: 'Escape' },
  values: { debugRatio: 0.7, swapThreshold: 0.025 },
};
