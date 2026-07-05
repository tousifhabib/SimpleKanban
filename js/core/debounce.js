export const debounce = (ms, fn) => {
  let timerId = null;
  const debounced = (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timerId);
  return debounced;
};
