// createStore: the minimal runtime that gives pure transitions a pulse.
// One dispatch = one atomic transition = at most one microtask-coalesced
// notify. State is deep-frozen in dev so any attempted mutation throws.
// No persistence in here — saving is a subscriber wired at the
// composition root (effects live at the edge, not in the engine).

import { createObservable } from './Observable.js';
import { match } from '../fp/match.js';
import { devFreeze } from '../fp/freeze.js';

export const createStore = ({ transitions, initialState }) => {
  const observable = createObservable();
  let state = devFreeze(initialState);
  let notifyQueued = false;

  // match gives runtime exhaustiveness: dispatching a command with no
  // transition throws instead of silently doing nothing.
  const step = match(
    Object.fromEntries(
      Object.entries(transitions).map(([type, transition]) => [
        type,
        (command) => transition(state, command.payload),
      ])
    )
  );

  const dispatch = (command) => {
    const next = step(command);
    if (next === state) return;
    state = devFreeze(next);
    if (!notifyQueued) {
      notifyQueued = true;
      queueMicrotask(() => {
        notifyQueued = false;
        observable.notify(state);
      });
    }
  };

  return Object.freeze({
    getState: () => state,
    dispatch,
    subscribe: observable.subscribe,
  });
};
