import {store} from '../store.js';
import Column from './Column.js';
import {addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement} from '../utils/dragUtils.js';
import {performFlipAnimation} from "../utils/flipAnimation";

export default class KanbanBoard {
    constructor() {
        this.kanbanContainer = document.getElementById('kanbanContainer');
        this.addColumnModal = document.getElementById('addColumnModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.addColumnForm = document.getElementById('addColumnForm');
        this.columnTitleInput = document.getElementById('columnTitleInput');
        this.addColumnBtn = document.getElementById('addColumnBtn');
        this.cancelAddColumnBtn = document.getElementById('cancelAddColumn');
        this.DEBUG_RATIO = 0.8;
        this.dragData = {offsetX: 0, offsetY: 0, origWidth: 0, origHeight: 0};
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
            if (card) {
                this.handleDragStart(e, card);
                return;
            }
            if (col) this.handleDragStart(e, col);
        }, true);
        this.kanbanContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const {clientX, clientY} = e;
            const didSwap = this.checkGhostCollision(clientX, clientY);
            if (!didSwap) {
                const draggedCard = document.querySelector('.card.dragging');
                if (draggedCard) {
                    this.handleCardDragOver(e, draggedCard);
                    return;
                }
                const draggedCol = document.querySelector('.column.dragging');
                if (draggedCol) this.handleColumnDragOver(e, draggedCol);
            }
        });
        this.kanbanContainer.addEventListener('drop', e => {
            e.preventDefault();
            const draggedCol = document.querySelector('.column.dragging');
            if (draggedCol) this.finalizeColumnDrop(draggedCol);
            else {
                const draggedCard = document.querySelector('.card.dragging');
                if (draggedCard) this.finalizeCardDrop(e, draggedCard);
            }
        });
        this.kanbanContainer.addEventListener('dragenter', e => e.preventDefault());
        document.addEventListener('click', e => {
            const btn = e.target.closest('.card-action-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            const cardEl = btn.closest('.card');
            const colEl = btn.closest('.column');
            if (!cardEl || !colEl) return;
            const cardId = cardEl.dataset.cardId, colId = colEl.dataset.columnId;
            if (action === 'edit') {
                const currentText = cardEl.querySelector('.card-text').textContent.trim();
                const newText = prompt('Edit card text:', currentText);
                if (newText && newText.trim()) store.updateCard(colId, cardId, newText.trim());
            } else if (action === 'delete') {
                if (confirm('Delete this card?')) store.removeCard(colId, cardId);
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
        this.dragData = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            origWidth: rect.width,
            origHeight: rect.height
        };
        if (e.dataTransfer) e.dataTransfer.setDragImage(element, this.dragData.offsetX, this.dragData.offsetY);
        const isCard = element.classList.contains('card');
        const elements = document.querySelectorAll(isCard ? '.card' : '.column');
        elements.forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
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
                if (afterEl && afterEl !== draggedCol) this.kanbanContainer.insertBefore(draggedCol, afterEl);
                else if (!afterEl) this.kanbanContainer.appendChild(draggedCol);
            });
        }
    }

    finalizeColumnDrop(draggedCol) {
        draggedCol.classList.remove('dragging');
        this.lastAfterElement = null;
        const cols = Array.from(this.kanbanContainer.querySelectorAll('.column'));
        store.reorderColumns(cols.map(c => c.dataset.columnId));
    }

    finalizeCardDrop(e, draggedCard) {
        draggedCard.classList.remove('dragging');
        this.lastCardAfterElement = null;
        const newCol = e.target.closest('.column');
        if (!newCol) return;
        const cardId = draggedCard.dataset.cardId, targetColumnId = newCol.dataset.columnId;
        const {columns} = store.getState();
        let oldColumnId = null;
        for (const c of columns) {
            if (c.cards.some(cd => cd.id === cardId)) {
                oldColumnId = c.id;
                break;
            }
        }
        const container = newCol.querySelector('.cards');
        const cardEls = Array.from(container.querySelectorAll('.card'));
        const newOrder = cardEls.map(el => el.dataset.cardId);
        oldColumnId === targetColumnId ? store.reorderCards(targetColumnId, newOrder) : store.moveCard(cardId, oldColumnId, targetColumnId, newOrder);
    }

    computeGhostInnerRect(rect, clientX, clientY, offsetX, offsetY, ratio) {
        const ghostLeft = clientX - offsetX, ghostTop = clientY - offsetY;
        const w = rect.width * ratio, h = rect.height * ratio;
        return {
            left: ghostLeft + (rect.width - w) / 2,
            top: ghostTop + (rect.height - h) / 2,
            right: ghostLeft + (rect.width + w) / 2,
            bottom: ghostTop + (rect.height + h) / 2
        };
    }

    checkCollision(ghostRect, staticRect) {
        return Math.max(ghostRect.left, staticRect.left) <= Math.min(ghostRect.right, staticRect.right) && Math.max(ghostRect.top, staticRect.top) <= Math.min(ghostRect.bottom, staticRect.bottom);
    }

    checkGhostCollision(clientX, clientY) {
        let swapped = false;
        const draggedCard = document.querySelector('.card.dragging');
        const draggedCol = document.querySelector('.column.dragging');

        if (draggedCard) {
            const rect = draggedCard.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);

            document.querySelectorAll('.card:not(.dragging)').forEach(staticCard => {
                const staticRect = this.getInnerRect(staticCard, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect) && !swapped) {
                    console.log("DEBUG: Drag ghost inner box is touching card's inner box (cardId:", staticCard.dataset.cardId, ")");
                    swapped = this.swapCards(draggedCard, staticCard);
                }
            });
        } else if (draggedCol) {
            const rect = draggedCol.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);

            document.querySelectorAll('.column:not(.dragging)').forEach(staticCol => {
                const staticRect = this.getInnerRect(staticCol, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect) && !swapped) {
                    console.log("DEBUG: Drag ghost inner box is touching column's inner box (columnId:", staticCol.dataset.columnId, ")");
                    swapped = this.swapColumns(draggedCol, staticCol);
                }
            });
        }
        return swapped;
    }

    getInnerRect(el, ratio = 0.8) {
        const r = el.getBoundingClientRect();
        const insetX = (r.width * (1 - ratio)) / 2, insetY = (r.height * (1 - ratio)) / 2;
        return {left: r.left + insetX, top: r.top + insetY, right: r.right - insetX, bottom: r.bottom - insetY};
    }

    swapCards(draggedCard, staticCard) {
        const draggedParent = draggedCard.closest('.cards'),
            staticParent = staticCard.closest('.cards');
        if (!draggedParent || !staticParent) return false;

        // First, animate the swap in the dragged container
        performFlipAnimation(draggedParent, draggedCard, () => {
            // Then animate the swap in the static card's container
            performFlipAnimation(staticParent, staticCard, () => {
                // Swap the positions in the DOM
                const draggedNext = draggedCard.nextSibling,
                    staticNext = staticCard.nextSibling;

                // If both cards are in the same container
                if (draggedParent === staticParent) {
                    // A simple swap can be done by inserting a temporary placeholder
                    const placeholder = document.createElement('div');
                    draggedParent.insertBefore(placeholder, draggedCard);
                    draggedParent.insertBefore(draggedCard, staticCard);
                    draggedParent.insertBefore(staticCard, placeholder);
                    draggedParent.removeChild(placeholder);
                } else {
                    // For different containers, do the respective insertions
                    if (draggedNext) {
                        draggedParent.insertBefore(staticCard, draggedNext);
                    } else {
                        draggedParent.appendChild(staticCard);
                    }
                    if (staticNext) {
                        staticParent.insertBefore(draggedCard, staticNext);
                    } else {
                        staticParent.appendChild(draggedCard);
                    }
                }
                // IMPORTANT: Do NOT update the store here.
                // Wait until the drop event to update the underlying state.
            });
        });
        return true;
    }

    updateCardPositionsAfterSwap(cardA, cardB) {
        const cardAId = cardA.dataset.cardId, cardBId = cardB.dataset.cardId;
        const colA = cardA.closest('.column'), colB = cardB.closest('.column');
        if (!colA || !colB) return;
        const colAId = colA.dataset.columnId, colBId = colB.dataset.columnId;
        const colAContainer = colA.querySelector('.cards'), colBContainer = colB.querySelector('.cards');
        const colAOrder = [...colAContainer.querySelectorAll('.card')].map(c => c.dataset.cardId);
        const colBOrder = [...colBContainer.querySelectorAll('.card')].map(c => c.dataset.cardId);
        colAId === colBId ? store.reorderCards(colAId, colAOrder) : (store.moveCard(cardAId, colAId, colBId, colBOrder), store.moveCard(cardBId, colBId, colAId, colAOrder));
    }

    swapColumns(draggedCol, staticCol) {
        const parent = this.kanbanContainer;

        performFlipAnimation(parent, draggedCol, () => {
            performFlipAnimation(parent, staticCol, () => {
                const draggedNext = draggedCol.nextSibling,
                    staticNext = staticCol.nextSibling;

                if (draggedNext) {
                    parent.insertBefore(staticCol, draggedNext);
                } else {
                    parent.appendChild(staticCol);
                }
                if (staticNext) {
                    parent.insertBefore(draggedCol, staticNext);
                } else {
                    parent.appendChild(draggedCol);
                }
                // Again, DO NOT update the store here.
                // The store update (and full re-render) happens on drop.
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
        const {columns} = store.getState();
        columns.forEach(colData => {
            const column = new Column(colData);
            this.kanbanContainer.appendChild(column.render());
        });
    }
}
