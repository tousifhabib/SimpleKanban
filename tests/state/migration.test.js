// Characterization suite 4: the legacy single-board -> multi-board
// migration performed on load.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  freshStore,
  stubDeterministicIds,
  savedState,
} from '../helpers/freshStore.js';
import { arbLegacyState } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  stubDeterministicIds();
});

describe('legacy shape lift', () => {
  it('wraps {columns, labels} into one board named "My Board"', async () => {
    const store = await freshStore({
      columns: [
        { id: 'c1', title: 'Todo', cards: [{ id: 'k1', text: 'legacy card' }] },
      ],
      labels: [{ id: 'l1', name: 'L', color: '#fff' }],
    });

    const boards = store.getBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe('My Board');
    expect(store.getActiveBoardId()).toBe(boards[0].id);

    const board = store.getState();
    expect(board.columns.map((c) => c.id)).toEqual(['c1']);
    expect(store.getLabels()).toEqual([{ id: 'l1', name: 'L', color: '#fff' }]);

    // legacy cards get full normalization
    const card = board.columns[0].cards[0];
    expect(card).toMatchObject({
      id: 'k1',
      text: 'legacy card',
      priority: 'none',
      logs: [],
      dependencies: [],
      effort: 0,
    });
  });

  it('property: migration is idempotent (load-save-load-save fixpoint)', async () => {
    await fc.assert(
      fc.asyncProperty(arbLegacyState, async (legacy) => {
        const store1 = await freshStore(legacy);
        store1.renameBoard(store1.getActiveBoardId(), 'touch');
        vi.advanceTimersByTime(200);
        const once = savedState();

        const store2 = await freshStore(once);
        store2.renameBoard(store2.getActiveBoardId(), 'touch');
        vi.advanceTimersByTime(200);
        const twice = savedState();

        // shape is stable modulo the freshly generated board id
        expect({
          ...twice,
          boards: twice.boards.map((b) => ({ ...b, id: 'X' })),
          activeBoardId: 'X',
        }).toEqual({
          ...once,
          boards: once.boards.map((b) => ({ ...b, id: 'X' })),
          activeBoardId: 'X',
        });
      }),
      { numRuns: 10 }
    );
  });
});

describe('modern shape', () => {
  it('passes through with activeBoardId preserved', async () => {
    const store = await freshStore({
      activeBoardId: 'b2',
      boards: [
        { id: 'b1', name: 'One', columns: [], labels: [] },
        { id: 'b2', name: 'Two', columns: [], labels: [] },
      ],
    });
    expect(store.getActiveBoardId()).toBe('b2');
    expect(store.getBoards().map((b) => b.name)).toEqual(['One', 'Two']);
  });

  it('missing activeBoardId defaults to the first board', async () => {
    const store = await freshStore({
      boards: [
        { id: 'b1', name: 'One', columns: [], labels: [] },
        { id: 'b2', name: 'Two', columns: [], labels: [] },
      ],
    });
    expect(store.getActiveBoardId()).toBe('b1');
  });
});

describe('empty storage', () => {
  it('creates the default board from the basic template', async () => {
    const store = await freshStore(null);
    const boards = store.getBoards();
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe('My First Board');
    expect(store.getState().columns.map((c) => c.title)).toEqual([
      'To Do',
      'Doing',
      'Done',
    ]);
    expect(store.getLabels().length).toBeGreaterThan(0);
  });
});
