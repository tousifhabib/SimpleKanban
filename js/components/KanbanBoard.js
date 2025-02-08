import { store } from '../store.js';
import Column from './Column.js';
import {addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement} from '../utils/dragUtils.js';
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
        this.DEBUG_RATIO = 0.8;
        this.dragData = { offsetX: 0, offsetY: 0, origWidth: 0, origHeight: 0 };
        this.lastCardAfterElement = null;
        this.lastAfterElement = null;

        store.subscribe(() => this.render());
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.kanbanContainer.addEventListener(
            'dragstart',
            e => {
                const card = e.target.closest('.card');
                const col = e.target.closest('.column');
                if (card) {
                    this.handleDragStart(e, card);
                    return;
                }
                if (col) {
                    this.handleDragStart(e, col);
                }
            },
            true
        );

        this.kanbanContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const { clientX, clientY } = e;
            this.checkGhostCollision(clientX, clientY);

            const draggedCard = document.querySelector('.card.dragging');
            if (draggedCard) {
                const targetCards = e.target.closest('.cards');
                if (!targetCards) return;
                const afterEl = getCardAfterElement(targetCards, clientY);
                if (afterEl !== this.lastCardAfterElement) {
                    this.lastCardAfterElement = afterEl;
                    performFlipAnimation(targetCards, draggedCard, () => {
                        afterEl ? targetCards.insertBefore(draggedCard, afterEl) : targetCards.appendChild(draggedCard);
                    });
                }
                return;
            }

            const draggedCol = document.querySelector('.column.dragging');
            if (!draggedCol) return;
            const afterEl = getColumnAfterElement(this.kanbanContainer, clientX);
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
            this.checkGhostCollision(clientX, clientY);
        });

        this.kanbanContainer.addEventListener('drop', e => {
            e.preventDefault();
            const draggedCol = document.querySelector('.column.dragging');
            if (draggedCol) {
                draggedCol.classList.remove('dragging');
                this.lastAfterElement = null;
                const colEls = Array.from(this.kanbanContainer.querySelectorAll('.column'));
                store.reorderColumns(colEls.map(c => c.dataset.columnId));
            } else {
                const draggedCard = document.querySelector('.card.dragging');
                if (!draggedCard) return;
                const newCol = e.target.closest('.column');
                if (!newCol) return;
                const cardId = draggedCard.dataset.cardId;
                const targetColumnId = newCol.dataset.columnId;
                const { columns } = store.getState();
                let oldColumnId = null;
                for (const c of columns) {
                    if (c.cards.some(cd => cd.id === cardId)) {
                        oldColumnId = c.id;
                        break;
                    }
                }
                const targetCardsContainer = newCol.querySelector('.cards');
                const cardEls = Array.from(targetCardsContainer.querySelectorAll('.card'));
                const newCardOrder = cardEls.map(el => el.dataset.cardId);
                if (oldColumnId === targetColumnId) {
                    store.reorderCards(targetColumnId, newCardOrder);
                } else {
                    store.moveCard(cardId, oldColumnId, targetColumnId, newCardOrder);
                }
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
            const cardId = cardEl.dataset.cardId;
            const colId = colEl.dataset.columnId;
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
        });

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

    handleDragStart(e, element) {
        const rect = element.getBoundingClientRect();
        this.dragData = {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            origWidth: rect.width,
            origHeight: rect.height
        };

        if (e.dataTransfer) {
            e.dataTransfer.setDragImage(element, this.dragData.offsetX, this.dragData.offsetY);
        }

        const isCard = element.classList.contains('card');
        const elements = document.querySelectorAll(isCard ? '.card' : '.column');
        elements.forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
    }

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

    checkCollision(ghostRect, staticRect) {
        const overlapX = Math.max(ghostRect.left, staticRect.left) <= Math.min(ghostRect.right, staticRect.right);
        const overlapY = Math.max(ghostRect.top, staticRect.top) <= Math.min(ghostRect.bottom, staticRect.bottom);
        return overlapX && overlapY;
    }

    checkGhostCollision(clientX, clientY) {
        const draggedCard = document.querySelector('.card.dragging');
        const draggedColumn = document.querySelector('.column.dragging');
        if (draggedCard) {
            const rect = draggedCard.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);
            document.querySelectorAll('.card:not(.dragging)').forEach(card => {
                const staticRect = this.getInnerRect(card, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect)) {
                    console.log("DEBUG: Drag ghost inner box is touching card's inner box (cardId:", card.dataset.cardId, ")");
                }
            });
        } else if (draggedColumn) {
            const rect = draggedColumn.getBoundingClientRect();
            const ghostRect = this.computeGhostInnerRect(rect, clientX, clientY, this.dragData.offsetX, this.dragData.offsetY, this.DEBUG_RATIO);
            document.querySelectorAll('.column:not(.dragging)').forEach(col => {
                const staticRect = this.getInnerRect(col, this.DEBUG_RATIO);
                if (this.checkCollision(ghostRect, staticRect)) {
                    console.log("DEBUG: Drag ghost inner box is touching column's inner box (columnId:", col.dataset.columnId, ")");
                }
            });
        }
    }

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
        const { columns } = store.getState();
        columns.forEach(colData => {
            const column = new Column(colData);
            this.kanbanContainer.appendChild(column.render());
        });
    }
}
