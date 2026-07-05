// Characterization suite 2: board/column/label structure and cascades.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { freshStore, stubDeterministicIds } from '../helpers/freshStore.js';
import { arbState } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

const labeledState = () => ({
  activeBoardId: 'board-1',
  boards: [
    {
      id: 'board-1',
      name: 'B1',
      columns: [
        {
          id: 'col-a',
          title: 'A',
          cards: [
            { id: 'card-1', text: 'one', labels: ['label-x', 'label-y'] },
            { id: 'card-2', text: 'two', labels: ['label-y'] },
          ],
        },
        {
          id: 'col-b',
          title: 'B',
          cards: [{ id: 'card-3', text: 'three', labels: ['label-x'] }],
        },
      ],
      labels: [
        { id: 'label-x', name: 'X', color: '#e53935' },
        { id: 'label-y', name: 'Y', color: '#43a047' },
      ],
    },
    {
      id: 'board-2',
      name: 'B2',
      columns: [],
      labels: [],
    },
  ],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  stubDeterministicIds();
});

describe('removeLabel cascade', () => {
  it('strips the label id from every card on the active board', async () => {
    const store = await freshStore(labeledState());
    store.removeLabel('label-y');

    expect(store.getLabels().map((l) => l.id)).toEqual(['label-x']);
    for (const col of store.getState().columns) {
      for (const card of col.cards) {
        expect(card.labels).not.toContain('label-y');
      }
    }
    // other label references untouched
    expect(store.getCard('card-1').card.labels).toEqual(['label-x']);
  });
});

describe('label CRUD', () => {
  it('addLabel appends; updateLabel renames/recolors in place', async () => {
    const store = await freshStore(labeledState());
    store.addLabel('Z', '#123456');
    const added = store.getLabels().at(-1);
    expect(added).toMatchObject({ name: 'Z', color: '#123456' });

    store.updateLabel(added.id, 'Z2', '#654321');
    expect(store.getLabels().at(-1)).toMatchObject({
      id: added.id,
      name: 'Z2',
      color: '#654321',
    });
  });
});

describe('dependency cascade + dedupe', () => {
  it('addCardDependency dedupes by target id (re-add replaces type)', async () => {
    const store = await freshStore(labeledState());
    store.addCardDependency('col-a', 'card-1', 'card-3', 'FS');
    store.addCardDependency('col-a', 'card-1', 'card-3', 'SS');
    expect(store.getCard('card-1').card.dependencies).toEqual([
      { id: 'card-3', type: 'SS' },
    ]);
  });

  it('removeCard strips dangling dependencies board-wide', async () => {
    const store = await freshStore(labeledState());
    store.addCardDependency('col-a', 'card-1', 'card-3', 'FS');
    store.addCardDependency('col-a', 'card-2', 'card-3', 'FF');
    store.removeCard('col-b', 'card-3');

    expect(store.getCard('card-1').card.dependencies).toEqual([]);
    expect(store.getCard('card-2').card.dependencies).toEqual([]);
  });
});

describe('board lifecycle', () => {
  it('deleteBoard refuses when it is the last board', async () => {
    const seed = labeledState();
    seed.boards = [seed.boards[0]];
    const store = await freshStore(seed);
    expect(store.deleteBoard('board-1')).toBe(false);
    expect(store.getBoards()).toHaveLength(1);
  });

  it('deleting the active board re-points activeBoardId at a survivor', async () => {
    const store = await freshStore(labeledState());
    expect(store.deleteBoard('board-1')).toBe(true);
    expect(store.getActiveBoardId()).toBe('board-2');
    expect(store.getBoards().map((b) => b.id)).toEqual(['board-2']);
  });

  it('createBoard switches to the new board and instantiates the template', async () => {
    const store = await freshStore(labeledState());
    store.createBoard('Fresh', 'basic');
    const active = store.activeBoard;
    expect(active.name).toBe('Fresh');
    expect(active.columns.map((c) => c.title)).toEqual([
      'To Do',
      'Doing',
      'Done',
    ]);
    expect(active.labels.length).toBeGreaterThan(0);
  });

  it('renameBoard trims whitespace', async () => {
    const store = await freshStore(labeledState());
    store.renameBoard('board-1', '  Trimmed  ');
    expect(store.getBoards().find((b) => b.id === 'board-1').name).toBe(
      'Trimmed'
    );
  });

  it('setActiveBoard ignores unknown ids', async () => {
    const store = await freshStore(labeledState());
    store.setActiveBoard('board-nope');
    expect(store.getActiveBoardId()).toBe('board-1');
    store.setActiveBoard('board-2');
    expect(store.getActiveBoardId()).toBe('board-2');
  });
});

describe('column ops', () => {
  it('addColumn defaults empty titles; updateColumnTitle renames', async () => {
    const store = await freshStore(labeledState());
    store.addColumn('');
    expect(store.getState().columns.at(-1).title).toBe('New Column');
    store.addColumn('Named');
    const named = store.getState().columns.at(-1);
    expect(named.title).toBe('Named');
    store.updateColumnTitle(named.id, 'Renamed');
    expect(store.getState().columns.at(-1).title).toBe('Renamed');
  });

  it('reorderColumns preserves omitted columns at the end (fixed: was deletion)', async () => {
    const store = await freshStore(labeledState());
    store.reorderColumns(['col-b', 'col-a']);
    expect(store.getState().columns.map((c) => c.id)).toEqual([
      'col-b',
      'col-a',
    ]);
    store.reorderColumns(['col-a']);
    expect(store.getState().columns.map((c) => c.id)).toEqual([
      'col-a',
      'col-b',
    ]);
  });

  it('removeColumn drops the column with its cards', async () => {
    const store = await freshStore(labeledState());
    store.removeColumn('col-a');
    expect(store.getState().columns.map((c) => c.id)).toEqual(['col-b']);
    expect(store.getCard('card-1')).toBeNull();
  });
});

describe('queries', () => {
  it('getAllCards flattens with column context', async () => {
    const store = await freshStore(labeledState());
    const all = store.getAllCards();
    expect(all).toHaveLength(3);
    expect(all[0]).toMatchObject({ columnId: 'col-a', columnTitle: 'A' });
  });

  it('getBoards defaults missing names to Untitled', async () => {
    const seed = labeledState();
    seed.boards[1].name = '';
    const store = await freshStore(seed);
    expect(store.getBoards()[1].name).toBe('Untitled');
  });

  it('property: activeBoardId always resolves to a real board after arbitrary deletes', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbState,
        fc.array(fc.nat(), { maxLength: 4 }),
        async (state, picks) => {
          const store = await freshStore(state);
          for (const p of picks) {
            const boards = store.getBoards();
            store.deleteBoard(boards[p % boards.length].id);
            const after = store.getBoards().map((b) => b.id);
            expect(after).toContain(store.getActiveBoardId());
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});
