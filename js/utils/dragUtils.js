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
