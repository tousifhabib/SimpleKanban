import Repository from './infrastructure/Repository.js';
import CardEntity from './core/entities/CardEntity.js';
import { generateId } from './utils/id.js';

const DEFAULT_LABELS = [
  { id: 'label-1', name: 'Bug', color: '#e53935' },
  { id: 'label-2', name: 'Feature', color: '#43a047' },
  { id: 'label-3', name: 'Urgent', color: '#ff9800' },
  { id: 'label-4', name: 'Review', color: '#8e24aa' },
];

const TEMPLATES = {
  basic: ['To Do', 'Doing', 'Done'],
  software: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
  sales: ['Lead', 'Contacted', 'Proposal', 'Closed'],
  empty: [],
};

class Store {
  constructor() {
    this.repository = new Repository();
    this.listeners = [];
    this.state = this.loadInitialState();

    this.subscribe((state) => this.repository.save(state));
  }

  loadInitialState() {
    const savedData = this.repository.load();
    if (savedData && Array.isArray(savedData.columns)) {
      const hydratedBoards = (
        savedData.boards || [
          {
            id: generateId('board'),
            name: 'My Board',
            columns: savedData.columns,
            labels: savedData.labels || DEFAULT_LABELS,
          },
        ]
      ).map((board) => ({
        ...board,
        columns: board.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) => new CardEntity(c)),
        })),
      }));

      return {
        activeBoardId: savedData.activeBoardId || hydratedBoards[0].id,
        boards: hydratedBoards,
      };
    } else if (savedData && savedData.boards) {
      savedData.boards.forEach((board) => {
        board.columns.forEach((col) => {
          col.cards = col.cards.map((c) => new CardEntity(c));
        });
      });
      return savedData;
    } else {
      return this.createDefaultState();
    }
  }

  createDefaultState() {
    const boardId = generateId('board');
    return {
      activeBoardId: boardId,
      boards: [
        {
          id: boardId,
          name: 'My First Board',
          columns: [],
          labels: structuredClone(DEFAULT_LABELS),
        },
      ],
    };
  }

  getState() {
    return this.getActiveBoard();
  }

  getActiveBoard() {
    return this.state.boards.find((b) => b.id === this.state.activeBoardId);
  }

  getActiveBoardId() {
    return this.state.activeBoardId;
  }

  getBoards() {
    return this.state.boards.map((b) => ({ id: b.id, name: b.name }));
  }

  getLabels() {
    return this.getState().labels || [];
  }

  getCard(cardId) {
    for (const col of this.getState().columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card) return { card, columnId: col.id };
    }
    return null;
  }

  col(columnId) {
    return this.getState().columns.find((c) => c.id === columnId);
  }

  card(columnId, cardId) {
    return this.col(columnId)?.cards.find((c) => c.id === cardId);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () =>
      (this.listeners = this.listeners.filter((l) => l !== listener));
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  setActiveBoard(boardId) {
    if (this.state.boards.some((b) => b.id === boardId)) {
      this.state.activeBoardId = boardId;
      this.notify();
    }
  }

  createBoard(name, templateType = 'basic') {
    const newId = generateId('board');
    const columns = (TEMPLATES[templateType] || TEMPLATES.basic).map(
      (title) => ({
        id: generateId('column'),
        title,
        cards: [],
      })
    );
    this.state.boards.push({
      id: newId,
      name: name || 'New Board',
      columns,
      labels: structuredClone(DEFAULT_LABELS),
    });
    this.state.activeBoardId = newId;
    this.notify();
  }

  renameBoard(boardId, name) {
    const board = this.state.boards.find((b) => b.id === boardId);
    if (!board) return;
    board.name = name.trim();
    this.notify();
  }

  deleteBoard(boardId) {
    if (this.state.boards.length <= 1) return false;
    const idx = this.state.boards.findIndex((b) => b.id === boardId);
    if (idx === -1) return false;

    const isActive = this.state.activeBoardId === boardId;
    this.state.boards.splice(idx, 1);
    if (isActive) this.state.activeBoardId = this.state.boards[0].id;

    this.notify();
    return true;
  }

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.repository.save(data);
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  }

  addLabel(name, color) {
    this.getState().labels.push({ id: generateId('label'), name, color });
    this.notify();
  }

  updateLabel(labelId, name, color) {
    const label = this.getLabels().find((l) => l.id === labelId);
    if (label) {
      label.name = name;
      label.color = color;
      this.notify();
    }
  }

  removeLabel(labelId) {
    const board = this.getState();
    board.labels = board.labels.filter((l) => l.id !== labelId);
    board.columns.forEach((col) => {
      col.cards.forEach((card) => {
        card.labels = card.labels.filter((id) => id !== labelId);
      });
    });
    this.notify();
  }

  addColumn(title) {
    this.getState().columns.push({
      id: generateId('column'),
      title: title || 'New Column',
      cards: [],
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
    if (col) {
      col.title = newTitle;
      this.notify();
    }
  }

  addCard(columnId, text) {
    const col = this.col(columnId);
    if (col) {
      col.cards.push(new CardEntity({ text }));
      this.notify();
    }
  }

  updateCardDetails(columnId, cardId, updates) {
    const card = this.card(columnId, cardId);
    if (card) {
      card.update(updates);
      this.notify();
    }
  }

  toggleCardComplete(columnId, cardId) {
    const card = this.card(columnId, cardId);
    if (card) {
      card.toggleComplete();
      this.notify();
    }
  }

  removeCard(columnId, cardId) {
    const col = this.col(columnId);
    if (col) {
      col.cards = col.cards.filter((c) => c.id !== cardId);
      this.notify();
    }
  }

  addCardLog(columnId, cardId, text) {
    const card = this.card(columnId, cardId);
    const col = this.col(columnId);
    if (card) {
      card.addLog(text, col ? col.title : null);
      this.notify();
    }
  }

  reorderColumns(columnIdList) {
    const board = this.getState();
    board.columns = columnIdList.map((id) =>
      board.columns.find((c) => c.id === id)
    );
    this.notify();
  }

  reorderCards(columnId, cardIdList) {
    const col = this.col(columnId);
    if (col) {
      const cardMap = new Map(col.cards.map((c) => [c.id, c]));
      col.cards = cardIdList.map((id) => cardMap.get(id)).filter(Boolean);
      this.notify();
    }
  }

  moveCard(cardId, oldColumnId, newColumnId, newCardOrder) {
    const oldCol = this.col(oldColumnId);
    const newCol = this.col(newColumnId);

    if (!oldCol || !newCol) return;

    const cardIndex = oldCol.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = oldCol.cards.splice(cardIndex, 1);

    card.touch();

    if (!newCol.cards.includes(card)) newCol.cards.push(card);

    const cardMap = new Map(newCol.cards.map((c) => [c.id, c]));
    newCol.cards = newCardOrder.map((id) => cardMap.get(id)).filter(Boolean);

    this.notify();
  }
}

export const store = new Store();
