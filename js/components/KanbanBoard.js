import { store } from '../store.js';
import Column from './Column.js';
import { getCardAfterElement, getColumnAfterElement } from '../utils/dragUtils.js';
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

        this.lastCardAfterElement = null;
        this.lastAfterElement = null;

        store.subscribe(() => {
            this.render();
        });

        this.setupEventListeners();

        this.render();
    }

    setupEventListeners() {
        // ------------------------
        // 1) Card drag & drop within columns
        // ------------------------
        this.kanbanContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggedCard = document.querySelector('.card.dragging');
            if (!draggedCard) return;

            const targetCards = e.target.closest('.cards');
            if (!targetCards) return;

            const afterEl = getCardAfterElement(targetCards, e.clientY);
            if (afterEl === this.lastCardAfterElement) return;
            this.lastCardAfterElement = afterEl;

            performFlipAnimation(
                targetCards,
                draggedCard,
                () => {
                    if (afterEl) {
                        targetCards.insertBefore(draggedCard, afterEl);
                    } else {
                        targetCards.appendChild(draggedCard);
                    }
                }
            );
        });

        this.kanbanContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedData = e.dataTransfer.getData('text/plain');
            if (draggedData.startsWith('column-')) return;

            const draggingCard = document.querySelector('.card.dragging');
            if (!draggingCard) return;

            const newCol = e.target.closest('.column');
            if (!newCol) return;

            const cardId = draggingCard.dataset.cardId;
            const targetColumnId = newCol.dataset.columnId;

            const { columns } = store.getState();
            let oldColumnId = null;
            for (const col of columns) {
                if (col.cards.some(c => c.id === cardId)) {
                    oldColumnId = col.id;
                    break;
                }
            }

            // Determine the new order of cards in the target column based on the DOM.
            const targetCardsContainer = newCol.querySelector('.cards');
            const cardEls = Array.from(targetCardsContainer.querySelectorAll('.card'));
            const newCardOrder = cardEls.map(el => el.dataset.cardId);

            // If the card remains in the same column, simply reorder.
            if (oldColumnId === targetColumnId) {
                store.reorderCards(targetColumnId, newCardOrder);
            } else {
                // Otherwise, move the card from the old column to the new one and reorder.
                store.moveCard(cardId, oldColumnId, targetColumnId, newCardOrder);
            }
        });

        this.kanbanContainer.addEventListener('dragenter', (e) => e.preventDefault());

        // ------------------------
        // 2) Column drag & drop across the board
        // ------------------------
        this.kanbanContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggedCol = document.querySelector('.column.dragging');
            if (!draggedCol) return;

            const afterEl = getColumnAfterElement(this.kanbanContainer, e.clientX);
            if (afterEl === this.lastAfterElement) return;
            this.lastAfterElement = afterEl;

            performFlipAnimation(
                this.kanbanContainer,
                draggedCol,
                () => {
                    if (afterEl && afterEl !== draggedCol) {
                        this.kanbanContainer.insertBefore(draggedCol, afterEl);
                    } else if (!afterEl) {
                        this.kanbanContainer.appendChild(draggedCol);
                    }
                }
            );
        });

        this.kanbanContainer.addEventListener('drop', () => {
            const draggedCol = document.querySelector('.column.dragging');
            if (draggedCol) {
                draggedCol.classList.remove('dragging');
                this.lastAfterElement = null;

                const colEls = Array.from(
                    this.kanbanContainer.querySelectorAll('.column')
                );
                const newOrder = colEls.map((col) => col.dataset.columnId);
                store.reorderColumns(newOrder);
            }
        });

        // ------------------------
        // 3) Card action buttons (edit, delete)
        // ------------------------
        document.addEventListener('click', (e) => {
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
                if (newText !== null && newText.trim()) {
                    store.updateCard(colId, cardId, newText.trim());
                }
            } else if (action === 'delete') {
                if (confirm('Delete this card?')) {
                    store.removeCard(colId, cardId);
                }
            }
        });

        // ------------------------
        // 4) Modal events for adding a new column
        // ------------------------
        this.addColumnBtn.addEventListener('click', () => this.openAddColumnModal());
        this.cancelAddColumnBtn.addEventListener('click', () => this.closeAddColumnModal());
        this.modalOverlay.addEventListener('click', () => this.closeAddColumnModal());
        this.addColumnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = this.columnTitleInput.value.trim();
            if (title) {
                store.addColumn(title);
            }
            this.closeAddColumnModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.addColumnModal.classList.contains('active')) {
                this.closeAddColumnModal();
            }
        });
    }

    // ------------------------
    // Modal open/close helpers
    // ------------------------
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

    // ------------------------
    // Main render function
    // ------------------------
    render() {
        this.kanbanContainer.innerHTML = '';

        const { columns } = store.getState();

        columns.forEach((colData) => {
            const column = new Column(colData);
            this.kanbanContainer.appendChild(column.render());
        });
    }
}
