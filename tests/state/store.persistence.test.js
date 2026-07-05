// Characterization suite 3: notification and persistence timing — the
// debounce/microtask contract the views and storage rely on.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  freshStore,
  stubDeterministicIds,
  savedState,
  STORAGE_KEY,
} from '../helpers/freshStore.js';
import { arbState } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

const seedState = () => ({
  activeBoardId: 'board-1',
  boards: [
    {
      id: 'board-1',
      name: 'B',
      columns: [
        {
          id: 'col-a',
          title: 'A',
          cards: [
            {
              id: 'card-1',
              text: 'one',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        },
      ],
      labels: [],
    },
  ],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllTimers(); // drop pending debounced saves from prior tests
  vi.setSystemTime(NOW);
  stubDeterministicIds();
});

const flush = async () => {
  // drain queued microtasks
  await Promise.resolve();
  await Promise.resolve();
};

describe('subscriber notification', () => {
  it('notifies at least once per mutation, coalesced within a microtask flush', async () => {
    const store = await freshStore(seedState());
    const spy = vi.fn();
    store.subscribe(spy);

    store.addCard('col-a', 'new');
    await flush();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('subscription returns a working unsubscribe', async () => {
    const store = await freshStore(seedState());
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    unsub();
    store.addCard('col-a', 'new');
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });

  it('every mutating method notifies (table-driven)', async () => {
    const ops = [
      (s) => s.addCard('col-a', 'x'),
      (s) => s.updateCardDetails('col-a', 'card-1', { text: 'y' }),
      (s) => s.toggleCardComplete('col-a', 'card-1'),
      (s) => s.removeCard('col-a', 'card-1'),
      (s) => s.addColumn('C'),
      (s) => s.updateColumnTitle('col-a', 'A2'),
      (s) => s.removeColumn('col-a'),
      (s) => s.addLabel('L', '#fff'),
      (s) => s.renameBoard('board-1', 'B2'),
      (s) => s.createBoard('B3', 'empty'),
      (s) => s.reorderCards('col-a', ['card-1']),
      (s) => s.reorderColumns(['col-a']),
    ];
    for (const op of ops) {
      const store = await freshStore(seedState());
      const spy = vi.fn();
      store.subscribe(spy);
      op(store);
      await flush();
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('save debounce (150ms)', () => {
  it('does not save before the window closes and saves once after', async () => {
    const store = await freshStore(seedState());
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    store.addCard('col-a', 'debounced');
    vi.advanceTimersByTime(149);
    expect(setItem).not.toHaveBeenCalledWith(STORAGE_KEY, expect.anything());

    vi.advanceTimersByTime(1);
    const saves = setItem.mock.calls.filter(([k]) => k === STORAGE_KEY);
    expect(saves).toHaveLength(1);
  });

  it('rapid mutations coalesce into one save containing the final state', async () => {
    const store = await freshStore(seedState());
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    store.addCard('col-a', 'first');
    vi.advanceTimersByTime(100);
    store.addCard('col-a', 'second');
    vi.advanceTimersByTime(100);
    store.addCard('col-a', 'third');
    vi.advanceTimersByTime(150);

    const saves = setItem.mock.calls.filter(([k]) => k === STORAGE_KEY);
    expect(saves).toHaveLength(1);
    const texts = JSON.parse(saves[0][1]).boards[0].columns[0].cards.map(
      (c) => c.text
    );
    expect(texts).toEqual(['one', 'first', 'second', 'third']);
  });
});

describe('persisted shape', () => {
  it('golden: saved JSON is plain data with normalized cards (schema freeze)', async () => {
    const store = await freshStore(seedState());
    store.updateCardDetails('col-a', 'card-1', { priority: 'high' });
    vi.advanceTimersByTime(200);

    expect(savedState()).toEqual({
      activeBoardId: 'board-1',
      boards: [
        {
          id: 'board-1',
          name: 'B',
          columns: [
            {
              id: 'col-a',
              title: 'A',
              cards: [
                {
                  id: 'card-1',
                  text: 'one',
                  description: '',
                  startDate: null,
                  dueDate: null,
                  completed: false,
                  priority: 'high',
                  labels: [],
                  logs: [],
                  dependencies: [],
                  effort: 0,
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: NOW.toISOString(),
                },
              ],
            },
          ],
          labels: [],
        },
      ],
    });
  });

  it('property: save-load-save is a fixpoint (normalization idempotent)', async () => {
    await fc.assert(
      fc.asyncProperty(arbState, async (state) => {
        const store1 = await freshStore(state);
        store1.renameBoard(state.boards[0].id, 'touch');
        vi.advanceTimersByTime(200);
        const firstSave = JSON.stringify(savedState());

        const store2 = await freshStore(JSON.parse(firstSave));
        store2.renameBoard(state.boards[0].id, 'touch');
        vi.advanceTimersByTime(200);
        expect(JSON.stringify(savedState())).toBe(firstSave);
      }),
      { numRuns: 10 }
    );
  });
});
