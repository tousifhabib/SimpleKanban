import Repository from './infrastructure/Repository.js';
import CardEntity from './core/entities/CardEntity.js';
import { generateId } from './utils/id.js';
import {
  createBoardFromTemplate,
  DEFAULT_TEMPLATE,
} from './config/boardTemplates.js';

export class Store {
  constructor() {
    this.repo = new Repository();
    this.listeners = new Set();

    const handler = {
      get: (target, prop, receiver) => {
        const val = Reflect.get(target, prop, receiver);
        return typeof val === 'object' && val !== null
          ? new Proxy(val, handler)
          : val;
      },
      set: (target, prop, val, receiver) => {
        const res = Reflect.set(target, prop, val, receiver);
        this.emit();
        return res;
      },
      deleteProperty: (target, prop) => {
        const res = Reflect.deleteProperty(target, prop);
        this.emit();
        return res;
      },
    };

    this.state = new Proxy(this.loadState(), handler);
  }

  loadState() {
    const data = this.repo.load();
    if (!data) return this.createDefaultState();

    const boards = (
      Array.isArray(data.columns)
        ? [
            {
              id: generateId('board'),
              name: 'My Board',
              columns: data.columns,
              labels: data.labels || createBoardFromTemplate().labels,
            },
          ]
        : data.boards
    ).map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({
        ...c,
        cards: c.cards.map((card) => new CardEntity(card)),
      })),
    }));

    return { activeBoardId: data.activeBoardId || boards[0].id, boards };
  }

  createDefaultState() {
    const bId = generateId('board');
    const { columns, labels } = createBoardFromTemplate(DEFAULT_TEMPLATE);
    return {
      activeBoardId: bId,
      boards: [{ id: bId, name: 'My First Board', columns, labels }],
    };
  }

  emit() {
    this.repo.save(this.state);
    this.listeners.forEach((l) => l(this.state));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
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
    return this.state.boards.map(({ id, name }) => ({ id, name }));
  }
  getLabels() {
    return this.getState().labels || [];
  }

  col(id) {
    return this.getState().columns.find((c) => c.id === id);
  }
  getCard(id) {
    for (const col of this.getState().columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return { card, columnId: col.id };
    }
    return null;
  }
  card(colId, cardId) {
    return this.col(colId)?.cards.find((c) => c.id === cardId);
  }

  setActiveBoard(id) {
    if (this.state.boards.some((b) => b.id === id))
      this.state.activeBoardId = id;
  }

  createBoard(name, type = DEFAULT_TEMPLATE) {
    const id = generateId('board');
    const { columns, labels } = createBoardFromTemplate(type);
    this.state.boards.push({ id, name: name || 'New Board', columns, labels });
    this.state.activeBoardId = id;
  }

  renameBoard(id, name) {
    const b = this.state.boards.find((b) => b.id === id);
    if (b) b.name = name.trim();
  }

  deleteBoard(id) {
    if (this.state.boards.length <= 1) return false;
    const idx = this.state.boards.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    const isActive = this.state.activeBoardId === id;
    this.state.boards.splice(idx, 1);
    if (isActive) this.state.activeBoardId = this.state.boards[0].id;
    return true;
  }

  importData(json) {
    try {
      this.repo.save(JSON.parse(json));
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  }

  addLabel(name, color) {
    this.getLabels().push({ id: generateId('label'), name, color });
  }

  updateLabel(id, name, color) {
    const l = this.getLabels().find((l) => l.id === id);
    if (l) Object.assign(l, { name, color });
  }

  removeLabel(id) {
    const b = this.getState();
    b.labels = b.labels.filter((l) => l.id !== id);
    b.columns.forEach((c) =>
      c.cards.forEach(
        (card) => (card.labels = card.labels.filter((l) => l !== id))
      )
    );
  }

  addColumn(title) {
    this.getState().columns.push({
      id: generateId('column'),
      title: title || 'New Column',
      cards: [],
    });
  }

  removeColumn(id) {
    const b = this.getState();
    b.columns = b.columns.filter((c) => c.id !== id);
  }

  updateColumnTitle(id, title) {
    const c = this.col(id);
    if (c) c.title = title;
  }

  addCard(colId, text) {
    this.col(colId)?.cards.push(new CardEntity({ text }));
  }

  updateCardDetails(colId, cardId, updates) {
    this.card(colId, cardId)?.update(updates);
  }

  toggleCardComplete(colId, cardId) {
    this.card(colId, cardId)?.toggleComplete();
  }

  removeCard(colId, cardId) {
    const c = this.col(colId);
    if (c) c.cards = c.cards.filter((x) => x.id !== cardId);
  }

  duplicateCard(colId, cardId) {
    const col = this.col(colId);
    const origin = this.card(colId, cardId);
    if (!col || !origin) return null;

    const copy = new CardEntity({
      ...origin,
      id: undefined,
      logs: [],
      createdAt: undefined,
      updatedAt: undefined,
    });
    col.cards.splice(col.cards.indexOf(origin) + 1, 0, copy);
    return copy;
  }

  addCardLog(colId, cardId, text) {
    this.card(colId, cardId)?.addLog(text, this.col(colId)?.title);
  }

  reorderColumns(ids) {
    const b = this.getState();
    b.columns = ids.map((id) => b.columns.find((c) => c.id === id));
  }

  reorderCards(colId, ids) {
    const col = this.col(colId);
    if (col) {
      const map = new Map(col.cards.map((c) => [c.id, c]));
      col.cards = ids.map((id) => map.get(id)).filter(Boolean);
    }
  }

  moveCard(cId, oldColId, newColId, newOrder) {
    const oldCol = this.col(oldColId);
    const newCol = this.col(newColId);
    if (!oldCol || !newCol) return;

    const idx = oldCol.cards.findIndex((c) => c.id === cId);
    if (idx === -1) return;

    const [card] = oldCol.cards.splice(idx, 1);
    card.touch();
    if (!newCol.cards.includes(card)) newCol.cards.push(card);

    const map = new Map(newCol.cards.map((c) => [c.id, c]));
    newCol.cards = newOrder.map((id) => map.get(id)).filter(Boolean);
  }
}

export const store = new Store();
