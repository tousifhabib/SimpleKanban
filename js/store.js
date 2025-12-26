import { loadFromLocalStorage, saveToLocalStorage } from './services/localStorageService.js';
import { generateId } from './utils/id.js';

const STORAGE_KEY = 'flexibleKanbanState';

const DEFAULT_LABELS = [
    { id: 'label-1', name: 'Bug', color: '#e53935' },
    { id: 'label-2', name: 'Feature', color: '#43a047' },
    { id: 'label-3', name: 'Urgent', color: '#ff9800' },
    { id: 'label-4', name: 'Review', color: '#8e24aa' }
];

const DEFAULT_STATE = {
    columns: [],
    labels: DEFAULT_LABELS
};

const newCard = (text) => ({
    id: generateId('card'),
    text,
    description: '',
    startDate: null,
    dueDate: null,
    completed: false,
    priority: 'none',
    labels: []
});

class Store {
    constructor() {
        const savedState = loadFromLocalStorage(STORAGE_KEY);
        this.state = savedState || structuredClone(DEFAULT_STATE);
        this.state.labels ||= structuredClone(DEFAULT_LABELS);

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

    col(columnId) {
        return this.state.columns.find((c) => c.id === columnId);
    }

    card(columnId, cardId) {
        return this.col(columnId)?.cards.find((c) => c.id === cardId);
    }

    getLabels() {
        return this.state.labels || [];
    }

    addLabel(name, color) {
        const newLabel = { id: generateId('label'), name, color };
        this.state.labels.push(newLabel);
        this.notify();
        return newLabel;
    }

    updateLabel(labelId, name, color) {
        const label = this.state.labels.find((l) => l.id === labelId);
        if (!label) return;
        label.name = name;
        label.color = color;
        this.notify();
    }

    removeLabel(labelId) {
        this.state.labels = this.state.labels.filter((l) => l.id !== labelId);
        this.state.columns.forEach((col) => {
            col.cards.forEach((card) => {
                if (card.labels) card.labels = card.labels.filter((id) => id !== labelId);
            });
        });
        this.notify();
    }

    addColumn(title) {
        this.state.columns.push({
            id: generateId('column'),
            title: title || 'New Column',
            cards: []
        });
        this.notify();
    }

    removeColumn(columnId) {
        this.state.columns = this.state.columns.filter((c) => c.id !== columnId);
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
        this.notify();
    }

    toggleCardComplete(columnId, cardId) {
        const card = this.card(columnId, cardId);
        if (!card) return;
        card.completed = !card.completed;
        this.notify();
    }

    getCard(cardId) {
        for (const col of this.state.columns) {
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

    reorderColumns(columnOrder) {
        this.state.columns = columnOrder.map((id) => this.state.columns.find((c) => c.id === id));
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
            if (!newCol.cards.some((c) => c.id === cardId)) newCol.cards.push(cardData);

            const orderedCards = newCardOrder.map((id) => newCol.cards.find((c) => c.id === id)).filter(Boolean);
            const remainingCards = newCol.cards.filter((card) => !newCardOrder.includes(card.id));
            newCol.cards = [...orderedCards, ...remainingCards];
        }

        this.notify();
    }
}

export const store = new Store();
