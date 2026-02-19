import {
  addDebugInnerBoxToElement,
  getCardAfterElement,
  getColumnAfterElement,
} from '../utils/dragUtils.js';
import { performFlipAnimation } from '../utils/animUtils.js';

const DEBUG_RATIO = 0.7;
const SWAP_THRESHOLD = 0.025;
const ENABLE_DEBUG_BOXES = false;

export default class DragDropManager {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.dragState = null;
    this.lastSwappedElement = null;
    this.lastAfterElement = null;
    this.initEvents();
  }

  initEvents() {
    this.container.addEventListener(
      'dragstart',
      (e) => this.handleDragStart(e),
      true
    );
    this.container.addEventListener(
      'dragend',
      () => this.handleDragEnd(),
      true
    );
    this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.container.addEventListener('drop', (e) => this.handleDrop(e));
    this.container.addEventListener('dragenter', (e) => e.preventDefault());
  }

  handleDragStart(e) {
    const card = e.target.closest('.card');
    const col = e.target.closest('.column');
    if (card) this.startDrag(e, card, 'card');
    else if (col) this.startDrag(e, col, 'column');
  }

  startDrag(e, element, type) {
    const rect = element.getBoundingClientRect();
    element.classList.add('dragging');

    this.dragState = {
      active: true,
      element,
      type,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      rect,
      lastX: e.clientX,
      lastY: e.clientY,
      direction: null,
      cachedTargets: this.cacheTargets(type),
    };

    this.lastSwappedElement = null;
    this.lastAfterElement = null;

    e.dataTransfer?.setDragImage(
      element,
      this.dragState.offsetX,
      this.dragState.offsetY
    );
    e.dataTransfer && (e.dataTransfer.effectAllowed = 'move');
    e.dataTransfer?.setData(
      'text/plain',
      element.dataset.cardId || element.dataset.columnId
    );

    if (ENABLE_DEBUG_BOXES) {
      document
        .querySelectorAll(type === 'card' ? '.card' : '.column')
        .forEach((el) => addDebugInnerBoxToElement(el, DEBUG_RATIO));
    }
  }

  handleDragEnd() {
    if (!this.dragState?.active) return;
    this.dragState.element.classList.remove('dragging');

    if (ENABLE_DEBUG_BOXES) {
      document
        .querySelectorAll('.debug-inner-box')
        .forEach((el) => el.remove());
    }
    this.dragState = null;
  }

  handleDragOver(e) {
    e.preventDefault();
    if (!this.dragState?.active) return;

    const { clientX, clientY } = e;
    this.updateDirection(clientX, clientY);

    const ghostRect = this.getGhostRect(clientX, clientY);
    if (!this.checkGhostCollision(ghostRect)) {
      this.dragState.type === 'card'
        ? this.handleFallbackCardMove(e)
        : this.handleFallbackColumnMove(e);
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const { element, type } = this.dragState ?? {};
    if (!element) return;

    element.classList.remove('dragging');

    if (type === 'column') {
      this.callbacks.onDropColumn?.(
        Array.from(this.container.querySelectorAll('.column')).map(
          (c) => c.dataset.columnId
        )
      );
    } else {
      const newCol = element.closest('.column');
      if (newCol) {
        const cardsContainer = newCol.querySelector('.cards');
        this.callbacks.onDropCard?.(
          element.dataset.cardId,
          newCol.dataset.columnId,
          Array.from(cardsContainer.querySelectorAll('.card')).map(
            (el) => el.dataset.cardId
          )
        );
      }
    }

    if (ENABLE_DEBUG_BOXES) {
      document
        .querySelectorAll('.debug-inner-box')
        .forEach((el) => el.remove());
    }
    this.dragState = null;
  }

  updateDirection(x, y) {
    const last =
      this.dragState.type === 'column'
        ? this.dragState.lastX
        : this.dragState.lastY;
    const current = this.dragState.type === 'column' ? x : y;

    if (Math.abs(current - last) > 0) {
      this.dragState.direction =
        this.dragState.type === 'column'
          ? current > this.dragState.lastX
            ? 'right'
            : 'left'
          : current > this.dragState.lastY
            ? 'down'
            : 'up';
    }

    this.dragState.lastX = x;
    this.dragState.lastY = y;
  }

  cacheTargets(type) {
    const selector =
      type === 'card' ? '.card:not(.dragging)' : '.column:not(.dragging)';
    return Array.from(document.querySelectorAll(selector)).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        rect,
        innerRect: this.calculateInnerRect(rect, DEBUG_RATIO),
      };
    });
  }

  calculateInnerRect(rect, ratio) {
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
  }

  getGhostRect(clientX, clientY) {
    const { offsetX, offsetY, rect } = this.dragState;
    const left = clientX - offsetX;
    const top = clientY - offsetY;
    return this.calculateInnerRect(
      {
        left,
        top,
        right: left + rect.width,
        bottom: top + rect.height,
        width: rect.width,
        height: rect.height,
      },
      DEBUG_RATIO
    );
  }

  checkGhostCollision(ghostRect) {
    for (const target of this.dragState.cachedTargets) {
      if (target.element === this.lastSwappedElement) continue;

      const intersect =
        ghostRect.left < target.innerRect.right &&
        ghostRect.right > target.innerRect.left &&
        ghostRect.top < target.innerRect.bottom &&
        ghostRect.bottom > target.innerRect.top;

      if (ENABLE_DEBUG_BOXES) {
        const debugBox = target.element.querySelector('.debug-inner-box');
        if (debugBox) {
          debugBox.style.borderColor = intersect ? 'green' : 'red';
        }
      }

      if (intersect && this.shouldSwap(ghostRect, target)) {
        this.performSwap(this.dragState.element, target.element);
        return true;
      }
    }
    return false;
  }

  shouldSwap(ghostRect, target) {
    const { type, direction, rect } = this.dragState;
    const ghostFullLeft = ghostRect.left - (rect.width * (1 - DEBUG_RATIO)) / 2;

    if (type === 'column') {
      if (direction === 'right' && target.rect.left < ghostFullLeft)
        return false;
      if (direction === 'left' && target.rect.left > ghostFullLeft)
        return false;
      const overlapX =
        Math.min(ghostRect.right, target.innerRect.right) -
        Math.max(ghostRect.left, target.innerRect.left);
      return (
        overlapX / Math.min(ghostRect.width, target.innerRect.width) >
        SWAP_THRESHOLD
      );
    }

    const overlapY =
      Math.min(ghostRect.bottom, target.innerRect.bottom) -
      Math.max(ghostRect.top, target.innerRect.top);
    return (
      overlapY / Math.min(ghostRect.height, target.innerRect.height) >
      SWAP_THRESHOLD
    );
  }

  performSwap(draggedEl, staticEl) {
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

    this.lastSwappedElement = staticEl;
    requestAnimationFrame(() => {
      this.dragState.cachedTargets = this.cacheTargets(this.dragState.type);
    });
  }

  handleFallbackCardMove(e) {
    let container =
      e.target.closest('.cards') ??
      e.target.closest('.column')?.querySelector('.cards');
    if (!container) return;

    const afterEl = getCardAfterElement(container, e.clientY);
    const isNewContainer = container !== this.dragState.element.parentNode;

    if (afterEl !== this.lastAfterElement || isNewContainer) {
      this.lastAfterElement = afterEl;
      performFlipAnimation(container, this.dragState.element, () => {
        afterEl
          ? container.insertBefore(this.dragState.element, afterEl)
          : container.appendChild(this.dragState.element);
      });
    }
  }

  handleFallbackColumnMove(e) {
    const afterEl = getColumnAfterElement(this.container, e.clientX);
    if (afterEl !== this.lastAfterElement) {
      this.lastAfterElement = afterEl;
      performFlipAnimation(this.container, this.dragState.element, () => {
        afterEl
          ? this.container.insertBefore(this.dragState.element, afterEl)
          : this.container.appendChild(this.dragState.element);
      });
    }
  }
}
