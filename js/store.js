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
    const h = {
      get: (t, p) =>
        typeof t[p] === 'object' && t[p] !== null ? new Proxy(t[p], h) : t[p],
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
    };
    this.state = new Proxy(this.loadState(), h);
  }

  loadState() {
    const d = this.repo.load();
    if (!d) return this.createDefaultState();
    const b = (
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
    ).map((x) => ({
      ...x,
      columns: x.columns.map((c) => ({
        ...c,
        cards: c.cards.map((k) => new CardEntity(k)),
      })),
    }));
    return { activeBoardId: d.activeBoardId || b[0].id, boards: b };
  }

  createDefaultState() {
    const id = generateId('board'),
      { columns, labels } = createBoardFromTemplate(DEFAULT_TEMPLATE);
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
      const k = c.cards.find((x) => x.id === id);
      if (k) return { card: k, columnId: c.id };
    }
  }
  card(colId, id) {
    return this.col(colId)?.cards.find((k) => k.id === id);
  }

  setActiveBoard(id) {
    if (this.state.boards.some((b) => b.id === id))
      this.state.activeBoardId = id;
  }
  createBoard(n, t = DEFAULT_TEMPLATE) {
    const id = generateId('board'),
      { columns, labels } = createBoardFromTemplate(t);
    this.state.boards.push({ id, name: n || 'New Board', columns, labels });
    this.state.activeBoardId = id;
  }
  renameBoard(id, n) {
    const b = this.state.boards.find((x) => x.id === id);
    if (b) b.name = n.trim();
  }
  deleteBoard(id) {
    const i = this.state.boards.findIndex((x) => x.id === id);
    if (this.state.boards.length <= 1 || i === -1) return false;
    const active = this.activeBoardId === id;
    this.state.boards.splice(i, 1);
    if (active) this.state.activeBoardId = this.state.boards[0].id;
    return true;
  }

  importData(j) {
    try {
      this.repo.save(JSON.parse(j));
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  }

  addLabel(n, c) {
    this.getLabels().push({ id: generateId('label'), name: n, color: c });
  }
  updateLabel(id, n, c) {
    Object.assign(this.getLabels().find((l) => l.id === id) || {}, {
      name: n,
      color: c,
    });
  }
  removeLabel(id) {
    this.activeBoard.labels = this.activeBoard.labels.filter(
      (l) => l.id !== id
    );
    this.activeBoard.columns.forEach((c) =>
      c.cards.forEach((k) => (k.labels = k.labels.filter((l) => l !== id)))
    );
  }

  addColumn(t) {
    this.activeBoard.columns.push({
      id: generateId('column'),
      title: t || 'New Column',
      cards: [],
    });
  }
  removeColumn(id) {
    this.activeBoard.columns = this.activeBoard.columns.filter(
      (c) => c.id !== id
    );
  }
  updateColumnTitle(id, t) {
    const c = this.col(id);
    if (c) c.title = t;
  }

  addCard(colId, t) {
    this.col(colId)?.cards.push(new CardEntity({ text: t }));
  }
  updateCardDetails(colId, id, u) {
    this.card(colId, id)?.update(u);
  }
  toggleCardComplete(colId, id) {
    this.card(colId, id)?.toggleComplete();
  }
  removeCard(colId, id) {
    const c = this.col(colId);
    if (c) c.cards = c.cards.filter((k) => k.id !== id);
  }
  duplicateCard(colId, id) {
    const c = this.col(colId),
      o = this.card(colId, id);
    if (!c || !o) return null;
    const k = new CardEntity({
      ...o,
      id: undefined,
      logs: [],
      createdAt: undefined,
      updatedAt: undefined,
    });
    c.cards.splice(c.cards.indexOf(o) + 1, 0, k);
    return k;
  }
  addCardLog(colId, id, t) {
    this.card(colId, id)?.addLog(t, this.col(colId)?.title);
  }

  reorderColumns(ids) {
    this.activeBoard.columns = ids.map((id) => this.col(id)).filter(Boolean);
  }
  reorderCards(colId, ids) {
    const c = this.col(colId);
    if (c)
      c.cards = ids
        .map((id) => c.cards.find((k) => k.id === id))
        .filter(Boolean);
  }
  moveCard(id, oldId, newId, order) {
    const oC = this.col(oldId),
      nC = this.col(newId),
      i = oC?.cards.findIndex((k) => k.id === id);
    if (i > -1 && nC) {
      const [k] = oC.cards.splice(i, 1);
      k.touch();
      nC.cards = order
        .map((x) => (x === id ? k : nC.cards.find((y) => y.id === x)))
        .filter(Boolean);
    }
  }
}
export const store = new Store();
