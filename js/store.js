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
    this.state = new Proxy(this.loadState(), {
      set: (t, p, v) => {
        t[p] = v;
        this.emit();
        return true;
      },
      deleteProperty: (t, p) => {
        delete t[p];
        this.emit();
        return true;
      },
    });
  }

  loadState() {
    const d = this.repo.load();
    if (!d) return this.createDefaultState();
    const boards = (
      Array.isArray(d.columns)
        ? [
            {
              id: generateId('board'),
              name: 'My Board',
              columns: d.columns,
              labels: d.labels || createBoardFromTemplate().labels,
            },
          ]
        : d.boards
    ).map((b) => ({
      ...b,
      columns: b.columns.map((c) => ({
        ...c,
        cards: c.cards.map((k) => new CardEntity(k)),
      })),
    }));
    return { activeBoardId: d.activeBoardId || boards[0].id, boards };
  }

  createDefaultState() {
    const id = generateId('board');
    const { columns, labels } = createBoardFromTemplate(DEFAULT_TEMPLATE);
    return {
      activeBoardId: id,
      boards: [{ id, name: 'My First Board', columns, labels }],
    };
  }

  emit() {
    this.repo.save(this.state);
    this.listeners.forEach((l) => l(this.state));
  }

  subscribe(f) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  get activeBoard() {
    return this.state.boards.find((b) => b.id === this.state.activeBoardId);
  }
  get activeBoardId() {
    return this.state.activeBoardId;
  }
  getState() {
    return this.activeBoard;
  }
  getBoards() {
    return this.state.boards.map(({ id, name }) => ({ id, name }));
  }
  getLabels() {
    return this.activeBoard.labels || [];
  }

  col(id) {
    return this.activeBoard.columns.find((c) => c.id === id);
  }

  getCard(id) {
    for (const c of this.activeBoard.columns) {
      const card = c.cards.find((x) => x.id === id);
      if (card) return { card, columnId: c.id };
    }
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
    const b = this.state.boards.find((x) => x.id === id);
    if (b) b.name = name.trim();
  }

  deleteBoard(id) {
    if (this.state.boards.length <= 1) return false;
    const idx = this.state.boards.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    const active = this.activeBoardId === id;
    this.state.boards.splice(idx, 1);
    if (active) this.state.activeBoardId = this.state.boards[0].id;
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

  _update(arr, id, fn) {
    const item = arr.find((x) => x.id === id);
    if (item) fn(item);
  }
  _remove(arr, id) {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx > -1) arr.splice(idx, 1);
  }

  addLabel(name, color) {
    this.getLabels().push({ id: generateId('label'), name, color });
  }
  updateLabel(id, name, color) {
    this._update(this.getLabels(), id, (l) =>
      Object.assign(l, { name, color })
    );
  }
  removeLabel(id) {
    this._remove(this.activeBoard.labels, id);
    this.activeBoard.columns.forEach((c) =>
      c.cards.forEach((k) => (k.labels = k.labels.filter((l) => l !== id)))
    );
  }

  addColumn(title) {
    this.activeBoard.columns.push({
      id: generateId('column'),
      title: title || 'New Column',
      cards: [],
    });
  }
  removeColumn(id) {
    this._remove(this.activeBoard.columns, id);
  }
  updateColumnTitle(id, title) {
    this._update(this.activeBoard.columns, id, (c) => (c.title = title));
  }

  addCard(colId, text) {
    this.col(colId)?.cards.push(new CardEntity({ text }));
  }
  updateCardDetails(colId, id, updates) {
    this._update(this.col(colId)?.cards || [], id, (c) => c.update(updates));
  }
  toggleCardComplete(colId, id) {
    this._update(this.col(colId)?.cards || [], id, (c) => c.toggleComplete());
  }
  removeCard(colId, id) {
    const c = this.col(colId);
    if (c) c.cards = c.cards.filter((k) => k.id !== id);
  }

  duplicateCard(colId, id) {
    const c = this.col(colId),
      original = c?.cards.find((k) => k.id === id);
    if (!original) return null;
    const clone = new CardEntity({
      ...original,
      id: undefined,
      logs: [],
      createdAt: undefined,
      updatedAt: undefined,
    });
    c.cards.splice(c.cards.indexOf(original) + 1, 0, clone);
    return clone;
  }

  addCardLog(colId, id, text) {
    this._update(this.col(colId)?.cards || [], id, (c) =>
      c.addLog(text, this.col(colId)?.title)
    );
  }

  reorderColumns(ids) {
    const map = new Map(this.activeBoard.columns.map((c) => [c.id, c]));
    this.activeBoard.columns = ids.map((id) => map.get(id)).filter(Boolean);
  }

  reorderCards(colId, ids) {
    const c = this.col(colId);
    if (!c) return;
    const map = new Map(c.cards.map((k) => [k.id, k]));
    c.cards = ids.map((id) => map.get(id)).filter(Boolean);
  }

  moveCard(id, oldId, newId, order) {
    const oC = this.col(oldId),
      nC = this.col(newId);
    const idx = oC?.cards.findIndex((k) => k.id === id);
    if (idx > -1 && nC) {
      const [card] = oC.cards.splice(idx, 1);
      card.touch();
      const map = new Map(nC.cards.concat(card).map((k) => [k.id, k]));
      nC.cards = order.map((x) => map.get(x)).filter(Boolean);
    }
  }
}

export const store = new Store();
