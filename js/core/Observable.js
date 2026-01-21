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
