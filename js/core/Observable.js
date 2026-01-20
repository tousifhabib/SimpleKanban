export const Observable = (Base = class {}) =>
  class extends Base {
    #listeners = new Set();

    subscribe(fn) {
      this.#listeners.add(fn);
      return () => this.#listeners.delete(fn);
    }

    notify(...args) {
      this.#listeners.forEach((fn) => fn(...args));
    }
  };

export const createObservable = () => {
  const listeners = new Set();
  return {
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify: (...args) => listeners.forEach((fn) => fn(...args)),
  };
};
