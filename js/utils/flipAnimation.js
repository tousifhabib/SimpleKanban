export const performFlipAnimation = (
  container,
  draggedElement,
  insertCallback
) => {
  const elements = Array.from(
    container.querySelectorAll(`:scope > *:not(.dragging)`)
  );

  const initialRects = new Map();
  elements.forEach((element) => {
    initialRects.set(element, element.getBoundingClientRect());
  });

  insertCallback();

  elements.forEach((element) => {
    const oldRect = initialRects.get(element);
    const newRect = element.getBoundingClientRect();

    const deltaX = oldRect.left - newRect.left;
    const deltaY = oldRect.top - newRect.top;

    if (deltaX !== 0 || deltaY !== 0) {
      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      requestAnimationFrame(() => {
        element.style.transition = 'transform 300ms ease';
        element.style.transform = '';
      });
    }
  });
};
