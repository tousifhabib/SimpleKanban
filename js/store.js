import { loadFromLocalStorage, saveToLocalStorage } from './services/localStorageService.js';
import { generateId } from './utils/id.js';

const STORAGE_KEY = 'flexibleKanbanState';

const DEFAULT_LABELS = [
    { id: 'label-1', name: 'Bug', color: '#e53935' },
    { id: 'label-2', name: 'Feature', color: '#43a047' },
    { id: 'label-3', name: 'Urgent', color: '#ff9800' },
    { id: 'label-4', name: 'Review', color: '#8e24aa' }
];

const TEMPLATES = {
    basic: ['To Do', 'Doing', 'Done'],
    software: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
    sales: ['Lead', 'Contacted', 'Proposal', 'Closed'],
    empty: []
};

const newCard = (text) => {
    const now = new Date().toISOString();
    return {
        id: generateId('card'),
        text,
        description: '',
        startDate: null,
        dueDate: null,
        completed: false,
        priority: 'none',
        labels: [],
        logs: [],
        createdAt: now,
        updatedAt: now
    };
};

class Store {
    constructor() {
        const savedData = loadFromLocalStorage(STORAGE_KEY);
        this.listeners = [];

        if (savedData && Array.isArray(savedData.columns)) {
            const defaultId = generateId('board');
            this.state = {
                activeBoardId: defaultId,
                boards: [{
                    id: defaultId,
                    name: 'My Board',
                    columns: savedData.columns,
                    labels: savedData.labels || DEFAULT_LABELS
                }]
            };
            this.state.boards[0].columns.forEach(col => {
                col.cards.forEach(card => {
                    if (!card.createdAt) card.createdAt = new Date().toISOString();
                    if (!card.updatedAt) card.updatedAt = new Date().toISOString();
                    if (!card.logs) card.logs = [];
                });
            });
        } else {
            this.state = savedData || this.createInitialState();
        }

        this.subscribe((state) => saveToLocalStorage(STORAGE_KEY, state));
    }

    createInitialState() {
        const boardId = generateId('board');
        return {
            activeBoardId: boardId,
            boards: [{
                id: boardId,
                name: 'My First Board',
                columns: [],
                labels: structuredClone(DEFAULT_LABELS)
            }]
        };
    }

    getBoards() {
        return this.state.boards.map(b => ({ id: b.id, name: b.name }));
    }

    getActiveBoardId() {
        return this.state.activeBoardId;
    }

    getActiveBoard() {
        return this.state.boards.find(b => b.id === this.state.activeBoardId);
    }

    setActiveBoard(boardId) {
        if (this.state.boards.some(b => b.id === boardId)) {
            this.state.activeBoardId = boardId;
            this.notify();
        }
    }

    createBoard(name, templateType = 'basic') {
        const newId = generateId('board');
        const columns = (TEMPLATES[templateType] || TEMPLATES.basic).map(title => ({
            id: generateId('column'),
            title,
            cards: []
        }));

        const newBoard = {
            id: newId,
            name: name || 'New Board',
            columns,
            labels: structuredClone(DEFAULT_LABELS)
        };

        this.state.boards.push(newBoard);
        this.state.activeBoardId = newId;
        this.notify();
    }

    renameBoard(boardId, name) {
        const board = this.state.boards.find((b) => b.id === boardId);
        if (!board) return false;

        const newName = (name || '').trim();
        if (!newName) return false;

        board.name = newName;
        this.notify();
        return true;
    }

    deleteBoard(boardId) {
        const idx = this.state.boards.findIndex((b) => b.id === boardId);
        if (idx === -1) return false;
        if (this.state.boards.length <= 1) return false;

        const deletingActive = this.state.activeBoardId === boardId;

        this.state.boards.splice(idx, 1);

        if (deletingActive) {
            this.state.activeBoardId = this.state.boards[0]?.id || null;
        }

        this.notify();
        return true;
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (!data.boards || !Array.isArray(data.boards)) throw new Error('Invalid format');

            this.state = data;
            if (!this.state.boards.find(b => b.id === this.state.activeBoardId)) {
                this.state.activeBoardId = this.state.boards[0]?.id;
            }
            this.notify();
            return true;
        } catch (e) {
            console.error('Import failed', e);
            return false;
        }
    }

    getState() {
        return this.getActiveBoard();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach((listener) => listener(this.state));
    }

    col(columnId) {
        return this.getState().columns.find((c) => c.id === columnId);
    }

    card(columnId, cardId) {
        return this.col(columnId)?.cards.find((c) => c.id === cardId);
    }

    getLabels() {
        return this.getState().labels || [];
    }

    addLabel(name, color) {
        const newLabel = { id: generateId('label'), name, color };
        this.getState().labels.push(newLabel);
        this.notify();
    }

    updateLabel(labelId, name, color) {
        const label = this.getLabels().find((l) => l.id === labelId);
        if (!label) return;
        label.name = name;
        label.color = color;
        this.notify();
    }

    removeLabel(labelId) {
        const board = this.getState();
        board.labels = board.labels.filter((l) => l.id !== labelId);
        board.columns.forEach((col) => {
            col.cards.forEach((card) => {
                if (card.labels) card.labels = card.labels.filter((id) => id !== labelId);
            });
        });
        this.notify();
    }

    addColumn(title) {
        this.getState().columns.push({
            id: generateId('column'),
            title: title || 'New Column',
            cards: []
        });
        this.notify();
    }

    removeColumn(columnId) {
        const board = this.getState();
        board.columns = board.columns.filter((c) => c.id !== columnId);
        this.notify();
    }

    updateColumnTitle(columnId, newTitle) {
        const col = this.col(columnId);
        if (!col) return;
        col.title = newTitle;
        this.notify();
    }

    addCard(columnId, text) {
        const col = this.col(columnId);
        if (!col) return;
        col.cards.push(newCard(text));
        this.notify();
    }

    updateCardDetails(columnId, cardId, updates) {
        const card = this.card(columnId, cardId);
        if (!card) return;
        Object.assign(card, updates);
        card.updatedAt = new Date().toISOString();
        this.notify();
    }

    toggleCardComplete(columnId, cardId) {
        const card = this.card(columnId, cardId);
        if (!card) return;
        card.completed = !card.completed;
        card.updatedAt = new Date().toISOString();
        this.notify();
    }

    getCard(cardId) {
        for (const col of this.getState().columns) {
            const card = col.cards.find((c) => c.id === cardId);
            if (card) return { card, columnId: col.id };
        }
        return null;
    }

    removeCard(columnId, cardId) {
        const col = this.col(columnId);
        if (!col) return;
        col.cards = col.cards.filter((c) => c.id !== cardId);
        this.notify();
    }

    addCardLog(columnId, cardId, text) {
        const card = this.card(columnId, cardId);
        const column = this.col(columnId);
        if (!card) return;

        if (!card.logs) card.logs = [];

        card.logs.push({
            id: generateId('log'),
            text,
            columnTitle: column ? column.title : null,
            createdAt: new Date().toISOString()
        });

        card.updatedAt = new Date().toISOString();
        this.notify();
    }

    reorderColumns(columnOrder) {
        const board = this.getState();
        board.columns = columnOrder.map((id) => board.columns.find((c) => c.id === id));
        this.notify();
    }

    reorderCards(columnId, cardOrder) {
        const col = this.col(columnId);
        if (!col) return;

        const newCards = cardOrder.map((id) => col.cards.find((card) => card.id === id)).filter(Boolean);
        const missingCards = col.cards.filter((card) => !cardOrder.includes(card.id));
        col.cards = [...newCards, ...missingCards];

        this.notify();
    }

    moveCard(cardId, oldColumnId, newColumnId, newCardOrder) {
        let cardData;

        const oldCol = this.col(oldColumnId);
        if (oldCol) {
            const idx = oldCol.cards.findIndex((c) => c.id === cardId);
            if (idx !== -1) cardData = oldCol.cards.splice(idx, 1)[0];
        }

        const newCol = this.col(newColumnId);
        if (newCol && cardData) {
            cardData.updatedAt = new Date().toISOString();

            if (!newCol.cards.some((c) => c.id === cardId)) newCol.cards.push(cardData);

            const orderedCards = newCardOrder.map((id) => newCol.cards.find((c) => c.id === id)).filter(Boolean);
            const remainingCards = newCol.cards.filter((card) => !newCardOrder.includes(card.id));
            newCol.cards = [...orderedCards, ...remainingCards];
        }

        this.notify();
    }
}

export const store = new Store();