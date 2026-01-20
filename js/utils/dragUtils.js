const getAfterElement = (container, selector, position, axis) => {
  const elements = Array.from(container.querySelectorAll(selector));
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset =
        position -
        (axis === 'y' ? box.top + box.height / 2 : box.left + box.width / 2);
      return offset < 0 && offset > closest.offset
        ? { offset, element: child }
        : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
};

export const getCardAfterElement = (container, y) =>
  getAfterElement(container, '.card:not(.dragging)', y, 'y');

export const getColumnAfterElement = (container, x) =>
  getAfterElement(container, '.column:not(.dragging)', x, 'x');

export const addDebugInnerBoxToElement = (element, ratio = 0.8) => {
  const w = element.offsetWidth * ratio;
  const h = element.offsetHeight * ratio;
  const left = (element.offsetWidth - w) / 2;
  const top = (element.offsetHeight - h) / 2;

  let overlay = element.querySelector('.debug-inner-box');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'debug-inner-box';
    Object.assign(overlay.style, {
      position: 'absolute',
      border: '2px dashed red',
      pointerEvents: 'none',
    });
    if (getComputedStyle(element).position === 'static')
      element.style.position = 'relative';
    element.appendChild(overlay);
  }

  Object.assign(overlay.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
  });
};
