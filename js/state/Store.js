import { createObservable } from '../core/Observable.js';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from '../data/LocalStorage.js';
import { generateId } from '../utils/idUtils.js';
import {
  createBoardFromTemplate,
  DEFAULT_TEMPLATE,
} from '../config/boardTemplates.js';

const STORAGE_KEY = 'flexibleKanbanState';
const SAVE_DEBOUNCE_MS = 150;

const createCard = (data = {}) => ({
  text: '',
  description: '',
  startDate: null,
  dueDate: null,
  completed: false,
  priority: 'none',
  labels: [],
  logs: [],
  dependencies: [],
  ...data,
  id: data.id || generateId('card'),
  effort: Number(data.effort) || 0,
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: data.updatedAt || new Date().toISOString(),
});

const createDeepProxy = (target, onChange) => {
  const handler = {
    get(t, p, r) {
      const v = Reflect.get(t, p, r);
      if (v && typeof v === 'object') return new Proxy(v, handler);
      return v;
    },
    set(t, p, v) {
      const success = Reflect.set(t, p, v);
      if (success) onChange();
      return success;
    },
    deleteProperty(t, p) {
      const success = Reflect.deleteProperty(t, p);
      if (success) onChange();
      return success;
    },
  };
  return new Proxy(target, handler);
};

class Store {
  #observable = createObservable();
  #state;
  #batchDepth = 0;
  #pendingNotify = false;
  #saveDebounceId = null;

  constructor() {
    this.#state = createDeepProxy(this.#load(), () => this.#scheduleUpdate());
  }

  #load() {
    const data = loadFromLocalStorage(STORAGE_KEY);
    if (!data) return this.#createDefault();

    const boards = (
      Array.isArray(data.columns)
        ? [
            {
              id: generateId('board'),
              name: 'My Board',
              columns: data.columns,
              labels: data.labels,
            },
          ]
        : data.boards
    ).map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({
        ...c,
        cards: c.cards.map((k) => createCard(k)),
      })),
    }));

    return { activeBoardId: data.activeBoardId ?? boards[0].id, boards };
  }

  #createDefault() {
    const id = generateId('board');
    const { columns, labels } = createBoardFromTemplate(DEFAULT_TEMPLATE);
    return {
      activeBoardId: id,
      boards: [{ id, name: 'My First Board', columns, labels }],
    };
  }

  #scheduleUpdate() {
    if (this.#batchDepth > 0) {
      this.#pendingNotify = true;
      return;
    }
    queueMicrotask(() => this.#observable.notify());
    clearTimeout(this.#saveDebounceId);
    this.#saveDebounceId = setTimeout(() => {
      saveToLocalStorage(STORAGE_KEY, structuredClone(this.#state));
    }, SAVE_DEBOUNCE_MS);
  }

  #batch(fn) {
    this.#batchDepth++;
    try {
      return fn();
    } finally {
      this.#batchDepth--;
      if (this.#batchDepth === 0 && this.#pendingNotify) {
        this.#pendingNotify = false;
        this.#scheduleUpdate();
      }
    }
  }

  #board() {
    return (
      this.#state.boards.find((b) => b?.id === this.#state.activeBoardId) ||
      this.#state.boards[0]
    );
  }

  #col(id) {
    return this.#board()?.columns.find((c) => c.id === id);
  }

  #mutate(fn) {
    return this.#batch(() => fn(this.#board()));
  }

  #remove(arr, id) {
    const idx = arr.findIndex((x) => x?.id === id);
    return idx > -1 ? arr.splice(idx, 1)[0] : null;
  }

  get state() {
    return this.#state;
  }
  get activeBoard() {
    return this.#board();
  }
  get activeBoardId() {
    return this.#state.activeBoardId;
  }

  subscribe(fn) {
    return this.#observable.subscribe(fn);
  }
  getState() {
    return this.#board();
  }

  getBoards() {
    return this.#state.boards
      .filter((b) => b?.id)
      .map(({ id, name }) => ({ id, name: name || 'Untitled' }));
  }

  getLabels() {
    return this.#board()?.labels ?? [];
  }
  getActiveBoardId() {
    return this.#state.activeBoardId;
  }

  getCard(id) {
    for (const col of this.#board().columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return { card, columnId: col.id };
    }
    return null;
  }

  getAllCards() {
    return this.#board().columns.flatMap((col) =>
      col.cards.map((card) => ({
        card,
        columnId: col.id,
        columnTitle: col.title,
      }))
    );
  }

  setActiveBoard(id) {
    if (this.#state.boards.some((b) => b?.id === id))
      this.#state.activeBoardId = id;
  }

  createBoard(name, type = DEFAULT_TEMPLATE) {
    this.#batch(() => {
      const id = generateId('board');
      const { columns, labels } = createBoardFromTemplate(type);
      this.#state.boards.push({
        id,
        name: name || 'New Board',
        columns,
        labels,
      });
      this.#state.activeBoardId = id;
    });
  }

  renameBoard(id, name) {
    const board = this.#state.boards.find((b) => b.id === id);
    if (board) board.name = name.trim();
  }

  deleteBoard(id) {
    if (this.#state.boards.length <= 1) return false;
    return this.#batch(() => {
      if (this.#state.activeBoardId === id) {
        this.#state.activeBoardId = this.#state.boards.find(
          (b) => b.id !== id
        ).id;
      }
      return !!this.#remove(this.#state.boards, id);
    });
  }

  importData(json) {
    try {
      saveToLocalStorage(STORAGE_KEY, JSON.parse(json));
      location.reload();
      return true;
    } catch {
      return false;
    }
  }

  addLabel(name, color) {
    this.#mutate((b) =>
      b.labels.push({ id: generateId('label'), name, color })
    );
  }

  updateLabel(id, name, color) {
    const label = this.getLabels().find((l) => l.id === id);
    if (label) Object.assign(label, { name, color });
  }

  removeLabel(id) {
    this.#mutate((b) => {
      this.#remove(b.labels, id);
      b.columns.forEach((col) =>
        col.cards.forEach((card) => {
          const idx = card.labels.indexOf(id);
          if (idx > -1) card.labels.splice(idx, 1);
        })
      );
    });
  }

  addColumn(title) {
    this.#mutate((b) =>
      b.columns.push({
        id: generateId('column'),
        title: title || 'New Column',
        cards: [],
      })
    );
  }

  removeColumn(id) {
    this.#mutate((b) => this.#remove(b.columns, id));
  }

  updateColumnTitle(id, title) {
    const col = this.#col(id);
    if (col) col.title = title;
  }

  addCard(colId, text) {
    const col = this.#col(colId);
    if (col) col.cards.push(createCard({ text }));
  }

  updateCardDetails(colId, id, updates) {
    const col = this.#col(colId);
    const card = col?.cards.find((x) => x.id === id);
    if (card) {
      Object.assign(card, updates);
      card.updatedAt = new Date().toISOString();
    }
  }

  toggleCardComplete(colId, id) {
    const res = this.getCard(id);
    if (res)
      this.updateCardDetails(colId, id, { completed: !res.card.completed });
  }

  removeCard(colId, id) {
    this.#mutate((b) => {
      b.columns.forEach((col) =>
        col.cards.forEach((card) => {
          if (card.dependencies?.includes(id)) {
            card.dependencies = card.dependencies.filter((d) => d !== id);
          }
        })
      );
      const col = this.#col(colId);
      if (col) this.#remove(col.cards, id);
    });
  }

  duplicateCard(colId, id) {
    return this.#batch(() => {
      const col = this.#col(colId);
      const original = col?.cards.find((c) => c.id === id);
      if (!original) return null;

      const clone = createCard({
        ...structuredClone(original),
        id: undefined,
        logs: [],
        dependencies: [],
        createdAt: undefined,
        updatedAt: undefined,
      });

      col.cards.splice(col.cards.indexOf(original) + 1, 0, clone);
      return clone;
    });
  }

  addCardLog(colId, id, text) {
    const res = this.getCard(id);
    if (!res) return;
    this.updateCardDetails(colId, id, {
      logs: [
        ...(res.card.logs || []),
        {
          id: generateId('log'),
          text,
          columnTitle: this.#col(colId).title,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  addCardDependency(colId, cardId, depId) {
    const res = this.getCard(cardId);
    if (res) {
      this.updateCardDetails(colId, cardId, {
        dependencies: [...new Set([...(res.card.dependencies || []), depId])],
      });
    }
  }

  removeCardDependency(colId, cardId, depId) {
    const res = this.getCard(cardId);
    if (res) {
      this.updateCardDetails(colId, cardId, {
        dependencies: (res.card.dependencies || []).filter((d) => d !== depId),
      });
    }
  }

  reorderColumns(ids) {
    this.#batch(() => {
      const b = this.#board();
      const map = new Map(b.columns.map((x) => [x.id, x]));
      b.columns = ids.map((id) => map.get(id)).filter(Boolean);
    });
  }

  reorderCards(colId, ids) {
    this.#batch(() => {
      const col = this.#col(colId);
      if (!col) return;
      const map = new Map(col.cards.map((x) => [x.id, x]));
      col.cards = ids.map((id) => map.get(id)).filter(Boolean);
    });
  }

  moveCard(id, oldColId, newColId, newOrder) {
    this.#batch(() => {
      const oldCol = this.#col(oldColId);
      const newCol = this.#col(newColId);
      if (!oldCol || !newCol) return;
      const card = this.#remove(oldCol.cards, id);
      if (!card) return;
      card.updatedAt = new Date().toISOString();
      newCol.cards.push(card);
      const map = new Map(newCol.cards.map((x) => [x.id, x]));
      newCol.cards = newOrder.map((cid) => map.get(cid)).filter(Boolean);
    });
  }
}

export const store = new Store();
