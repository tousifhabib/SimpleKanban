// Drag-drop collision geometry as pure functions. The DOM supplies rects;
// these decide. Constants and decision rules match the legacy manager.

export const INNER_RECT_RATIO = 0.7;
export const SWAP_THRESHOLD = 0.025;

// Shrink a rect toward its center by ratio.
export const innerRect = (rect, ratio = INNER_RECT_RATIO) => {
  const insetX = (rect.width * (1 - ratio)) / 2;
  const insetY = (rect.height * (1 - ratio)) / 2;
  return {
    left: rect.left + insetX,
    top: rect.top + insetY,
    right: rect.right - insetX,
    bottom: rect.bottom - insetY,
    width: rect.width * ratio,
    height: rect.height * ratio,
  };
};

// Where the dragged element's inner box sits for a given pointer position.
export const ghostRect = (
  { clientX, clientY, offsetX, offsetY, rect },
  ratio = INNER_RECT_RATIO
) => {
  const left = clientX - offsetX;
  const top = clientY - offsetY;
  return innerRect(
    {
      left,
      top,
      right: left + rect.width,
      bottom: top + rect.height,
      width: rect.width,
      height: rect.height,
    },
    ratio
  );
};

export const intersects = (a, b) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Direction of travel along the drag axis; null when stationary.
export const dragDirection = (type, last, current) => {
  if (current === last) return null;
  return type === 'column'
    ? current > last
      ? 'right'
      : 'left'
    : current > last
      ? 'down'
      : 'up';
};

// Swap decision: direction-gated for columns, overlap-thresholded on the
// drag axis for both. `ghost` is the dragged inner box; `target` carries
// { rect, innerRect } as cached at drag start.
export const shouldSwap = ({
  type,
  direction,
  ghost,
  target,
  dragRectWidth,
  ratio = INNER_RECT_RATIO,
  threshold = SWAP_THRESHOLD,
}) => {
  const ghostFullLeft = ghost.left - (dragRectWidth * (1 - ratio)) / 2;

  if (type === 'column') {
    if (direction === 'right' && target.rect.left < ghostFullLeft) return false;
    if (direction === 'left' && target.rect.left > ghostFullLeft) return false;
    const overlapX =
      Math.min(ghost.right, target.innerRect.right) -
      Math.max(ghost.left, target.innerRect.left);
    return overlapX / Math.min(ghost.width, target.innerRect.width) > threshold;
  }

  const overlapY =
    Math.min(ghost.bottom, target.innerRect.bottom) -
    Math.max(ghost.top, target.innerRect.top);
  return overlapY / Math.min(ghost.height, target.innerRect.height) > threshold;
};
