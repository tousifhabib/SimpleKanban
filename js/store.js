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
  if (Array.isArray(target)) target.forEach((v, i) => (target[i] = wrap(v)));
  else Object.keys(target).forEach((k) => (target[k] = wrap(target[k])));
  return new Proxy(target, {
    set: (t, p, v) => ((t[p] = wrap(v)), handler(), true),
    deleteProperty: (t, p) => (delete t[p], handler(), true),
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

  #emit = () => (
    this.#repo.save(serialize(this.#state)),
    this.#listeners.forEach((fn) => fn())
  );
  #board = () =>
    this.#state.boards.find((b) => b.id === this.#state.activeBoardId);
  #col = (id) => this.#board()?.columns.find((c) => c.id === id);
  #card = (colId, cardId) =>
    this.#col(colId)?.cards.find((c) => c.id === cardId);
  #remove = (arr, id) => {
    const i = arr.findIndex((x) => x.id === id);
    return i > -1 ? arr.splice(i, 1)[0] : null;
  };
  #reorder = (arr, ids) => {
    const m = new Map(arr.map((x) => [x.id, x]));
    arr.length = 0;
    ids.forEach((id) => m.has(id) && arr.push(m.get(id)));
  };
  #touch = (card) => card && (card.updatedAt = new Date().toISOString());

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
  getBoards = () => this.#state.boards.map(({ id, name }) => ({ id, name }));
  getLabels = () => this.#board()?.labels ?? [];
  getActiveBoardId = () => this.#state.activeBoardId;
  subscribe = (fn) => (
    this.#listeners.add(fn),
    () => this.#listeners.delete(fn)
  );

  getCard(id) {
    for (const col of this.#board().columns) {
      const card = col.cards.find((c) => c.id === id);
      if (card) return { card, columnId: col.id };
    }
    return null;
  }

  setActiveBoard = (id) =>
    this.#state.boards.some((b) => b.id === id) &&
    (this.#state.activeBoardId = id);

  createBoard(name, type = DEFAULT_TEMPLATE) {
    const id = generateId('board');
    const { columns, labels } = createBoardFromTemplate(type);
    this.#state.boards.push({ id, name: name || 'New Board', columns, labels });
    this.#state.activeBoardId = id;
  }

  renameBoard(id, name) {
    const board = this.#state.boards.find((b) => b.id === id);
    if (board) board.name = name.trim();
  }

  deleteBoard(id) {
    if (this.#state.boards.length <= 1) return false;
    const removed = this.#remove(this.#state.boards, id);
    if (!removed) return false;
    if (this.#state.activeBoardId === id)
      this.#state.activeBoardId = this.#state.boards[0].id;
    return true;
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
  removeColumn = (id) => this.#remove(this.#board().columns, id);

  updateColumnTitle(id, title) {
    const col = this.#col(id);
    if (col) col.title = title;
  }

  addCard = (colId, text) =>
    this.#col(colId)?.cards.push(new CardEntity({ text }));

  updateCardDetails(colId, id, updates) {
    const card = this.#card(colId, id);
    if (card) {
      Object.assign(card, updates);
      this.#touch(card);
    }
  }

  toggleCardComplete(colId, id) {
    const card = this.#card(colId, id);
    if (card) {
      card.completed = !card.completed;
      this.#touch(card);
    }
  }

  removeCard = (colId, id) => this.#remove(this.#col(colId)?.cards ?? [], id);

  duplicateCard(colId, id) {
    const col = this.#col(colId);
    const original = col?.cards.find((c) => c.id === id);
    if (!original) return null;
    const clone = new CardEntity({
      ...serialize(original),
      id: undefined,
      logs: [],
      createdAt: undefined,
      updatedAt: undefined,
    });
    col.cards.splice(col.cards.indexOf(original) + 1, 0, clone);
    return clone;
  }

  addCardLog(colId, id, text) {
    const card = this.#card(colId, id);
    if (!card) return;
    card.logs.push({
      id: generateId('log'),
      text,
      columnTitle: this.#col(colId).title,
      createdAt: new Date().toISOString(),
    });
    this.#touch(card);
  }

  reorderColumns = (ids) => this.#reorder(this.#board().columns, ids);
  reorderCards = (colId, ids) =>
    this.#reorder(this.#col(colId)?.cards ?? [], ids);

  moveCard(id, oldColId, newColId, order) {
    const oldCol = this.#col(oldColId);
    const newCol = this.#col(newColId);
    const card = this.#remove(oldCol?.cards ?? [], id);
    if (card && newCol) {
      this.#touch(card);
      newCol.cards.push(card);
      this.#reorder(newCol.cards, order);
    }
  }
}

export const store = new Store();
