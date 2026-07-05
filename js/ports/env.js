import { createStorage } from './storage.js';
import { createClock } from './clock.js';
import { createIds } from './ids.js';
import { createRng } from './rng.js';
import { createInteractions } from './interactions.js';
import { createSystem } from './system.js';

// The environment: every browser capability the app uses, composed once at
// the composition root. This record IS the tagless-final interpreter
// dictionary — swap it for a deterministic one and every program that takes
// env (or fx) becomes a pure function of its inputs.
//
// env.fx is the value-level edge for command creators: nondeterminism
// (ids, timestamps, randomness) is resolved HERE, before dispatch, so the
// pure core only ever sees plain data.

export const createEnv = (win) => {
  const storage = createStorage(win.localStorage);
  const clock = createClock();
  const ids = createIds();
  const rng = createRng();

  return Object.freeze({
    storage,
    clock,
    ids,
    rng,
    interactions: createInteractions(win),
    system: createSystem(win),
    fx: Object.freeze({
      nowIso: () => clock.nowIso.run(),
      now: () => clock.now.run(),
      newId: (prefix) => ids.newId(prefix).run(),
      random: () => rng.random.run(),
    }),
  });
};
