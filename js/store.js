import {loadFromLocalStorage, saveToLocalStorage} from './services/localStorageService.js';

const STORAGE_KEY = 'flexibleKanbanState';

class Store {
    constructor() {
        const savedState = loadFromLocalStorage(STORAGE_KEY);
        this.state = savedState || {
            columns: [],
            labels: [
                { id: 'label-1', name: 'Bug', color: '#e53935' },
                { id: 'label-2', name: 'Feature', color: '#43a047' },
                { id: 'label-3', name: 'Urgent', color: '#ff9800' },
                { id: 'label-4', name: 'Review', color: '#8e24aa' }
            ]
        };

        if (!this.state.labels) {
            this.state.labels = [
                { id: 'label-1', name: 'Bug', color: '#e53935' },
                { id: 'label-2', name: 'Feature', color: '#43a047' },
                { id: 'label-3', name: 'Urgent', color: '#ff9800' },
                { id: 'label-4', name: 'Review', color: '#8e24aa' }
            ];
        }

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

    getLabels() {
        return this.state.labels || [];
    }

    addLabel(name, color) {
        const newLabel = {
            id: this.generateId('label'),
            name,
            color
        };
        this.state.labels.push(newLabel);
        this.notify();
        return newLabel;
    }

    updateLabel(labelId, name, color) {
        const label = this.state.labels.find(l => l.id === labelId);
        if (label) {
            label.name = name;
            label.color = color;
            this.notify();
        }
    }

    removeLabel(labelId) {
        this.state.labels = this.state.labels.filter(l => l.id !== labelId);
        this.state.columns.forEach(col => {
            col.cards.forEach(card => {
                if (card.labels) {
                    card.labels = card.labels.filter(id => id !== labelId);
                }
            });
        });
        this.notify();
    }

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
            description: '',
            startDate: null,
            dueDate: null,
            completed: false,
            priority: 'none',
            labels: []
        });
        this.notify();
    }

    updateCardDetails(columnId, cardId, updates) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        const card = col.cards.find((c) => c.id === cardId);
        if (card) {
            if (updates.text !== undefined) card.text = updates.text;
            if (updates.description !== undefined) card.description = updates.description;
            if (updates.startDate !== undefined) card.startDate = updates.startDate;
            if (updates.dueDate !== undefined) card.dueDate = updates.dueDate;
            if (updates.completed !== undefined) card.completed = updates.completed;
            if (updates.priority !== undefined) card.priority = updates.priority;
            if (updates.labels !== undefined) card.labels = updates.labels;
            this.notify();
        }
    }

    toggleCardComplete(columnId, cardId) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        const card = col.cards.find((c) => c.id === cardId);
        if (card) {
            card.completed = !card.completed;
            this.notify();
        }
    }

    getCard(cardId) {
        for (const col of this.state.columns) {
            const card = col.cards.find(c => c.id === cardId);
            if (card) {
                return {card, columnId: col.id};
            }
        }
        return null;
    }

    removeCard(columnId, cardId) {
        const col = this.state.columns.find((c) => c.id === columnId);
        if (!col) return;
        col.cards = col.cards.filter((c) => c.id !== cardId);
        this.notify();
    }

    reorderColumns(columnOrder) {
        this.state.columns = columnOrder.map((id) =>
            this.state.columns.find((c) => c.id === id)
        );
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

            const orderedCards = newCardOrder
                .map(id => newCol.cards.find(c => c.id === id))
                .filter(Boolean);
            const remainingCards = newCol.cards.filter(card => !newCardOrder.includes(card.id));
            newCol.cards = [...orderedCards, ...remainingCards];
        }
        this.notify();
    }

    generateId(prefix) {
        return (
            prefix +
            '-' +
            Math.random().toString(36).slice(2, 11)
        );
    }
}

export const store = new Store();