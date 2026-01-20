import Repository from './infrastructure/Repository.js';
import CardEntity from './core/entities/CardEntity.js';
import { generateId } from './utils/id.js';
import {
  createBoardFromTemplate,
  DEFAULT_TEMPLATE,
} from './config/boardTemplates.js';

const createDeepProxy = (target, handler) => {
  if (target === null || typeof target !== 'object') return target;

  const wrap = (v) => createDeepProxy(v, handler);

  if (Array.isArray(target)) {
    target.forEach((v, i) => {
      target[i] = wrap(v);
    });
  } else if (target.constructor === Object) {
    Object.keys(target).forEach((k) => {
      target[k] = wrap(target[k]);
    });
  }

  return new Proxy(target, {
    set: (t, p, v) => {
      t[p] = wrap(v);
      handler();
      return true;
    },
    deleteProperty: (t, p) => {
      delete t[p];
      handler();
      return true;
    },
  });
};

const serialize = (obj) => JSON.parse(JSON.stringify(obj));

class Store {
  #repo = new Repository();
  #listeners = new Set();
  #state;

  constructor() {
    this.#state = createDeepProxy(this.#load(), () => this.#emit());
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
              labels: data.labels ?? createBoardFromTemplate().labels,
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

  #emit = () => {
    this.#repo.save(serialize(this.#state));
    this.#listeners.forEach((fn) => fn());
  };

  #board = () => {
    const board = this.#state.boards.find(
      (b) => b && b.id === this.#state.activeBoardId
    );
    return board || this.#state.boards[0];
  };

  #col = (id) => this.#board()?.columns.find((c) => c.id === id);

  #remove = (arr, id) => {
    const i = arr.findIndex((x) => x && x.id === id);
    return i > -1 ? arr.splice(i, 1)[0] : null;
  };

  #reorder = (arr, ids) => {
    const m = new Map(arr.filter((x) => x).map((x) => [x.id, x]));
    arr.length = 0;
    ids.forEach((id) => m.has(id) && arr.push(m.get(id)));
  };

  #updateCard(colId, cardId, fn) {
    const col = this.#col(colId);
    if (!col) return;
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      const card = col.cards[idx];
      fn(card);
      card.updatedAt = new Date().toISOString();
      col.cards[idx] = card;
    }
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

  getState = () => this.#board();

  getBoards = () =>
    this.#state.boards
      .filter((b) => b && b.id)
      .map(({ id, name }) => ({ id, name: name || 'Untitled Board' }));

  getLabels = () => this.#board()?.labels ?? [];

  getActiveBoardId = () => this.#state.activeBoardId;

  subscribe = (fn) => {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  };

  getCard(id) {
    const board = this.#board();
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return { card, columnId: col.id };
    }
    return null;
  }

  getAllCards() {
    const board = this.#board();
    const cards = [];
    board.columns.forEach((col) => {
      col.cards.forEach((card) => {
        cards.push({ card, columnId: col.id, columnTitle: col.title });
      });
    });
    return cards;
  }

  setActiveBoard = (id) => {
    if (this.#state.boards.some((b) => b && b.id === id)) {
      this.#state.activeBoardId = id;
    }
  };

  createBoard(name, type = DEFAULT_TEMPLATE) {
    const id = generateId('board');
    const { columns, labels } = createBoardFromTemplate(type);
    this.#state.boards.push({ id, name: name || 'New Board', columns, labels });
    this.#state.activeBoardId = id;
  }

  renameBoard(id, name) {
    const board = this.#state.boards.find((b) => b && b.id === id);
    if (board) board.name = name.trim();
  }

  deleteBoard(id) {
    if (this.#state.boards.length <= 1) return false;
    if (this.#state.activeBoardId === id) {
      const fallback = this.#state.boards.find((b) => b && b.id !== id);
      this.#state.activeBoardId = fallback.id;
    }
    return !!this.#remove(this.#state.boards, id);
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

  addLabel = (name, color) =>
    this.getLabels().push({ id: generateId('label'), name, color });

  updateLabel(id, name, color) {
    const label = this.getLabels().find((l) => l.id === id);
    if (label) Object.assign(label, { name, color });
  }

  removeLabel(id) {
    const board = this.#board();
    this.#remove(board.labels, id);
    board.columns.forEach((c) =>
      c.cards.forEach((k) => {
        const i = k.labels.indexOf(id);
        if (i > -1) k.labels.splice(i, 1);
      })
    );
  }

  addColumn = (title) =>
    this.#board().columns.push({
      id: generateId('column'),
      title: title || 'New Column',
      cards: [],
    });

  removeColumn = (id) => this.#remove(this.#board()?.columns ?? [], id);

  updateColumnTitle(id, title) {
    const col = this.#col(id);
    if (col) col.title = title;
  }

  addCard = (colId, text) =>
    this.#col(colId)?.cards.push(new CardEntity({ text }));

  updateCardDetails(colId, id, updates) {
    this.#updateCard(colId, id, (card) => Object.assign(card, updates));
  }

  toggleCardComplete(colId, id) {
    this.#updateCard(colId, id, (card) => {
      card.completed = !card.completed;
    });
  }

  removeCard = (colId, id) => {
    const board = this.#board();
    board.columns.forEach((col) => {
      col.cards.forEach((card) => {
        if (card.dependencies?.includes(id)) {
          card.dependencies = card.dependencies.filter((d) => d !== id);
        }
      });
    });
    return this.#remove(this.#col(colId)?.cards ?? [], id);
  };

  duplicateCard(colId, id) {
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
    col.cards.splice(col.cards.indexOf(original) + 1, 0, clone);
    return clone;
  }

  addCardLog(colId, id, text) {
    const col = this.#col(colId);
    this.#updateCard(colId, id, (card) => {
      card.logs.push({
        id: generateId('log'),
        text,
        columnTitle: col.title,
        createdAt: new Date().toISOString(),
      });
    });
  }

  addCardDependency(colId, cardId, dependencyId) {
    this.#updateCard(colId, cardId, (card) => {
      if (!card.dependencies) card.dependencies = [];
      if (!card.dependencies.includes(dependencyId)) {
        card.dependencies.push(dependencyId);
      }
    });
  }

  removeCardDependency(colId, cardId, dependencyId) {
    this.#updateCard(colId, cardId, (card) => {
      if (card.dependencies) {
        card.dependencies = card.dependencies.filter((d) => d !== dependencyId);
      }
    });
  }

  reorderColumns = (ids) => this.#reorder(this.#board()?.columns ?? [], ids);
  reorderCards = (colId, ids) =>
    this.#reorder(this.#col(colId)?.cards ?? [], ids);

  moveCard(id, oldColId, newColId, order) {
    const oldCol = this.#col(oldColId);
    const newCol = this.#col(newColId);
    const card = this.#remove(oldCol?.cards ?? [], id);
    if (card && newCol) {
      card.updatedAt = new Date().toISOString();
      newCol.cards.push(card);
      this.#reorder(newCol.cards, order);
    }
  }
}

export const store = new Store();
