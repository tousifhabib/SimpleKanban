// The pure-reducer store runtime.

import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../js/core/store.js';

const counterTransitions = {
  inc: (state, { by }) => ({ ...state, n: state.n + by }),
  noop: (state) => state,
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('createStore', () => {
  it('dispatch applies the transition; getState sees the new state synchronously', () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0 },
    });
    store.dispatch({ type: 'inc', payload: { by: 2 } });
    expect(store.getState().n).toBe(2);
  });

  it('throws on unknown command types (runtime exhaustiveness)', () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0 },
    });
    expect(() => store.dispatch({ type: 'nope', payload: {} })).toThrow(
      /unhandled/
    );
  });

  it('coalesces multiple dispatches into ONE notify per microtask flush', async () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0 },
    });
    const spy = vi.fn();
    store.subscribe(spy);
    store.dispatch({ type: 'inc', payload: { by: 1 } });
    store.dispatch({ type: 'inc', payload: { by: 1 } });
    store.dispatch({ type: 'inc', payload: { by: 1 } });
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ n: 3 }));
  });

  it('same-reference transitions notify nobody', async () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0 },
    });
    const spy = vi.fn();
    store.subscribe(spy);
    store.dispatch({ type: 'noop', payload: {} });
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });

  it('unsubscribe works', async () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0 },
    });
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    unsub();
    store.dispatch({ type: 'inc', payload: { by: 1 } });
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });

  it('dev freeze: mutating the exposed state throws', () => {
    const store = createStore({
      transitions: counterTransitions,
      initialState: { n: 0, nested: { a: [1] } },
    });
    expect(() => {
      store.getState().n = 99;
    }).toThrow();
    expect(() => {
      store.getState().nested.a.push(2);
    }).toThrow();
  });
});
