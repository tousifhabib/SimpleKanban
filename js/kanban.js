(function () {
    const STORAGE_KEY = 'flexibleKanbanState';

    class KanbanBoard {
        constructor() {
            this.state = this.loadState();
            this.draggedColumn = null;
            this.lastAfterElement = null;

            // Cache DOM elements
            this.kanbanContainer = document.getElementById('kanbanContainer');
            this.columnTemplate = document.getElementById('columnTemplate');
            this.cardTemplate = document.getElementById('cardTemplate');

            this.addColumnModal = document.getElementById('addColumnModal');
            this.modalOverlay = document.getElementById('modalOverlay');
            this.addColumnForm = document.getElementById('addColumnForm');
            this.columnTitleInput = document.getElementById('columnTitleInput');
            this.addColumnBtn = document.getElementById('addColumnBtn');
            this.cancelAddColumnBtn = document.getElementById('cancelAddColumn');

            this.init();
        }

        // Initialization
        init() {
            this.renderBoard();
            this.setupEventListeners();
        }

        // State persistence
        saveState() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        }

        loadState() {
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
                return saved || { columns: [] };
            } catch {
                return { columns: [] };
            }
        }

        // Utility: generate unique IDs for columns and cards
        generateId(type) {
            const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
            return type === 'column' ? `column-${id}` : `card-${id}`;
        }

        // Renders the entire board based on state
        renderBoard() {
            this.kanbanContainer.innerHTML = '';
            this.state.columns.forEach(col => {
                this.kanbanContainer.appendChild(this.createColumnElement(col));
            });
        }

        // Creates a column element from data
        createColumnElement(colData) {
            const colEl = this.columnTemplate.content.firstElementChild.cloneNode(true);
            colEl.dataset.columnId = colData.id;
            const header = colEl.querySelector('.column-header h2');
            header.textContent = colData.title;
            const cardsContainer = colEl.querySelector('.cards');

            colData.cards.forEach(card => {
                cardsContainer.appendChild(this.createCardElement(card));
            });
            this.setupColumnListeners(colEl);
            return colEl;
        }

        // Creates a card element from data
        createCardElement(cardData) {
            const cardEl = this.cardTemplate.content.firstElementChild.cloneNode(true);
            cardEl.dataset.cardId = cardData.id;
            cardEl.querySelector('.card-text').textContent = cardData.text;
            cardEl.addEventListener('dragstart', this.handleCardDragStart.bind(this));
            cardEl.addEventListener('dragend', this.handleCardDragEnd.bind(this));
            return cardEl;
        }

        // Sets up listeners for actions within a column
        setupColumnListeners(colEl) {
            const addCardBtn = colEl.querySelector('.add-card-btn');
            const addCardForm = colEl.querySelector('.add-card-form');
            const confirmAddCardBtn = addCardForm.querySelector('[data-action="confirm-add-card"]');
            const cancelAddCardBtn = addCardForm.querySelector('[data-action="cancel-add-card"]');
            const deleteColumnBtn = colEl.querySelector('[data-action="delete-column"]');
            const columnHeader = colEl.querySelector('.column-header h2');

            addCardBtn.addEventListener('click', () => {
                addCardBtn.style.display = 'none';
                addCardForm.classList.add('active');
                addCardForm.querySelector('.card-input').focus();
            });

            confirmAddCardBtn.addEventListener('click', () => {
                const input = addCardForm.querySelector('.card-input');
                const text = input.value.trim();
                if (text) this.addNewCard(colEl.dataset.columnId, text);
                input.value = '';
                addCardForm.classList.remove('active');
                addCardBtn.style.display = 'block';
            });

            cancelAddCardBtn.addEventListener('click', () => {
                addCardForm.classList.remove('active');
                addCardBtn.style.display = 'block';
            });

            deleteColumnBtn.addEventListener('click', () => {
                if (confirm('Delete this column and all its cards?')) {
                    this.state.columns = this.state.columns.filter(c => c.id !== colEl.dataset.columnId);
                    this.saveState();
                    this.renderBoard();
                }
            });

            columnHeader.addEventListener('blur', () => {
                const newTitle = columnHeader.textContent.trim() || 'Untitled Column';
                columnHeader.textContent = newTitle;
                const col = this.state.columns.find(c => c.id === colEl.dataset.columnId);
                if (col) col.title = newTitle;
                this.saveState();
            });

            // Column drag events
            colEl.addEventListener('dragstart', this.handleColumnDragStart.bind(this));
            colEl.addEventListener('dragend', this.handleColumnDragEnd.bind(this));
            colEl.addEventListener('dragover', e => e.preventDefault());
            colEl.addEventListener('drop', e => e.preventDefault());
        }

        // Business logic: add new column and card
        addNewColumn(title) {
            this.state.columns.push({ id: this.generateId('column'), title: title || 'New Column', cards: [] });
            this.saveState();
            this.renderBoard();
        }

        addNewCard(colId, text) {
            const col = this.state.columns.find(c => c.id === colId);
            if (col) {
                col.cards.push({ id: this.generateId('card'), text });
                this.saveState();
                this.renderBoard();
            }
        }

        editCard(colId, cardId, newText) {
            const col = this.state.columns.find(c => c.id === colId);
            if (!col) return;
            const card = col.cards.find(c => c.id === cardId);
            if (card) card.text = newText;
            this.saveState();
            this.renderBoard();
        }

        deleteCard(colId, cardId) {
            const col = this.state.columns.find(c => c.id === colId);
            if (col) {
                col.cards = col.cards.filter(c => c.id !== cardId);
                this.saveState();
                this.renderBoard();
            }
        }

        // Drag & drop handlers for cards
        handleCardDragStart(e) {
            e.stopPropagation();
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
            e.dataTransfer.effectAllowed = 'move';
        }

        handleCardDragEnd(e) {
            e.target.classList.remove('dragging');
            this.saveState();
        }

        // Drag & drop handlers for columns
        handleColumnDragStart(e) {
            this.draggedColumn = e.target.closest('.column');
            if (!this.draggedColumn) return;
            this.draggedColumn.classList.add('dragging');
            e.dataTransfer.setData('text/column', this.draggedColumn.dataset.columnId);
            e.dataTransfer.effectAllowed = 'move';
        }

        handleColumnDragEnd() {
            if (this.draggedColumn) {
                this.draggedColumn.classList.remove('dragging');
                this.draggedColumn = null;
                this.reorderColumns();
                this.saveState();
                document.querySelectorAll('.column').forEach(col => {
                    col.style.transition = '';
                    col.style.transform = '';
                });
            }
        }

        // After a column drag, update state order based on DOM order
        reorderColumns() {
            const colEls = Array.from(document.querySelectorAll('.column'));
            this.state.columns = colEls.map(el => this.state.columns.find(c => c.id === el.dataset.columnId));
        }

        // Helpers for determining insertion points
        getCardAfterElement(container, y) {
            const cards = Array.from(container.querySelectorAll('.card:not(.dragging)'));
            return cards.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        }

        getColumnAfterElement(container, x) {
            const columns = Array.from(container.querySelectorAll('.column:not(.dragging)'));
            return columns.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = x - box.left - box.width / 2;
                    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        }

        // Sets up global event listeners
        setupEventListeners() {
            // Card drag & drop within columns
            this.kanbanContainer.addEventListener('dragover', e => {
                e.preventDefault();
                const draggedCard = document.querySelector('.card.dragging');
                if (!draggedCard) return;
                const targetCards = e.target.closest('.cards');
                if (!targetCards) return;
                const afterEl = this.getCardAfterElement(targetCards, e.clientY);
                if (afterEl) {
                    targetCards.insertBefore(draggedCard, afterEl);
                } else {
                    targetCards.appendChild(draggedCard);
                }
            });

            this.kanbanContainer.addEventListener('drop', e => {
                e.preventDefault();
                const draggedData = e.dataTransfer.getData('text/plain');
                // Only process card drops (ignore column drops here)
                if (draggedData.startsWith('column-')) return;
                const draggingCard = document.querySelector('.card.dragging');
                if (!draggingCard) return;
                const newCol = e.target.closest('.column');
                if (!newCol) return;
                let cardData;
                this.state.columns.forEach(col => {
                    const idx = col.cards.findIndex(c => c.id === draggingCard.dataset.cardId);
                    if (idx !== -1) cardData = col.cards.splice(idx, 1)[0];
                });
                if (cardData) {
                    const targetCol = this.state.columns.find(c => c.id === newCol.dataset.columnId);
                    const targetCardsContainer = newCol.querySelector('.cards');
                    const afterEl = this.getCardAfterElement(targetCardsContainer, e.clientY);
                    const insertIndex = afterEl
                        ? targetCol.cards.findIndex(c => c.id === afterEl.dataset.cardId)
                        : targetCol.cards.length;
                    targetCol.cards.splice(insertIndex, 0, cardData);
                    this.saveState();
                    this.renderBoard();
                }
            });

            this.kanbanContainer.addEventListener('dragenter', e => e.preventDefault());

            // Column drag & drop across the board
            this.kanbanContainer.addEventListener('dragover', e => {
                e.preventDefault();
                const draggedCol = document.querySelector('.column.dragging');
                if (!draggedCol) return;
                const afterEl = this.getColumnAfterElement(this.kanbanContainer, e.clientX);
                if (afterEl !== this.lastAfterElement) {
                    this.lastAfterElement = afterEl;
                    const columns = Array.from(this.kanbanContainer.querySelectorAll('.column:not(.dragging)'));
                    const initialRects = new Map();
                    columns.forEach(col => initialRects.set(col, col.getBoundingClientRect()));

                    if (afterEl && afterEl !== draggedCol) {
                        this.kanbanContainer.insertBefore(draggedCol, afterEl);
                    } else if (!afterEl) {
                        this.kanbanContainer.appendChild(draggedCol);
                    }

                    columns.forEach(col => {
                        const oldRect = initialRects.get(col);
                        const newRect = col.getBoundingClientRect();
                        const deltaX = oldRect.left - newRect.left;
                        const deltaY = oldRect.top - newRect.top;
                        col.style.transition = 'none';
                        col.style.setProperty('--flip-transform', `translate(${deltaX}px, ${deltaY}px)`);
                    });

                    requestAnimationFrame(() => {
                        columns.forEach(col => {
                            col.style.transition = 'transform 300ms ease';
                            col.style.removeProperty('--flip-transform');
                        });
                    });
                }
            });

            // Delegate card action buttons (edit, delete)
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
                    if (newText !== null && newText.trim()) {
                        this.editCard(colId, cardId, newText.trim());
                    }
                } else if (action === 'delete') {
                    if (confirm('Delete this card?')) {
                        this.deleteCard(colId, cardId);
                    }
                }
            });

            // Modal events for adding a new column
            this.addColumnBtn.addEventListener('click', () => this.openAddColumnModal());
            this.cancelAddColumnBtn.addEventListener('click', () => this.closeAddColumnModal());
            this.modalOverlay.addEventListener('click', () => this.closeAddColumnModal());
            this.addColumnForm.addEventListener('submit', e => {
                e.preventDefault();
                const title = this.columnTitleInput.value.trim();
                if (title) this.addNewColumn(title);
                this.closeAddColumnModal();
            });

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && this.addColumnModal.classList.contains('active')) {
                    this.closeAddColumnModal();
                }
            });
        }

        // Modal open/close helpers
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
    }

    // Initialize the Kanban board
    new KanbanBoard();
})();
