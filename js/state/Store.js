import { createObservable } from '../core/Observable.js';
import Repository from '../data/Repository.js';
import CardEntity from '../entities/CardEntity.js';
import { generateId } from '../utils/idUtils.js';
import {
  createBoardFromTemplate,
  DEFAULT_TEMPLATE,
} from '../config/boardTemplates.js';

const serialize = (obj) => JSON.parse(JSON.stringify(obj));

const createDeepProxy = (target, onChange) => {
  const proxyCache = new WeakMap();
  const IS_PROXY = Symbol('isProxy');

  const proxify = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj[IS_PROXY]) return obj;

    if (proxyCache.has(obj)) return proxyCache.get(obj);

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== null && typeof value === 'object') {
        obj[key] = proxify(value);
      }
    }

    const proxy = new Proxy(obj, {
      get(t, p, receiver) {
        if (p === IS_PROXY) return true;
        return Reflect.get(t, p, receiver);
      },
      set(t, p, v) {
        if (v !== null && typeof v === 'object' && !proxyCache.has(v)) {
          t[p] = proxify(v);
        } else {
          t[p] = v;
        }
        onChange();
        return true;
      },
      deleteProperty(t, p) {
        delete t[p];
        onChange();
        return true;
      },
    });

    proxyCache.set(obj, proxy);
    return proxy;
  };

  return proxify(target);
};

class Store {
  #repo = new Repository();
  #observable = createObservable();
  #state;
  #batchDepth = 0;
  #pendingNotify = false;
  #saveDebounceId = null;
  #notifyScheduled = false;

  static SAVE_DEBOUNCE_MS = 150;

  constructor() {
    this.#state = createDeepProxy(this.#load(), () => this.#scheduleUpdate());
  }

  #load() {
    const data = this.#repo.load();
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
        cards: c.cards.map((k) => new CardEntity(k)),
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
    this.#queueNotify();
    this.#debounceSave();
  }

  #queueNotify() {
    if (this.#notifyScheduled) return;
    this.#notifyScheduled = true;
    queueMicrotask(() => {
      this.#notifyScheduled = false;
      this.#observable.notify();
    });
  }

  #debounceSave() {
    clearTimeout(this.#saveDebounceId);
    this.#saveDebounceId = setTimeout(() => {
      this.#repo.save(serialize(this.#state));
    }, Store.SAVE_DEBOUNCE_MS);
  }

  #flush() {
    if (this.#pendingNotify) {
      this.#pendingNotify = false;
      this.#queueNotify();
      this.#debounceSave();
    }
  }

  #batch(fn) {
    this.#batchDepth++;
    try {
      return fn();
    } finally {
      this.#batchDepth--;
      if (this.#batchDepth === 0) {
        this.#flush();
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
    if (this.#state.boards.some((b) => b?.id === id)) {
      this.#state.activeBoardId = id;
    }
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
      this.#repo.save(JSON.parse(json));
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
      for (const col of b.columns) {
        for (const card of col.cards) {
          const idx = card.labels.indexOf(id);
          if (idx > -1) card.labels.splice(idx, 1);
        }
      }
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
    if (col) col.cards.push(new CardEntity({ text }));
  }

  updateCardDetails(colId, id, updates) {
    const col = this.#col(colId);
    const card = col?.cards.find((x) => x.id === id);
    if (card) {
      this.#batch(() => {
        Object.assign(card, updates);
        card.updatedAt = new Date().toISOString();
      });
    }
  }

  toggleCardComplete(colId, id) {
    const result = this.getCard(id);
    if (result) {
      this.updateCardDetails(colId, id, { completed: !result.card.completed });
    }
  }

  removeCard(colId, id) {
    this.#mutate((b) => {
      for (const col of b.columns) {
        for (const card of col.cards) {
          if (card.dependencies?.includes(id)) {
            card.dependencies = card.dependencies.filter((d) => d !== id);
          }
        }
      }
      const col = this.#col(colId);
      if (col) this.#remove(col.cards, id);
    });
  }

  duplicateCard(colId, id) {
    return this.#batch(() => {
      const col = this.#col(colId);
      const original = col?.cards.find((c) => c.id === id);
      if (!original) return null;

      const clone = new CardEntity({
        ...serialize(original),
        id: undefined,
        logs: [],
        dependencies: [],
        createdAt: undefined,
        updatedAt: undefined,
      });

      const idx = col.cards.indexOf(original);
      col.cards.splice(idx + 1, 0, clone);
      return clone;
    });
  }

  addCardLog(colId, id, text) {
    const result = this.getCard(id);
    if (!result) return;

    const col = this.#col(colId);
    this.updateCardDetails(colId, id, {
      logs: [
        ...(result.card.logs || []),
        {
          id: generateId('log'),
          text,
          columnTitle: col.title,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  addCardDependency(colId, cardId, depId) {
    const result = this.getCard(cardId);
    if (!result) return;

    this.updateCardDetails(colId, cardId, {
      dependencies: [...new Set([...(result.card.dependencies || []), depId])],
    });
  }

  removeCardDependency(colId, cardId, depId) {
    const result = this.getCard(cardId);
    if (!result) return;

    this.updateCardDetails(colId, cardId, {
      dependencies: (result.card.dependencies || []).filter((d) => d !== depId),
    });
  }

  reorderColumns(ids) {
    this.#batch(() => {
      const board = this.#board();
      const map = new Map(board.columns.map((x) => [x.id, x]));
      board.columns = ids.map((id) => map.get(id)).filter(Boolean);
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
