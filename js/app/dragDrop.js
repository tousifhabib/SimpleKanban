// Drag-drop controller: a closure factory around a per-drag state machine.
// This is genuinely DOM geometry over time, so it stays an imperative
// shell — but every collision DECISION is delegated to the pure functions
// in domain/drag/geometry.js.

import {
  getCardAfterElement,
  getColumnAfterElement,
} from '../utils/dragUtils.js';
import { performFlipAnimation } from '../utils/animUtils.js';
import {
  innerRect,
  ghostRect,
  intersects,
  dragDirection,
  shouldSwap,
} from '../domain/drag/geometry.js';

export const createDragDrop = (container, callbacks = {}) => {
  let dragState = null;
  let lastSwappedElement = null;
  let lastAfterElement = null;

  const cacheTargets = (type) => {
    const selector =
      type === 'card' ? '.card:not(.dragging)' : '.column:not(.dragging)';
    return Array.from(document.querySelectorAll(selector)).map((element) => {
      const rect = element.getBoundingClientRect();
      return { element, rect, innerRect: innerRect(rect) };
    });
  };

  const startDrag = (e, element, type) => {
    const rect = element.getBoundingClientRect();
    element.classList.add('dragging');

    dragState = {
      active: true,
      element,
      type,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      rect,
      lastX: e.clientX,
      lastY: e.clientY,
      direction: null,
      cachedTargets: cacheTargets(type),
    };

    lastSwappedElement = null;
    lastAfterElement = null;

    e.dataTransfer?.setDragImage(element, dragState.offsetX, dragState.offsetY);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer?.setData(
      'text/plain',
      element.dataset.cardId || element.dataset.columnId
    );
  };

  const handleDragStart = (e) => {
    const card = e.target.closest('.card');
    const col = e.target.closest('.column');
    if (card) startDrag(e, card, 'card');
    else if (col) startDrag(e, col, 'column');
  };

  const handleDragEnd = () => {
    if (!dragState?.active) return;
    dragState.element.classList.remove('dragging');
    dragState = null;
  };

  const updateDirection = (x, y) => {
    const axisLast =
      dragState.type === 'column' ? dragState.lastX : dragState.lastY;
    const axisCurrent = dragState.type === 'column' ? x : y;
    dragState.direction =
      dragDirection(dragState.type, axisLast, axisCurrent) ??
      dragState.direction;
    dragState.lastX = x;
    dragState.lastY = y;
  };

  const performSwap = (draggedEl, staticEl) => {
    const draggedParent = draggedEl.parentNode;
    const staticParent = staticEl.parentNode;

    performFlipAnimation(staticParent, staticEl, () => {
      performFlipAnimation(draggedParent, draggedEl, () => {
        const parentA = draggedEl.parentNode;
        const parentB = staticEl.parentNode;
        const siblingA =
          draggedEl.nextSibling === staticEl
            ? draggedEl
            : draggedEl.nextSibling;

        parentB.insertBefore(draggedEl, staticEl);
        if (parentA === parentB) parentA.insertBefore(staticEl, siblingA);
      });
    });

    lastSwappedElement = staticEl;
    requestAnimationFrame(() => {
      dragState.cachedTargets = cacheTargets(dragState.type);
    });
  };

  const checkGhostCollision = (ghost) => {
    for (const target of dragState.cachedTargets) {
      if (target.element === lastSwappedElement) continue;

      if (
        intersects(ghost, target.innerRect) &&
        shouldSwap({
          type: dragState.type,
          direction: dragState.direction,
          ghost,
          target,
          dragRectWidth: dragState.rect.width,
        })
      ) {
        performSwap(dragState.element, target.element);
        return true;
      }
    }
    return false;
  };

  const handleFallbackCardMove = (e) => {
    const cardsContainer =
      e.target.closest('.cards') ??
      e.target.closest('.column')?.querySelector('.cards');
    if (!cardsContainer) return;

    const afterEl = getCardAfterElement(cardsContainer, e.clientY);
    const isNewContainer = cardsContainer !== dragState.element.parentNode;

    if (afterEl !== lastAfterElement || isNewContainer) {
      lastAfterElement = afterEl;
      performFlipAnimation(cardsContainer, dragState.element, () => {
        if (afterEl) cardsContainer.insertBefore(dragState.element, afterEl);
        else cardsContainer.appendChild(dragState.element);
      });
    }
  };

  const handleFallbackColumnMove = (e) => {
    const afterEl = getColumnAfterElement(container, e.clientX);
    if (afterEl !== lastAfterElement) {
      lastAfterElement = afterEl;
      performFlipAnimation(container, dragState.element, () => {
        if (afterEl) container.insertBefore(dragState.element, afterEl);
        else container.appendChild(dragState.element);
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!dragState?.active) return;

    updateDirection(e.clientX, e.clientY);

    const ghost = ghostRect({
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: dragState.offsetX,
      offsetY: dragState.offsetY,
      rect: dragState.rect,
    });
    if (!checkGhostCollision(ghost)) {
      if (dragState.type === 'card') handleFallbackCardMove(e);
      else handleFallbackColumnMove(e);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const { element, type } = dragState ?? {};
    if (!element) return;

    element.classList.remove('dragging');

    if (type === 'column') {
      callbacks.onDropColumn?.(
        Array.from(container.querySelectorAll('.column')).map(
          (c) => c.dataset.columnId
        )
      );
    } else {
      const newCol = element.closest('.column');
      if (newCol) {
        const cardsContainer = newCol.querySelector('.cards');
        callbacks.onDropCard?.(
          element.dataset.cardId,
          newCol.dataset.columnId,
          Array.from(cardsContainer.querySelectorAll('.card')).map(
            (elem) => elem.dataset.cardId
          )
        );
      }
    }

    dragState = null;
  };

  container.addEventListener('dragstart', handleDragStart, true);
  container.addEventListener('dragend', handleDragEnd, true);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('drop', handleDrop);
  container.addEventListener('dragenter', (e) => e.preventDefault());

  return Object.freeze({
    destroy() {
      container.removeEventListener('dragstart', handleDragStart, true);
      container.removeEventListener('dragend', handleDragEnd, true);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    },
  });
};
