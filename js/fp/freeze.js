/* global process */
// Deep-freeze for dev-time immutability enforcement.
//
// DEV resolution: webpack's DefinePlugin statically replaces
// process.env.NODE_ENV inside the try block, so production bundles get
// DEV === false (freezing compiled away). Dev bundles, vitest, and raw
// unbundled ESM in a browser (where reading `process` throws) all get
// DEV === true.

const nodeEnv = (() => {
  try {
    return process.env.NODE_ENV;
  } catch {
    return undefined;
  }
})();

export const DEV = nodeEnv !== 'production';

export const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
};

export const devFreeze = (value) => (DEV ? deepFreeze(value) : value);
