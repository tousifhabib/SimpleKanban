import {
  addDebugInnerBoxToElement,
  getCardAfterElement,
  getColumnAfterElement,
} from '../utils/dragUtils.js';
import { performFlipAnimation } from '../utils/flipAnimation.js';
import { CONFIG } from '../components/kanbanBoardConfig.js';

export default class DragDropManager {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.dragState = {
      active: false,
      element: null,
      type: null,
      offsetX: 0,
      offsetY: 0,
      rect: null,
      cachedTargets: [],
      lastX: 0,
      lastY: 0,
      direction: null,
    };

    this.lastSwappedElement = null;
    this.lastAfterElement = null;
    this.DEBUG_RATIO = CONFIG.values.debugRatio;

    this.initEvents();
  }

  initEvents() {
    this.container.addEventListener(
      'dragstart',
      this.handleDragStart.bind(this),
      true
    );
    this.container.addEventListener(
      'dragend',
      this.handleDragEnd.bind(this),
      true
    );

    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
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

    if (e.dataTransfer) {
      e.dataTransfer.setDragImage(
        element,
        this.dragState.offsetX,
        this.dragState.offsetY
      );
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'text/plain',
        element.dataset.cardId || element.dataset.columnId
      );
    }

    const selector = type === 'card' ? '.card' : '.column';
    document
      .querySelectorAll(selector)
      .forEach((el) => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
  }

  handleDragEnd() {
    if (!this.dragState.active) return;
    if (this.dragState.element) {
      this.dragState.element.classList.remove('dragging');
    }
    this.dragState.active = false;
    this.dragState.element = null;
  }

  handleDragOver(e) {
    e.preventDefault();
    if (!this.dragState.active) return;

    const { clientX, clientY } = e;
    this.updateDirection(clientX, clientY);

    const ghostRect = this.getGhostRect(clientX, clientY);
    const collisionHandled = this.checkGhostCollision(ghostRect);

    if (!collisionHandled) {
      if (this.dragState.type === 'card') this.handleFallbackCardMove(e);
      else this.handleFallbackColumnMove(e);
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const element = this.dragState.element;
    if (!element) return;

    element.classList.remove('dragging');

    if (this.dragState.type === 'column') {
      if (this.callbacks.onDropColumn) {
        const cols = Array.from(this.container.querySelectorAll('.column')).map(
          (c) => c.dataset.columnId
        );
        this.callbacks.onDropColumn(cols);
      }
    } else {
      const newCol = element.closest('.column');
      if (newCol && this.callbacks.onDropCard) {
        const cardId = element.dataset.cardId;
        const newColumnId = newCol.dataset.columnId;
        const container = newCol.querySelector('.cards');
        const newOrder = Array.from(container.querySelectorAll('.card')).map(
          (el) => el.dataset.cardId
        );

        this.callbacks.onDropCard(cardId, newColumnId, newOrder);
      }
    }

    this.dragState.active = false;
    this.dragState.element = null;
  }

  updateDirection(x, y) {
    if (this.dragState.type === 'column') {
      if (Math.abs(x - this.dragState.lastX) > 0)
        this.dragState.direction = x > this.dragState.lastX ? 'right' : 'left';
    } else {
      if (Math.abs(y - this.dragState.lastY) > 0)
        this.dragState.direction = y > this.dragState.lastY ? 'down' : 'up';
    }
    this.dragState.lastX = x;
    this.dragState.lastY = y;
  }

  cacheTargets(type) {
    const targets = [];
    const selector =
      type === 'card' ? '.card:not(.dragging)' : '.column:not(.dragging)';
    const elements = document.querySelectorAll(selector);

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const innerRect = this.calculateInnerRect(rect, this.DEBUG_RATIO);
      targets.push({ element: el, rect, innerRect });
    });
    return targets;
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
    const left = clientX - this.dragState.offsetX;
    const top = clientY - this.dragState.offsetY;
    const width = this.dragState.rect.width;
    const height = this.dragState.rect.height;
    return this.calculateInnerRect(
      { left, top, right: left + width, bottom: top + height, width, height },
      this.DEBUG_RATIO
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

      const debugBox = target.element.querySelector('.debug-inner-box');

      if (intersect) {
        if (debugBox) debugBox.style.borderColor = 'yellow';
        if (this.shouldSwap(ghostRect, target, this.dragState.type)) {
          this.performSwap(this.dragState.element, target.element);
          return true;
        }
      } else if (debugBox) {
        debugBox.style.borderColor = 'red';
      }
    }
    return false;
  }

  shouldSwap(ghostRect, targetObj, type) {
    const targetRect = targetObj.rect;
    const ghostFullLeft =
      ghostRect.left - (targetRect.width * (1 - this.DEBUG_RATIO)) / 2;

    if (type === 'column') {
      if (
        this.dragState.direction === 'right' &&
        targetRect.left < ghostFullLeft
      )
        return false;
      if (
        this.dragState.direction === 'left' &&
        targetRect.left > ghostFullLeft
      )
        return false;
      const overlapX =
        Math.min(ghostRect.right, targetObj.innerRect.right) -
        Math.max(ghostRect.left, targetObj.innerRect.left);
      const minWidth = Math.min(ghostRect.width, targetObj.innerRect.width);
      return overlapX / minWidth > CONFIG.values.swapThreshold;
    }

    const overlapY =
      Math.min(ghostRect.bottom, targetObj.innerRect.bottom) -
      Math.max(ghostRect.top, targetObj.innerRect.top);
    const minHeight = Math.min(ghostRect.height, targetObj.innerRect.height);
    return overlapY / minHeight > CONFIG.values.swapThreshold;
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
    let container = e.target.closest('.cards');
    if (!container) {
      const column = e.target.closest('.column');
      if (column) container = column.querySelector('.cards');
    }
    if (!container) return;

    const afterEl = getCardAfterElement(container, e.clientY);
    const isNewContainer = container !== this.dragState.element.parentNode;

    if (afterEl !== this.lastAfterElement || isNewContainer) {
      this.lastAfterElement = afterEl;
      performFlipAnimation(container, this.dragState.element, () => {
        if (afterEl) container.insertBefore(this.dragState.element, afterEl);
        else container.appendChild(this.dragState.element);
      });
    }
  }

  handleFallbackColumnMove(e) {
    const afterEl = getColumnAfterElement(this.container, e.clientX);
    if (afterEl !== this.lastAfterElement) {
      this.lastAfterElement = afterEl;
      performFlipAnimation(this.container, this.dragState.element, () => {
        if (afterEl)
          this.container.insertBefore(this.dragState.element, afterEl);
        else this.container.appendChild(this.dragState.element);
      });
    }
  }
}
