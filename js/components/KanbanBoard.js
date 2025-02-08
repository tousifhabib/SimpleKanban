import { store } from '../store.js';
import Column from './Column.js';
import {
    addDebugInnerBoxToElement,
    getCardAfterElement,
    getColumnAfterElement
} from '../utils/dragUtils.js';
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

        // Debug ratio for the “inner box”
        this.DEBUG_RATIO = 0.8;

        // Store drag data for offset calculations
        this.dragData = { offsetX: 0, offsetY: 0, origWidth: 0, origHeight: 0 };

        // Keep track of last “insert-after” references to avoid redundant reflows
        this.lastCardAfterElement = null;
        this.lastAfterElement = null;

        store.subscribe(() => this.render());
        this.setupEventListeners();
        this.render();
    }

    /**
     * Sets up all event listeners for the Kanban board.
     */
    setupEventListeners() {
        this.kanbanContainer.addEventListener('dragstart', e => {
            const card = e.target.closest('.card');
            const col = e.target.closest('.column');
            if (card) {
                this.handleDragStart(e, card);
                return;
            }
            if (col) {
                this.handleDragStart(e, col);
            }
        }, true);

        this.kanbanContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const { clientX, clientY } = e;

            // Attempt collision-based switching first
            const didSwap = this.checkGhostCollision(clientX, clientY);

            // If no collision-based swap, fallback to standard “replace” logic:
            if (!didSwap) {
                const draggedCard = document.querySelector('.card.dragging');
                if (draggedCard) {
                    this.handleCardDragOver(e, draggedCard);
                    return;
                }
                const draggedCol = document.querySelector('.column.dragging');
                if (draggedCol) {
                    this.handleColumnDragOver(e, draggedCol);
                }
            }
        });

        this.kanbanContainer.addEventListener('drop', e => {
            e.preventDefault();
            const draggedCol = document.querySelector('.column.dragging');
            if (draggedCol) {
                this.finalizeColumnDrop(draggedCol);
            } else {
                const draggedCard = document.querySelector('.card.dragging');
                if (draggedCard) {
                    this.finalizeCardDrop(e, draggedCard);
                }
            }
        });

        this.kanbanContainer.addEventListener('dragenter', e => e.preventDefault());

        // Handle card actions (edit/delete)
        document.addEventListener('click', e => {
            const btn = e.target.closest('.card-action-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            const cardEl = btn.closest('.card');
            const colEl = btn.closest('.column');
            if (!cardEl || !colEl) return;
            const cardId = cardEl.dataset.cardId;
            const colId = colEl.dataset.columnId;
            this.handleCardAction(action, colId, cardId, cardEl);
        });

        // Column modal logic
        this.addColumnBtn.addEventListener('click', () => this.openAddColumnModal());
        this.cancelAddColumnBtn.addEventListener('click', () => this.closeAddColumnModal());
        this.modalOverlay.addEventListener('click', () => this.closeAddColumnModal());
        this.addColumnForm.addEventListener('submit', e => {
            e.preventDefault();
            const title = this.columnTitleInput.value.trim();
            if (title) {
                store.addColumn(title);
            }
            this.closeAddColumnModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.addColumnModal.classList.contains('active')) {
                this.closeAddColumnModal();
            }
        });
    }

    /**
     * Handle the dragstart event for either a card or a column.
     */
    handleDragStart(e, element) {
        const rect = element.getBoundingClientRect();
        this.dragData = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            origWidth: rect.width,
            origHeight: rect.height
        };

        // Set the drag image to the actual element
        if (e.dataTransfer) {
            e.dataTransfer.setDragImage(element, this.dragData.offsetX, this.dragData.offsetY);
        }

        // Mark the element as “dragging” and add debug boxes
        const isCard = element.classList.contains('card');
        const elements = document.querySelectorAll(isCard ? '.card' : '.column');
        elements.forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
    }

    /**
     * Handles card reordering in standard “replace” mode (fallback if no collision).
     */
    handleCardDragOver(e, draggedCard) {
        const targetCardsContainer = e.target.closest('.cards');
        if (!targetCardsContainer) return;
        const afterEl = getCardAfterElement(targetCardsContainer, e.clientY);

        // Only reflow if the “next element” actually changes
        if (afterEl !== this.lastCardAfterElement) {
            this.lastCardAfterElement = afterEl;
            performFlipAnimation(targetCardsContainer, draggedCard, () => {
                if (afterEl) {
                    targetCardsContainer.insertBefore(draggedCard, afterEl);
                } else {
                    targetCardsContainer.appendChild(draggedCard);
                }
            });
        }
    }

    /**
     * Handles column reordering in standard “replace” mode (fallback if no collision).
     */
    handleColumnDragOver(e, draggedCol) {
        const afterEl = getColumnAfterElement(this.kanbanContainer, e.clientX);

        if (afterEl !== this.lastAfterElement) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(this.kanbanContainer, draggedCol, () => {
                if (afterEl && afterEl !== draggedCol) {
                    this.kanbanContainer.insertBefore(draggedCol, afterEl);
                } else if (!afterEl) {
                    this.kanbanContainer.appendChild(draggedCol);
                }
            });
        }
    }

    /**
     * Called on drop event for columns.
     * Finalizes the column reordering in the store.
     */
    finalizeColumnDrop(draggedCol) {
        draggedCol.classList.remove('dragging');
        this.lastAfterElement = null;
        const colEls = Array.from(this.kanbanContainer.querySelectorAll('.column'));
        store.reorderColumns(colEls.map(c => c.dataset.columnId));
    }

    /**
     * Called on drop event for cards.
     * Finalizes the card reordering/move in the store.
     */
    finalizeCardDrop(e, draggedCard) {
        draggedCard.classList.remove('dragging');
        this.lastCardAfterElement = null;

        const newCol = e.target.closest('.column');
        if (!newCol) return;

        const cardId = draggedCard.dataset.cardId;
        const targetColumnId = newCol.dataset.columnId;
        const { columns } = store.getState();

        // Find old column for the card
        let oldColumnId = null;
        for (const c of columns) {
            if (c.cards.some(cd => cd.id === cardId)) {
                oldColumnId = c.id;
                break;
            }
        }

        // Build new card order from the DOM
        const targetCardsContainer = newCol.querySelector('.cards');
        const cardEls = Array.from(targetCardsContainer.querySelectorAll('.card'));
        const newCardOrder = cardEls.map(el => el.dataset.cardId);

        if (oldColumnId === targetColumnId) {
            // Just reorder in same column
            store.reorderCards(targetColumnId, newCardOrder);
        } else {
            // Move card to a new column
            store.moveCard(cardId, oldColumnId, targetColumnId, newCardOrder);
        }
    }

    /**
     * Helper to handle the actual card actions (edit/delete).
     */
    handleCardAction(action, colId, cardId, cardEl) {
        if (action === 'edit') {
            const currentText = cardEl.querySelector('.card-text').textContent.trim();
            const newText = prompt('Edit card text:', currentText);
            if (newText && newText.trim()) {
                store.updateCard(colId, cardId, newText.trim());
            }
        } else if (action === 'delete') {
            if (confirm('Delete this card?')) {
                store.removeCard(colId, cardId);
            }
        }
    }

    /**
     * Computes the “ghost inner box” for the dragged element
     * based on the ratio and the current pointer offsets.
     */
    computeGhostInnerRect(rect, clientX, clientY, offsetX, offsetY, ratio) {
        const ghostLeft = clientX - offsetX;
        const ghostTop = clientY - offsetY;
        const w = rect.width * ratio;
        const h = rect.height * ratio;

        return {
            left: ghostLeft + (rect.width - w) / 2,
            top: ghostTop + (rect.height - h) / 2,
            right: ghostLeft + (rect.width + w) / 2,
            bottom: ghostTop + (rect.height + h) / 2
        };
    }

    /**
     * Basic AABB collision check for 2 rectangles.
     */
    checkCollision(ghostRect, staticRect) {
        const overlapX = Math.max(ghostRect.left, staticRect.left) <= Math.min(ghostRect.right, staticRect.right);
        const overlapY = Math.max(ghostRect.top, staticRect.top) <= Math.min(ghostRect.bottom, staticRect.bottom);
        return overlapX && overlapY;
    }

    /**
     * Checks if the “ghost” of the dragged element is colliding
     * with another element's inner box. If so, we attempt a “swap.”
     *
     * Return:
     *   - true if we performed a collision-based swap
     *   - false otherwise
     */
    checkGhostCollision(clientX, clientY) {
        let swapped = false;
        const draggedCard = document.querySelector('.card.dragging');
        const draggedColumn = document.querySelector('.column.dragging');

        if (draggedCard) {
            // Card collision logic
            const rect = draggedCard.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(
                rect,
                clientX,
                clientY,
                this.dragData.offsetX,
                this.dragData.offsetY,
                this.DEBUG_RATIO
            );

            // Check collision against other cards
            const otherCards = document.querySelectorAll('.card:not(.dragging)');
            otherCards.forEach(staticCard => {
                const staticRect = this.getInnerRect(staticCard, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect)) {
                    console.log("DEBUG: Card ghost is colliding with card", staticCard.dataset.cardId);

                    // Perform a “swap” in the DOM if not yet swapped
                    if (!swapped) {
                        swapped = this.swapCards(draggedCard, staticCard);
                    }
                }
            });
        } else if (draggedColumn) {
            // Column collision logic
            const rect = draggedColumn.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(
                rect,
                clientX,
                clientY,
                this.dragData.offsetX,
                this.dragData.offsetY,
                this.DEBUG_RATIO
            );

            // Check collision against other columns
            const otherColumns = document.querySelectorAll('.column:not(.dragging)');
            otherColumns.forEach(staticCol => {
                const staticRect = this.getInnerRect(staticCol, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect)) {
                    console.log("DEBUG: Column ghost is colliding with column", staticCol.dataset.columnId);

                    // Perform a “swap” in the DOM if not yet swapped
                    if (!swapped) {
                        swapped = this.swapColumns(draggedColumn, staticCol);
                    }
                }
            });
        }
        return swapped;
    }

    /**
     * Returns the "inner rect" of an element according to ratio.
     * We use this for collision detection with the “red box.”
     */
    getInnerRect(el, ratio = 0.8) {
        const r = el.getBoundingClientRect();
        const insetX = (r.width * (1 - ratio)) / 2;
        const insetY = (r.height * (1 - ratio)) / 2;
        return {
            left: r.left + insetX,
            top: r.top + insetY,
            right: r.right - insetX,
            bottom: r.bottom - insetY
        };
    }

    /**
     * Swaps two card elements in the DOM with flip animation,
     * then updates the store accordingly.
     */
    swapCards(draggedCard, staticCard) {
        // Both cards belong to columns. Let's do a direct DOM swap.
        // We'll figure out each card's column first.
        const draggedParent = draggedCard.closest('.cards');
        const staticParent = staticCard.closest('.cards');
        if (!draggedParent || !staticParent) return false;

        performFlipAnimation(draggedParent, draggedCard, () => {
            performFlipAnimation(staticParent, staticCard, () => {
                // DOM swap
                const draggedNextSibling = draggedCard.nextSibling;
                const staticNextSibling = staticCard.nextSibling;

                if (draggedNextSibling) {
                    draggedParent.insertBefore(staticCard, draggedNextSibling);
                } else {
                    draggedParent.appendChild(staticCard);
                }

                if (staticNextSibling) {
                    staticParent.insertBefore(draggedCard, staticNextSibling);
                } else {
                    staticParent.appendChild(draggedCard);
                }

                // Now reflect changes in the store
                this.updateCardPositionsAfterSwap(draggedCard, staticCard);
            });
        });
        return true;
    }

    /**
     * Reflects card-swap changes in the store.
     */
    updateCardPositionsAfterSwap(cardA, cardB) {
        const cardAId = cardA.dataset.cardId;
        const cardBId = cardB.dataset.cardId;

        // Identify columns
        const colA = cardA.closest('.column');
        const colB = cardB.closest('.column');
        if (!colA || !colB) return;

        const colAId = colA.dataset.columnId;
        const colBId = colB.dataset.columnId;

        // Build new card order from the DOM for both columns
        const colAContainer = colA.querySelector('.cards');
        const colBContainer = colB.querySelector('.cards');
        const colAOrder = [...colAContainer.querySelectorAll('.card')].map(c => c.dataset.cardId);
        const colBOrder = [...colBContainer.querySelectorAll('.card')].map(c => c.dataset.cardId);

        // If swapped within the same column
        if (colAId === colBId) {
            store.reorderCards(colAId, colAOrder);
        } else {
            // Moved across columns
            store.moveCard(cardAId, colAId, colBId, colBOrder);
            store.moveCard(cardBId, colBId, colAId, colAOrder);
        }
    }

    /**
     * Swaps two column elements in the DOM with flip animation,
     * then updates the store accordingly.
     */
    swapColumns(draggedCol, staticCol) {
        const parent = this.kanbanContainer;
        performFlipAnimation(parent, draggedCol, () => {
            performFlipAnimation(parent, staticCol, () => {
                // DOM swap
                const draggedNextSibling = draggedCol.nextSibling;
                const staticNextSibling = staticCol.nextSibling;

                if (draggedNextSibling) {
                    parent.insertBefore(staticCol, draggedNextSibling);
                } else {
                    parent.appendChild(staticCol);
                }

                if (staticNextSibling) {
                    parent.insertBefore(draggedCol, staticNextSibling);
                } else {
                    parent.appendChild(draggedCol);
                }

                // Reflect in the store
                const colEls = Array.from(parent.querySelectorAll('.column'));
                store.reorderColumns(colEls.map(c => c.dataset.columnId));
            });
        });
        return true;
    }

    /**
     * Opens the “Add Column” modal.
     */
    openAddColumnModal() {
        this.addColumnModal.classList.add('active');
        this.addColumnModal.setAttribute('aria-hidden', 'false');
        this.columnTitleInput.focus();
    }

    /**
     * Closes the “Add Column” modal.
     */
    closeAddColumnModal() {
        this.addColumnModal.classList.remove('active');
        this.addColumnModal.setAttribute('aria-hidden', 'true');
        this.addColumnForm.reset();
    }

    /**
     * Renders the Kanban board from the store state.
     */
    render() {
        this.kanbanContainer.innerHTML = '';
        const { columns } = store.getState();
        columns.forEach(colData => {
            const column = new Column(colData);
            this.kanbanContainer.appendChild(column.render());
        });
    }
}
