import { saveToLocalStorage, loadFromLocalStorage } from './services/localStorageService.js';

const STORAGE_KEY = 'flexibleKanbanState';

class Store {
    constructor() {
        const savedState = loadFromLocalStorage(STORAGE_KEY);
        this.state = savedState || { columns: [] };
        this.listeners = [];

        this.subscribe((state) => {
            saveToLocalStorage(STORAGE_KEY, state);
        });
    }

    getState() {
        return this.state;
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

    // ----------
    // Actions on State
    // ----------

    addColumn(title) {
        this.state.columns.push({
            id: this.generateId('column'),
            title: title || 'New Column',
            cards: [],
        });
        this.notify();
    }

    removeColumn(columnId) {
        this.state.columns = this.state.columns.filter((c) => c.id !== columnId);
        this.notify();
    }

    updateColumnTitle(columnId, newTitle) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (col) {
            col.title = newTitle;
            this.notify();
        }
    }

    addCard(columnId, text) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        col.cards.push({
            id: this.generateId('card'),
            text,
        });
        this.notify();
    }

    updateCard(columnId, cardId, newText) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        const card = col.cards.find((c) => c.id === cardId);
        if (card) {
            card.text = newText;
            this.notify();
        }
    }

    removeCard(columnId, cardId) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        col.cards = col.cards.filter((c) => c.id !== cardId);
        this.notify();
    }

    reorderColumns(columnOrder) {
        const newColumns = columnOrder.map((id) =>
            this.state.columns.find((c) => c.id === id)
        );
        this.state.columns = newColumns;
        this.notify();
    }

    reorderCards(columnId, cardOrder) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;

        const newCards = cardOrder
            .map(id => col.cards.find(card => card.id === id))
            .filter(Boolean);

        const missingCards = col.cards.filter(card => !cardOrder.includes(card.id));
        col.cards = [...newCards, ...missingCards];

        this.notify();
    }

    moveCard(cardId, oldColumnId, newColumnId, newCardOrder) {
        let cardData;
        const oldCol = this.state.columns.find(c => c.id === oldColumnId);
        if (oldCol) {
            const idx = oldCol.cards.findIndex(c => c.id === cardId);
            if (idx !== -1) {
                cardData = oldCol.cards.splice(idx, 1)[0];
            }
        }
        const newCol = this.state.columns.find(c => c.id === newColumnId);
        if (newCol && cardData) {
            if (!newCol.cards.some(c => c.id === cardId)) {
                newCol.cards.push(cardData);
            }
            const newCards = newCardOrder
                .map(id => newCol.cards.find(c => c.id === id))
                .filter(Boolean);
            newCol.cards = newCards;
        }
        this.notify();
    }

    // ----------
    // Utility
    // ----------

    generateId(prefix) {
        return (
            prefix +
            '-' +
            Math.random().toString(36).substr(2, 9)
        );
    }
}

export const store = new Store();
