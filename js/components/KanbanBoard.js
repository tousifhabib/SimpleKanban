import { store } from '../store.js';
import Column from './Column.js';
import { addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement } from '../utils/dragUtils.js';
import { performFlipAnimation } from "../utils/flipAnimation";
import {CONFIG} from "./kanbanBoardConfig";

function swapNodes(a, b) {
    const parentA = a.parentNode;
    const parentB = b.parentNode;
    if (parentA === parentB) {
        const placeholder = document.createElement('div');
        parentA.insertBefore(placeholder, a);
        parentA.insertBefore(a, b);
        parentA.insertBefore(b, placeholder);
        parentA.removeChild(placeholder);
    } else {
        const aNext = a.nextSibling, bNext = b.nextSibling;
        aNext ? parentA.insertBefore(b, aNext) : parentA.appendChild(b);
        bNext ? parentB.insertBefore(a, bNext) : parentB.appendChild(a);
    }
}

export default class KanbanBoard {
    constructor() {
        this.kanbanContainer = document.getElementById(CONFIG.selectors.kanbanContainer);
        this.addColumnModal = document.getElementById(CONFIG.selectors.addColumnModal);
        this.modalOverlay = document.getElementById(CONFIG.selectors.modalOverlay);
        this.addColumnForm = document.getElementById(CONFIG.selectors.addColumnForm);
        this.columnTitleInput = document.getElementById(CONFIG.selectors.columnTitleInput);
        this.addColumnBtn = document.getElementById(CONFIG.selectors.addColumnBtn);
        this.cancelAddColumnBtn = document.getElementById(CONFIG.selectors.cancelAddColumn);
        this.DEBUG_RATIO = CONFIG.values.debugRatio;
        this.dragData = {
            offsetX: 0,
            offsetY: 0,
            origWidth: 0,
            origHeight: 0,
            lastX: 0,
            lastY: 0,
            dragDirection: null,
            dragAxis: null
        };
        this.lastSwappedColumn = null;
        this.lastSwappedCard = null;
        this.lastCardAfterElement = null;
        this.lastAfterElement = null;
        store.subscribe(() => this.render());
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.kanbanContainer.addEventListener('dragstart', e => {
            const card = e.target.closest('.card');
            const col = e.target.closest('.column');
            if (card) return this.handleDragStart(e, card);
            if (col) return this.handleDragStart(e, col);
        }, true);
        this.kanbanContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const { clientX, clientY } = e;
            if (!this.checkGhostCollision(clientX, clientY)) {
                const draggedCard = document.querySelector('.card.dragging');
                if (draggedCard) return this.handleCardDragOver(e, draggedCard);
                const draggedCol = document.querySelector('.column.dragging');
                if (draggedCol) return this.handleColumnDragOver(e, draggedCol);
            }
        });
        this.kanbanContainer.addEventListener('drop', e => {
            e.preventDefault();
            const draggedCol = document.querySelector('.column.dragging');
            if (draggedCol) return this.finalizeColumnDrop(draggedCol);
            const draggedCard = document.querySelector('.card.dragging');
            if (draggedCard) return this.finalizeCardDrop(e, draggedCard);
        });
        this.kanbanContainer.addEventListener('dragenter', e => e.preventDefault());
        document.addEventListener('click', e => {
            const btn = e.target.closest('.card-action-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            const cardEl = btn.closest('.card');
            const colEl = btn.closest('.column');
            if (!cardEl || !colEl) return;
            const { cardId } = cardEl.dataset;
            const { columnId: colId } = colEl.dataset;
            if (action === 'edit') {
                const currentText = cardEl.querySelector('.card-text').textContent.trim();
                const newText = prompt('Edit card text:', currentText);
                if (newText && newText.trim()) store.updateCard(colId, cardId, newText.trim());
            } else if (action === 'delete' && confirm('Delete this card?')) {
                store.removeCard(colId, cardId);
            }
        });
        this.addColumnBtn.addEventListener('click', () => this.openAddColumnModal());
        this.cancelAddColumnBtn.addEventListener('click', () => this.closeAddColumnModal());
        this.modalOverlay.addEventListener('click', () => this.closeAddColumnModal());
        this.addColumnForm.addEventListener('submit', e => {
            e.preventDefault();
            const title = this.columnTitleInput.value.trim();
            if (title) store.addColumn(title);
            this.closeAddColumnModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === CONFIG.keys.escape && this.addColumnModal.classList.contains('active')) this.closeAddColumnModal();
        });
    }

    handleDragStart(e, element) {
        const rect = element.getBoundingClientRect();
        const isCard = element.classList.contains('card');
        Object.assign(this.dragData, {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            origWidth: rect.width,
            origHeight: rect.height,
            lastX: e.clientX,
            lastY: e.clientY,
            dragDirection: null,
            dragAxis: isCard ? 'vertical' : 'horizontal'
        });
        this.lastSwappedColumn = null;
        this.lastSwappedCard = null;
        if (e.dataTransfer) e.dataTransfer.setDragImage(element, this.dragData.offsetX, this.dragData.offsetY);
        const selector = isCard ? '.card' : '.column';
        document.querySelectorAll(selector).forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
    }

    handleCardDragOver(e, draggedCard) {
        const container = e.target.closest('.cards');
        if (!container) return;
        const afterEl = getCardAfterElement(container, e.clientY);
        if (afterEl !== this.lastCardAfterElement) {
            this.lastCardAfterElement = afterEl;
            performFlipAnimation(container, draggedCard, () => {
                afterEl ? container.insertBefore(draggedCard, afterEl) : container.appendChild(draggedCard);
            });
        }
    }

    handleColumnDragOver(e, draggedCol) {
        const afterEl = getColumnAfterElement(this.kanbanContainer, e.clientX);
        if (afterEl !== this.lastAfterElement) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(this.kanbanContainer, draggedCol, () => {
                afterEl && afterEl !== draggedCol
                    ? this.kanbanContainer.insertBefore(draggedCol, afterEl)
                    : this.kanbanContainer.appendChild(draggedCol);
            });
        }
    }

    finalizeColumnDrop(draggedCol) {
        draggedCol.classList.remove('dragging');
        this.lastAfterElement = null;
        const cols = Array.from(this.kanbanContainer.querySelectorAll('.column')).map(c => c.dataset.columnId);
        store.reorderColumns(cols);
    }

    finalizeCardDrop(e, draggedCard) {
        draggedCard.classList.remove('dragging');
        this.lastCardAfterElement = null;
        const newCol = e.target.closest('.column');
        if (!newCol) return;
        const { cardId } = draggedCard.dataset;
        const { columnId: targetColumnId } = newCol.dataset;
        const { columns } = store.getState();
        let oldColumnId;
        for (const c of columns) {
            if (c.cards.some(cd => cd.id === cardId)) { oldColumnId = c.id; break; }
        }
        const container = newCol.querySelector('.cards');
        const newOrder = Array.from(container.querySelectorAll('.card')).map(el => el.dataset.cardId);
        oldColumnId === targetColumnId
            ? store.reorderCards(targetColumnId, newOrder)
            : store.moveCard(cardId, oldColumnId, targetColumnId, newOrder);
    }

    computeGhostInnerRect(rect, clientX, clientY, offsetX, offsetY, ratio) {
        const ghostLeft = clientX - offsetX, ghostTop = clientY - offsetY;
        const w = rect.width * ratio, h = rect.height * ratio;
        return {
            left: ghostLeft + (rect.width - w) / CONFIG.numbers.divisor,
            top: ghostTop + (rect.height - h) / CONFIG.numbers.divisor,
            right: ghostLeft + (rect.width + w) / CONFIG.numbers.divisor,
            bottom: ghostTop + (rect.height + h) / CONFIG.numbers.divisor
        };
    }

    getInnerRect(el, ratio = CONFIG.values.debugRatio) {
        const r = el.getBoundingClientRect();
        const insetX = (r.width * (1 - ratio)) / CONFIG.numbers.divisor;
        const insetY = (r.height * (1 - ratio)) / CONFIG.numbers.divisor;
        return {
            left: r.left + insetX,
            top: r.top + insetY,
            right: r.right - insetX,
            bottom: r.bottom - insetY
        };
    }

    getGhostRect(el, clientX, clientY) {
        return this.computeGhostInnerRect(
            el.getBoundingClientRect(),
            clientX,
            clientY,
            this.dragData.offsetX,
            this.dragData.offsetY,
            this.DEBUG_RATIO
        );
    }

    checkCollision(ghostRect, staticRect) {
        return Math.max(ghostRect.left, staticRect.left) <= Math.min(ghostRect.right, staticRect.right) &&
            Math.max(ghostRect.top, staticRect.top) <= Math.min(ghostRect.bottom, staticRect.bottom);
    }

    updateDragDirection(clientX, clientY) {
        if (this.dragData.dragAxis === 'horizontal' && clientX !== this.dragData.lastX) {
            this.dragData.dragDirection = clientX > this.dragData.lastX ? 'right' : 'left';
            this.dragData.lastX = clientX;
        } else if (this.dragData.dragAxis === 'vertical' && clientY !== this.dragData.lastY) {
            this.dragData.dragDirection = clientY > this.dragData.lastY ? 'down' : 'up';
            this.dragData.lastY = clientY;
        }
    }

    processSwaps(dragged, candidates, ghostRect, type, lastSwappedKey, swapFn) {
        for (const candidate of candidates) {
            if (this[lastSwappedKey] === candidate) continue;
            if (this.shouldSwap(dragged, candidate, ghostRect, type)) {
                console.log(`DEBUG: Swapping ${type} based on direction:`, this.dragData.dragDirection);
                if (swapFn(dragged, candidate)) {
                    this[lastSwappedKey] = candidate;
                    return true;
                }
            }
        }
        return false;
    }

    checkGhostCollision(clientX, clientY) {
        let swapped = false;
        const draggedCol = document.querySelector('.column.dragging');
        const draggedCard = document.querySelector('.card.dragging');
        if (draggedCol) {
            this.updateDragDirection(clientX, clientY);
            const ghostRect = this.getGhostRect(draggedCol, clientX, clientY);
            const staticCols = Array.from(document.querySelectorAll('.column:not(.dragging)'));
            swapped = this.processSwaps(draggedCol, staticCols, ghostRect, 'column', 'lastSwappedColumn', this.swapColumns.bind(this));
        } else if (draggedCard) {
            this.updateDragDirection(clientX, clientY);
            const ghostRect = this.getGhostRect(draggedCard, clientX, clientY);
            const currentColumn = draggedCard.closest('.column');
            const adjacentColumns = [currentColumn, currentColumn.previousElementSibling, currentColumn.nextElementSibling].filter(Boolean);
            const candidates = adjacentColumns.flatMap(col => Array.from(col.querySelectorAll('.card:not(.dragging)')));
            swapped = this.processSwaps(draggedCard, candidates, ghostRect, 'card', 'lastSwappedCard', this.swapCards.bind(this));
            if (!swapped) {
                Array.from(document.querySelectorAll('.card:not(.dragging)')).forEach(card => {
                    const debugBox = card.querySelector('.debug-inner-box');
                    if (debugBox) {
                        const cardRect = this.getInnerRect(card, this.DEBUG_RATIO);
                        debugBox.style.borderColor = this.checkCollision(ghostRect, cardRect) ? 'yellow' : 'red';
                    }
                });
            }
        }
        console.log(
            this.dragData.dragAxis === 'vertical'
                ? `DEBUG: Card drag - Direction: ${this.dragData.dragDirection}, Y: ${clientY}`
                : `DEBUG: Column drag - Direction: ${this.dragData.dragDirection}, X: ${clientX}`
        );
        return swapped;
    }

    swapCards(draggedCard, staticCard) {
        const draggedParent = draggedCard.closest('.cards');
        const staticParent = staticCard.closest('.cards');
        if (!draggedParent || !staticParent) return false;
        performFlipAnimation(draggedParent, draggedCard, () => {
            performFlipAnimation(staticParent, staticCard, () => {
                swapNodes(draggedCard, staticCard);
            });
        });
        return true;
    }

    swapColumns(draggedCol, staticCol) {
        const parent = this.kanbanContainer;
        performFlipAnimation(parent, draggedCol, () => {
            performFlipAnimation(parent, staticCol, () => {
                swapNodes(draggedCol, staticCol);
            });
        });
        return true;
    }

    openAddColumnModal() {
        this.addColumnModal.classList.add('active');
        this.addColumnModal.setAttribute('aria-hidden', 'false');
        this.columnTitleInput.focus();
    }

    closeAddColumnModal() {
        this.addColumnModal.classList.remove('active');
        this.addColumnModal.setAttribute('aria-hidden', 'true');
        this.addColumnForm.reset();
    }

    render() {
        this.kanbanContainer.innerHTML = '';
        store.getState().columns.forEach(colData => {
            const column = new Column(colData);
            this.kanbanContainer.appendChild(column.render());
        });
    }

    shouldSwap(dragged, target, ghostRect, type) {
        if ((type === 'column' && target === this.lastSwappedColumn) ||
            (type === 'card' && target === this.lastSwappedCard)) return false;
        const staticRect = this.getInnerRect(target, this.DEBUG_RATIO);
        if (!this.checkCollision(ghostRect, staticRect)) return false;
        const draggedRect = dragged.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (type === 'column') {
            if (this.dragData.dragDirection === 'right' && targetRect.left < draggedRect.left) return false;
            if (this.dragData.dragDirection === 'left' && targetRect.left > draggedRect.left) return false;
            const overlapX = Math.min(ghostRect.right, staticRect.right) - Math.max(ghostRect.left, staticRect.left);
            const minWidth = Math.min(ghostRect.right - ghostRect.left, staticRect.right - staticRect.left);
            return overlapX / minWidth > CONFIG.values.swapThreshold;
        } else {
            if (this.dragData.dragDirection === 'down' && targetRect.top < draggedRect.top) return false;
            if (this.dragData.dragDirection === 'up' && targetRect.top > draggedRect.top) return false;
            const overlapY = Math.min(ghostRect.bottom, staticRect.bottom) - Math.max(ghostRect.top, staticRect.top);
            const minHeight = Math.min(ghostRect.bottom - ghostRect.top, staticRect.bottom - staticRect.top);
            return overlapY / minHeight > CONFIG.values.swapThreshold;
        }
    }
}
