// Characterization suite 6: weighted random picking.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { legacyRandomPicker } from '../helpers/legacyPickerApi.js';
import { mulberry32 } from '../helpers/seededRandom.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
});

const mkCard = (over = {}) => ({
  id: over.id ?? `card-${Math.random().toString(36).slice(2)}`,
  text: 't',
  completed: false,
  priority: 'none',
  updatedAt: NOW.toISOString(),
  ...over,
});

const board = (columns) => ({ columns });

describe('eligibility', () => {
  it('pick is always from the eligible pool; excludeCompleted and includeColumns respected', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), (seed) => {
        const rand = mulberry32(seed);
        vi.spyOn(Math, 'random').mockImplementation(rand);

        const picker = legacyRandomPicker();
        picker.setOptions({
          includeColumns: ['col-a'],
          excludeCompleted: true,
        });
        const state = board([
          {
            id: 'col-a',
            title: 'A',
            cards: [
              mkCard({ id: 'ok-1' }),
              mkCard({ id: 'done-1', completed: true }),
            ],
          },
          { id: 'col-b', title: 'B', cards: [mkCard({ id: 'excluded-col' })] },
        ]);

        const res = picker.pickRandomCard(state);
        expect(res.card.id).toBe('ok-1');
        expect(res.column.id).toBe('col-a');
      }),
      { numRuns: 20 }
    );
  });

  it('returns null when nothing is eligible', () => {
    const picker = legacyRandomPicker();
    expect(picker.pickRandomCard(board([]))).toBeNull();
    expect(
      picker.pickRandomCard(
        board([{ id: 'c', title: 'C', cards: [mkCard({ completed: true })] }])
      )
    ).toBeNull();
    expect(picker.pickRandomCard(null)).toBeNull();
  });
});

describe('weights (frozen semantics)', () => {
  const weightOf = (picker, card) => picker.calculateWeight(card);

  it('weight is always >= 1', () => {
    const picker = legacyRandomPicker();
    fc.assert(
      fc.property(
        fc.constantFrom('none', 'low', 'medium', 'high'),
        fc.oneof(
          fc.constant(null),
          fc.constant('2026-07-01'),
          fc.constant('2026-08-01')
        ),
        (priority, dueDate) => {
          const w = weightOf(picker, mkCard({ priority, dueDate }));
          expect(w).toBeGreaterThanOrEqual(1);
        }
      )
    );
  });

  it('monotone in priority, overdue-ness, and staleness', () => {
    const picker = legacyRandomPicker();
    // priority
    expect(weightOf(picker, mkCard({ priority: 'high' }))).toBeGreaterThan(
      weightOf(picker, mkCard({ priority: 'low' }))
    );
    // overdue vs due next week
    expect(weightOf(picker, mkCard({ dueDate: '2026-07-01' }))).toBeGreaterThan(
      weightOf(picker, mkCard({ dueDate: '2026-07-11' }))
    );
    // staler updatedAt weighs more
    expect(
      weightOf(picker, mkCard({ updatedAt: '2026-06-01T00:00:00.000Z' }))
    ).toBeGreaterThan(
      weightOf(picker, mkCard({ updatedAt: NOW.toISOString() }))
    );
  });

  it('factors multiply: exact weight table spot-check', () => {
    const picker = legacyRandomPicker();
    // high(4) * overdue(5) * stale>=14d(3) = 60
    const w = weightOf(
      picker,
      mkCard({
        priority: 'high',
        dueDate: '2026-06-20',
        updatedAt: '2026-06-01T00:00:00.000Z',
      })
    );
    expect(w).toBe(60);
  });

  it('disabling factors flattens weights to 1', () => {
    const picker = legacyRandomPicker();
    picker.setOptions({
      factorPriority: false,
      factorDueDate: false,
      factorAging: false,
    });
    const w = weightOf(
      picker,
      mkCard({ priority: 'high', dueDate: '2026-06-20' })
    );
    expect(w).toBe(1);
  });
});

describe('inverse-CDF selection', () => {
  it('with stubbed random u, the pick is the item whose cumulative bracket contains u * total', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.999, noNaN: true }), (u) => {
        vi.spyOn(Math, 'random').mockImplementation(() => u);
        const picker = legacyRandomPicker();
        picker.setOptions({ factorDueDate: false, factorAging: false });

        const cards = [
          mkCard({ id: 'c-high', priority: 'high' }), // weight 4
          mkCard({ id: 'c-med', priority: 'medium' }), // weight 2
          mkCard({ id: 'c-low', priority: 'low' }), // weight 1
        ];
        const state = board([{ id: 'col', title: 'C', cards }]);

        const weights = cards.map((c) => picker.calculateWeight(c));
        const total = weights.reduce((a, b) => a + b, 0);
        let r = u * total;
        let expected = cards.at(-1).id;
        for (let i = 0; i < cards.length; i++) {
          r -= weights[i];
          if (r <= 0) {
            expected = cards[i].id;
            break;
          }
        }

        expect(picker.pickRandomCard(state).card.id).toBe(expected);
      }),
      { numRuns: 40 }
    );
  });

  it('return shape on the main path is {card, column} (frozen)', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
    const picker = legacyRandomPicker();
    const res = picker.pickRandomCard(
      board([{ id: 'col', title: 'C', cards: [mkCard({ id: 'only' })] }])
    );
    expect(Object.keys(res).sort()).toEqual(['card', 'column']);
  });
});

describe('options persistence', () => {
  it('setOptions persists; a new instance reads them back; resetOptions restores defaults', () => {
    const p1 = legacyRandomPicker();
    p1.setOptions({ factorPriority: false, includeColumns: ['x'] });

    const p2 = legacyRandomPicker();
    expect(p2.getOptions()).toMatchObject({
      factorPriority: false,
      includeColumns: ['x'],
    });

    p2.resetOptions();
    expect(legacyRandomPicker().getOptions()).toMatchObject({
      factorPriority: true,
      includeColumns: [],
    });
  });

  it('corrupt options JSON falls back to defaults', () => {
    localStorage.setItem('kanban-randomizer-options', '{nope');
    const p = legacyRandomPicker();
    expect(p.getOptions()).toMatchObject({ factorPriority: true });
  });
});

describe('getPoolStats', () => {
  it('eligible equals the sum of byColumn counts and never exceeds total', () => {
    const picker = legacyRandomPicker();
    const state = board([
      {
        id: 'col-a',
        title: 'A',
        cards: [mkCard(), mkCard({ completed: true })],
      },
      { id: 'col-b', title: 'B', cards: [mkCard()] },
    ]);
    const stats = picker.getPoolStats(state);
    expect(stats.total).toBe(3);
    expect(stats.eligible).toBe(2);
    expect(Object.values(stats.byColumn).reduce((a, b) => a + b, 0)).toBe(
      stats.eligible
    );
  });
});
