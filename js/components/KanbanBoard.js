import { store } from '../store.js';
import Column from './Column.js';
import { addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement } from '../utils/dragUtils.js';
import { performFlipAnimation } from "../utils/flipAnimation";

export default class KanbanBoard {
    constructor() {
        this.kanbanContainer = document.getElementById('kanbanContainer');
        this.addColumnModal = document.getElementById('addColumnModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.addColumnForm = document.getElementById('addColumnForm');
        this.columnTitleInput = document.getElementById('columnTitleInput');
        this.addColumnBtn = document.getElementById('addColumnBtn');
        this.cancelAddColumnBtn = document.getElementById('cancelAddColumn');
        this.DEBUG_RATIO = 0.7;
        this.dragData = { offsetX: 0, offsetY: 0, origWidth: 0, origHeight: 0, lastX: 0, dragDirection: null };
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
            if (e.key === 'Escape' && this.addColumnModal.classList.contains('active')) this.closeAddColumnModal();
        });
    }

    handleDragStart(e, element) {
        const rect = element.getBoundingClientRect();
        Object.assign(this.dragData, {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            origWidth: rect.width,
            origHeight: rect.height,
            lastX: e.clientX,
            dragDirection: null
        });
        this.lastSwappedColumn = null;
        this.lastSwappedCard = null;
        if (e.dataTransfer) e.dataTransfer.setDragImage(element, this.dragData.offsetX, this.dragData.offsetY);
        const isCard = element.classList.contains('card');
        document.querySelectorAll(isCard ? '.card' : '.column').forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
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
                afterEl && afterEl !== draggedCol ? this.kanbanContainer.insertBefore(draggedCol, afterEl) : this.kanbanContainer.appendChild(draggedCol);
            });
        }
    }

    finalizeColumnDrop(draggedCol) {
        draggedCol.classList.remove('dragging');
        this.lastAfterElement = null;
        const cols = [...this.kanbanContainer.querySelectorAll('.column')].map(c => c.dataset.columnId);
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
        const newOrder = [...container.querySelectorAll('.card')].map(el => el.dataset.cardId);
        oldColumnId === targetColumnId
            ? store.reorderCards(targetColumnId, newOrder)
            : store.moveCard(cardId, oldColumnId, targetColumnId, newOrder);
    }

    computeGhostInnerRect(rect, clientX, clientY, offsetX, offsetY, ratio) {
        const ghostLeft = clientX - offsetX, ghostTop = clientY - offsetY;
        const w = rect.width * ratio, h = rect.height * ratio;
        return { left: ghostLeft + (rect.width - w) / 2, top: ghostTop + (rect.height - h) / 2, right: ghostLeft + (rect.width + w) / 2, bottom: ghostTop + (rect.height + h) / 2 };
    }

    checkCollision(ghostRect, staticRect) {
        return Math.max(ghostRect.left, staticRect.left) <= Math.min(ghostRect.right, staticRect.right) &&
            Math.max(ghostRect.top, staticRect.top) <= Math.min(ghostRect.bottom, staticRect.bottom);
    }

    checkGhostCollision(clientX, clientY) {
        let swapped = false;
        const draggedCol = document.querySelector('.column.dragging');
        const draggedCard = document.querySelector('.card.dragging');
        if (draggedCol) {
            this.updateDragDirection(clientX);
            const rect = draggedCol.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);
            document.querySelectorAll('.column:not(.dragging)').forEach(staticCol => {
                if (this.shouldSwap(draggedCol, staticCol, ghostRect, 'column')) {
                    console.log("DEBUG: Swapping columns based on direction:", this.dragData.dragDirection);
                    swapped = this.swapColumns(draggedCol, staticCol);
                    this.lastSwappedColumn = staticCol;
                }
            });
        } else if (draggedCard) {
            this.updateDragDirection(clientX);
            const rect = draggedCard.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);
            document.querySelectorAll('.card:not(.dragging)').forEach(staticCard => {
                if (this.shouldSwap(draggedCard, staticCard, ghostRect, 'card')) {
                    console.log("DEBUG: Swapping cards based on direction:", this.dragData.dragDirection);
                    swapped = this.swapCards(draggedCard, staticCard);
                    this.lastSwappedCard = staticCard;
                }
            });
        }
        return swapped;
    }

    updateDragDirection(clientX) {
        if (clientX !== this.dragData.lastX) {
            this.dragData.dragDirection = clientX > this.dragData.lastX ? 'right' : 'left';
            this.dragData.lastX = clientX;
        }
    }

    shouldSwap(dragged, target, ghostRect, type) {
        if ((type === 'column' && target === this.lastSwappedColumn) || (type === 'card' && target === this.lastSwappedCard)) return false;
        const staticRect = this.getInnerRect(target, this.DEBUG_RATIO);
        if (!this.checkCollision(ghostRect, staticRect)) return false;
        const draggedRect = dragged.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (this.dragData.dragDirection === 'right' && targetRect.left < draggedRect.left) return false;
        if (this.dragData.dragDirection === 'left' && targetRect.left > draggedRect.left) return false;
        const overlapX = Math.min(ghostRect.right, staticRect.right) - Math.max(ghostRect.left, staticRect.left);
        const minWidth = Math.min(ghostRect.right - ghostRect.left, staticRect.right - staticRect.left);
        return overlapX / minWidth > 0.025;
    }

    getInnerRect(el, ratio = 0.7) {
        const r = el.getBoundingClientRect();
        const insetX = (r.width * (1 - ratio)) / 2;
        const insetY = (r.height * (1 - ratio)) / 2;
        return { left: r.left + insetX, top: r.top + insetY, right: r.right - insetX, bottom: r.bottom - insetY };
    }

    swapCards(draggedCard, staticCard) {
        const draggedParent = draggedCard.closest('.cards'),
            staticParent = staticCard.closest('.cards');
        if (!draggedParent || !staticParent) return false;
        performFlipAnimation(draggedParent, draggedCard, () => {
            performFlipAnimation(staticParent, staticCard, () => {
                const draggedNext = draggedCard.nextSibling, staticNext = staticCard.nextSibling;
                if (draggedParent === staticParent) {
                    const placeholder = document.createElement('div');
                    draggedParent.insertBefore(placeholder, draggedCard);
                    draggedParent.insertBefore(draggedCard, staticCard);
                    draggedParent.insertBefore(staticCard, placeholder);
                    draggedParent.removeChild(placeholder);
                } else {
                    draggedNext ? draggedParent.insertBefore(staticCard, draggedNext) : draggedParent.appendChild(staticCard);
                    staticNext ? staticParent.insertBefore(draggedCard, staticNext) : staticParent.appendChild(draggedCard);
                }
            });
        });
        return true;
    }

    swapColumns(draggedCol, staticCol) {
        const parent = this.kanbanContainer;
        performFlipAnimation(parent, draggedCol, () => {
            performFlipAnimation(parent, staticCol, () => {
                const draggedNext = draggedCol.nextSibling, staticNext = staticCol.nextSibling;
                draggedNext ? parent.insertBefore(staticCol, draggedNext) : parent.appendChild(staticCol);
                staticNext ? parent.insertBefore(draggedCol, staticNext) : parent.appendChild(draggedCol);
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
}
