// Characterization suite 1: card operations on the live Store.
// These tests freeze CURRENT behavior — including deliberate quirks —
// and must pass unchanged across the immutable-engine swap.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  freshStore,
  stubDeterministicIds,
  savedState,
} from '../helpers/freshStore.js';
import { arbState, cardIdsOf } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

const twoColumnState = () => ({
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
              priority: 'high',
              labels: ['label-x'],
              logs: [
                {
                  id: 'log-1',
                  text: 'l',
                  columnTitle: 'A',
                  createdAt: '2026-01-01T00:00:00.000Z',
                },
              ],
              dependencies: [{ id: 'card-2', type: 'FS' }],
              effort: 3,
              description: 'desc',
              startDate: '2026-07-01',
              dueDate: '2026-07-10',
              completed: false,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
            {
              id: 'card-2',
              text: 'two',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        },
        {
          id: 'col-b',
          title: 'B',
          cards: [
            {
              id: 'card-3',
              text: 'three',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        },
      ],
      labels: [{ id: 'label-x', name: 'X', color: '#e53935' }],
    },
  ],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  stubDeterministicIds();
});

describe('moveCard', () => {
  it('preserves the card multiset and stamps only the moved card', async () => {
    const store = await freshStore(twoColumnState());
    const before = cardIdsOf(store.getState());

    store.moveCard('card-1', 'col-a', 'col-b', ['card-3', 'card-1']);

    const board = store.getState();
    expect(cardIdsOf(board)).toEqual(before);
    const colB = board.columns.find((c) => c.id === 'col-b');
    expect(colB.cards.map((c) => c.id)).toEqual(['card-3', 'card-1']);

    const moved = colB.cards.find((c) => c.id === 'card-1');
    expect(moved.updatedAt).toBe(NOW.toISOString());
    const untouched = board.columns
      .flatMap((c) => c.cards)
      .filter((c) => c.id !== 'card-1');
    for (const c of untouched) {
      expect(c.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    }
  });

  it('property: any legal move preserves total card ids', async () => {
    await fc.assert(
      fc.asyncProperty(arbState, fc.nat(), fc.nat(), async (state, i, j) => {
        const board = state.boards[0];
        const nonEmpty = board.columns.filter((c) => c.cards.length > 0);
        fc.pre(nonEmpty.length > 0 && board.columns.length >= 2);

        const fromCol = nonEmpty[i % nonEmpty.length];
        const toCol = board.columns[j % board.columns.length];
        const card = fromCol.cards[0];
        fc.pre(fromCol.id !== toCol.id);

        const store = await freshStore(state);
        const before = cardIdsOf(store.getState());
        const newOrder = [
          ...store
            .getState()
            .columns.find((c) => c.id === toCol.id)
            .cards.map((c) => c.id),
          card.id,
        ];
        store.moveCard(card.id, fromCol.id, toCol.id, newOrder);
        expect(cardIdsOf(store.getState())).toEqual(before);
      }),
      { numRuns: 15 }
    );
  });
});

describe('reorderCards (whitelist semantics — frozen)', () => {
  it('a permutation of ids reorders without loss and does NOT touch updatedAt', async () => {
    const store = await freshStore(twoColumnState());
    store.reorderCards('col-a', ['card-2', 'card-1']);
    const colA = store.getState().columns.find((c) => c.id === 'col-a');
    expect(colA.cards.map((c) => c.id)).toEqual(['card-2', 'card-1']);
    for (const c of colA.cards) {
      expect(c.updatedAt).toBe('2026-01-02T00:00:00.000Z');
    }
  });

  it('ids omitted from the order array are silently DELETED (landmine)', async () => {
    const store = await freshStore(twoColumnState());
    store.reorderCards('col-a', ['card-2']);
    const colA = store.getState().columns.find((c) => c.id === 'col-a');
    expect(colA.cards.map((c) => c.id)).toEqual(['card-2']);
  });

  it('unknown ids in the order array are ignored', async () => {
    const store = await freshStore(twoColumnState());
    store.reorderCards('col-a', ['card-1', 'card-2', 'card-nope']);
    const colA = store.getState().columns.find((c) => c.id === 'col-a');
    expect(colA.cards.map((c) => c.id)).toEqual(['card-1', 'card-2']);
  });
});

describe('duplicateCard', () => {
  it('clones with fresh id/timestamps and CLEARED logs+dependencies, inserted right after the original', async () => {
    const store = await freshStore(twoColumnState());
    const clone = store.duplicateCard('col-a', 'card-1');

    expect(clone).not.toBeNull();
    expect(clone.id).not.toBe('card-1');
    expect(clone.logs).toEqual([]);
    expect(clone.dependencies).toEqual([]);
    expect(clone.createdAt).toBe(NOW.toISOString());
    expect(clone.updatedAt).toBe(NOW.toISOString());

    const colA = store.getState().columns.find((c) => c.id === 'col-a');
    // DELIBERATE FIX at the engine swap: the legacy deep Proxy broke the
    // intended indexOf(original)+1 insertion (fresh wrappers made indexOf
    // return -1, dropping clones at index 0). The immutable engine restores
    // the intended after-the-original placement.
    expect(colA.cards.map((c) => c.id)).toEqual(['card-1', clone.id, 'card-2']);

    const original = colA.cards[0];
    for (const key of [
      'text',
      'description',
      'startDate',
      'dueDate',
      'completed',
      'priority',
      'effort',
    ]) {
      expect(clone[key]).toEqual(original[key]);
    }
    expect(clone.labels).toEqual(['label-x']);
  });

  it('returns null for an unknown card', async () => {
    const store = await freshStore(twoColumnState());
    expect(store.duplicateCard('col-a', 'card-nope')).toBeNull();
  });
});

describe('updatedAt touch table (frozen)', () => {
  const touched = async (op) => {
    const store = await freshStore(twoColumnState());
    op(store);
    const res = store.getCard('card-1');
    return res.card.updatedAt === NOW.toISOString();
  };

  it('updateCardDetails: touches', async () => {
    expect(
      await touched((s) =>
        s.updateCardDetails('col-a', 'card-1', { text: 'x' })
      )
    ).toBe(true);
  });

  it('toggleCardComplete: touches', async () => {
    expect(await touched((s) => s.toggleCardComplete('col-a', 'card-1'))).toBe(
      true
    );
  });

  it('addCardDependency: touches', async () => {
    expect(
      await touched((s) =>
        s.addCardDependency('col-a', 'card-1', 'card-3', 'SS')
      )
    ).toBe(true);
  });

  it('removeCardDependency: touches', async () => {
    expect(
      await touched((s) => s.removeCardDependency('col-a', 'card-1', 'card-2'))
    ).toBe(true);
  });

  it('addCardLog: touches', async () => {
    expect(await touched((s) => s.addCardLog('col-a', 'card-1', 'note'))).toBe(
      true
    );
  });

  it('reorderCards: does NOT touch', async () => {
    expect(
      await touched((s) => s.reorderCards('col-a', ['card-2', 'card-1']))
    ).toBe(false);
  });
});

describe('toggleCardComplete', () => {
  it('is an involution on completed', async () => {
    const store = await freshStore(twoColumnState());
    const before = store.getCard('card-1').card.completed;
    store.toggleCardComplete('col-a', 'card-1');
    expect(store.getCard('card-1').card.completed).toBe(!before);
    store.toggleCardComplete('col-a', 'card-1');
    expect(store.getCard('card-1').card.completed).toBe(before);
  });
});

describe('card normalization on load (createCard)', () => {
  it('coerces effort and fills defaults', async () => {
    const seed = twoColumnState();
    seed.boards[0].columns[0].cards = [
      { id: 'card-e1', text: 'stringy effort', effort: '5' },
      { id: 'card-e2', text: 'garbage effort', effort: 'abc' },
      { id: 'card-e3', text: 'bare' },
    ];
    const store = await freshStore(seed);
    const cards = store.getState().columns[0].cards;

    expect(cards[0].effort).toBe(5);
    expect(cards[1].effort).toBe(0);

    const bare = cards[2];
    expect(bare.description).toBe('');
    expect(bare.startDate).toBeNull();
    expect(bare.dueDate).toBeNull();
    expect(bare.completed).toBe(false);
    expect(bare.priority).toBe('none');
    expect(bare.labels).toEqual([]);
    expect(bare.logs).toEqual([]);
    expect(bare.dependencies).toEqual([]);
    expect(bare.createdAt).toBe(NOW.toISOString());
    expect(bare.updatedAt).toBe(NOW.toISOString());
  });

  it('addCard appends a normalized card with fresh id', async () => {
    const store = await freshStore(twoColumnState());
    store.addCard('col-b', 'brand new');
    const colB = store.getState().columns.find((c) => c.id === 'col-b');
    const added = colB.cards.at(-1);
    expect(added.text).toBe('brand new');
    expect(added.id).toMatch(/^card-uuid-/);
    expect(added.priority).toBe('none');
  });
});

describe('addCardLog', () => {
  it('records the current column title on the log entry', async () => {
    const store = await freshStore(twoColumnState());
    store.addCardLog('col-a', 'card-1', 'a note');
    const logs = store.getCard('card-1').card.logs;
    expect(logs.at(-1)).toMatchObject({
      text: 'a note',
      columnTitle: 'A',
      createdAt: NOW.toISOString(),
    });
  });
});

describe('removeCard', () => {
  it('removes the card and strips it from other cards dependencies', async () => {
    const store = await freshStore(twoColumnState());
    // card-1 depends on card-2; removing card-2 must clean card-1
    store.removeCard('col-a', 'card-2');
    const board = store.getState();
    expect(cardIdsOf(board)).toEqual(['card-1', 'card-3']);
    expect(store.getCard('card-1').card.dependencies).toEqual([]);
  });
});

describe('persistence smoke for card ops', () => {
  it('mutations reach localStorage after the debounce window', async () => {
    const store = await freshStore(twoColumnState());
    store.addCard('col-a', 'persist me');
    vi.advanceTimersByTime(200);
    const saved = savedState();
    const colA = saved.boards[0].columns.find((c) => c.id === 'col-a');
    expect(colA.cards.some((c) => c.text === 'persist me')).toBe(true);
  });
});
