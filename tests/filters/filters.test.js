// Characterization suite 5: FilterManager predicates, chips, and presets.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  SEARCH_OPERATORS,
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
} from '../../js/domain/filters/model.js';
import { legacyFilterManager } from '../helpers/legacyFilterApi.js';
import { arbCard } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
});

const arbCards = fc.array(arbCard, { maxLength: 8 });

describe('applyFilters fundamentals', () => {
  it('inactive filters are the identity (same reference)', () => {
    fc.assert(
      fc.property(arbCards, (cards) => {
        const fm = legacyFilterManager();
        expect(fm.applyFilters(cards)).toBe(cards);
      })
    );
  });

  it('output is always a subset of input (never invents cards)', () => {
    fc.assert(
      fc.property(arbCards, fc.string({ maxLength: 3 }), (cards, term) => {
        const fm = legacyFilterManager();
        fm.setSearch(term || 'x');
        const out = fm.applyFilters(cards);
        for (const c of out) {
          expect(cards).toContain(c);
        }
      })
    );
  });

  it('conjunction monotonicity: adding a criterion never grows the result', () => {
    fc.assert(
      fc.property(arbCards, (cards) => {
        const fm = legacyFilterManager();
        fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
        const once = fm.applyFilters(cards);
        fm.setPriorities(['high']);
        const twice = fm.applyFilters(cards);
        expect(twice.length).toBeLessThanOrEqual(once.length);
        for (const c of twice) expect(once).toContain(c);
      })
    );
  });

  it('completion partitions the card set', () => {
    fc.assert(
      fc.property(arbCards, (cards) => {
        const fm = legacyFilterManager();
        fm.setCompletion(COMPLETION_STATUS.COMPLETED);
        const completed = fm.applyFilters(cards);
        fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
        const incomplete = fm.applyFilters(cards);
        expect(completed.length + incomplete.length).toBe(cards.length);
        for (const c of completed) expect(incomplete).not.toContain(c);
      })
    );
  });
});

describe('label match modes', () => {
  const cards = [
    { id: 'c1', text: 'a', labels: ['l1', 'l2'] },
    { id: 'c2', text: 'b', labels: ['l1'] },
    { id: 'c3', text: 'c', labels: [] },
  ];

  it('ALL-results are a subset of ANY-results; NONE is disjoint from ANY', () => {
    const fm = legacyFilterManager();
    fm.setLabels(['l1', 'l2'], LABEL_MATCH_MODE.ANY);
    const any = fm.applyFilters(cards);
    fm.setLabels(['l1', 'l2'], LABEL_MATCH_MODE.ALL);
    const all = fm.applyFilters(cards);
    fm.setLabels(['l1', 'l2'], LABEL_MATCH_MODE.NONE);
    const none = fm.applyFilters(cards);

    for (const c of all) expect(any).toContain(c);
    for (const c of none) expect(any).not.toContain(c);
    expect(any.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(all.map((c) => c.id)).toEqual(['c1']);
    expect(none.map((c) => c.id)).toEqual(['c3']);
  });

  it('toggleLabel adds then removes', () => {
    const fm = legacyFilterManager();
    fm.toggleLabel('l1');
    expect(fm.getFilters().labels.selected).toEqual(['l1']);
    fm.toggleLabel('l1');
    expect(fm.getFilters().labels.selected).toEqual([]);
  });
});

describe('dueDate quirks (frozen)', () => {
  it('a card with no dueDate is EXCLUDED when a from/to range is set, even with status ALL', () => {
    const fm = legacyFilterManager();
    fm.setDueDate({ from: '2026-07-01' });
    const cards = [
      { id: 'c1', text: 'no due', dueDate: null },
      { id: 'c2', text: 'due', dueDate: '2026-07-08' },
    ];
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c2']);
  });

  it('OVERDUE compares against end-of-day: due-today is not overdue', () => {
    const fm = legacyFilterManager();
    fm.setDueDate({ status: DUE_STATUS.OVERDUE });
    const cards = [
      { id: 'today', text: 't', dueDate: '2026-07-05' },
      { id: 'past', text: 'p', dueDate: '2026-07-04' },
    ];
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['past']);
  });

  it('NO_DUE_DATE and HAS_DUE_DATE partition on presence', () => {
    const fm = legacyFilterManager();
    const cards = [
      { id: 'c1', text: 'a', dueDate: null },
      { id: 'c2', text: 'b', dueDate: '2026-07-08' },
    ];
    fm.setDueDate({ status: DUE_STATUS.NO_DUE_DATE });
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c1']);
    fm.setDueDate({ status: DUE_STATUS.HAS_DUE_DATE });
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c2']);
  });
});

describe('search operators (frozen)', () => {
  const cards = [
    { id: 'c1', text: 'alpha', description: 'x' },
    { id: 'c2', text: 'beta', description: 'alpha notes' },
    { id: 'c3', text: 'gamma', description: '' },
  ];

  it('CONTAINS searches across fields; NOT_CONTAINS is fields.some (NOT the complement)', () => {
    const fm = legacyFilterManager();
    fm.setSearch('alpha', { operator: SEARCH_OPERATORS.CONTAINS });
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c1', 'c2']);

    fm.setSearch('alpha', { operator: SEARCH_OPERATORS.NOT_CONTAINS });
    // c1 passes because its description 'x' does not contain 'alpha' —
    // the some() across fields makes NOT_CONTAINS non-complementary.
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('EXACT and STARTS_WITH; caseSensitive flag', () => {
    const fm = legacyFilterManager();
    fm.setSearch('Alpha', { operator: SEARCH_OPERATORS.EXACT });
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c1']);
    fm.setSearch('Alpha', {
      operator: SEARCH_OPERATORS.EXACT,
      caseSensitive: true,
    });
    expect(fm.applyFilters(cards)).toEqual([]);
    fm.setSearch('al', { operator: SEARCH_OPERATORS.STARTS_WITH });
    // c2 matches via its description 'alpha notes' — operators apply per field
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('searches label names when the labels field is enabled', () => {
    const fm = legacyFilterManager();
    fm.setSearch('urgent');
    const labels = [{ id: 'l1', name: 'Urgent', color: '#f00' }];
    const cards = [
      { id: 'c1', text: 'plain', labels: ['l1'] },
      { id: 'c2', text: 'other', labels: [] },
    ];
    expect(fm.applyFilters(cards, labels).map((c) => c.id)).toEqual(['c1']);
  });
});

describe('effort and aging', () => {
  it('effort range is inclusive and null-bounded', () => {
    const fm = legacyFilterManager();
    fm.setEffort(2, 5);
    const cards = [
      { id: 'c1', text: 'a', effort: 1 },
      { id: 'c2', text: 'b', effort: 2 },
      { id: 'c3', text: 'c', effort: 5 },
      { id: 'c4', text: 'd', effort: 6 },
    ];
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['c2', 'c3']);
  });

  it('aging buckets by updatedAt; completed cards always pass', () => {
    const fm = legacyFilterManager();
    fm.setAging('stale'); // >= 7 days, < 14 days (AGING..STALE window)
    const cards = [
      { id: 'fresh', text: 'f', updatedAt: '2026-07-04T00:00:00.000Z' },
      { id: 'stale', text: 's', updatedAt: '2026-06-25T00:00:00.000Z' },
      {
        id: 'done',
        text: 'd',
        completed: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(fm.applyFilters(cards).map((c) => c.id)).toEqual(['stale', 'done']);
  });
});

describe('isActive / counts / clear', () => {
  it('fresh -> inactive; any set -> active; clearAll -> inactive again', () => {
    const fm = legacyFilterManager();
    expect(fm.isActive()).toBe(false);
    expect(fm.getActiveFilterCount()).toBe(0);
    fm.setSearch('x');
    expect(fm.isActive()).toBe(true);
    expect(fm.getActiveFilterCount()).toBe(1);
    fm.setCompletion(COMPLETION_STATUS.COMPLETED);
    expect(fm.getActiveFilterCount()).toBe(2);
    fm.clearFilter('search');
    expect(fm.getActiveFilterCount()).toBe(1);
    fm.clearAll();
    expect(fm.isActive()).toBe(false);
  });
});

describe('presets', () => {
  it('round-trip through localStorage restores structurally equal filters', () => {
    const fm1 = legacyFilterManager();
    fm1.setSearch('needle');
    fm1.setPriorities(['high']);
    fm1.createPreset('mine');

    const fm2 = legacyFilterManager();
    const presets = fm2.getPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('mine');

    fm2.applyPreset(presets[0].id);
    expect(fm2.getFilters()).toEqual(fm1.getFilters());
    expect(fm2.isActive()).toBe(true);
  });

  it('deletePreset removes and persists', () => {
    const fm = legacyFilterManager();
    fm.setSearch('x');
    fm.createPreset('p');
    const id = fm.getPresets()[0].id;
    fm.deletePreset(id);
    expect(fm.getPresets()).toEqual([]);
    expect(legacyFilterManager().getPresets()).toEqual([]);
  });
});

describe('chips', () => {
  it('one chip per active filter with a working clear', () => {
    const fm = legacyFilterManager();
    fm.setSearch('n');
    fm.setEffort(1, null);
    const chips = fm.getActiveFilterChips([]);
    expect(chips.map((c) => c.type).sort()).toEqual(['effort', 'search']);
    chips.find((c) => c.type === 'search').clear();
    expect(fm.getActiveFilterCount()).toBe(1);
  });
});
