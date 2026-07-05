// Characterization suite 8: date math quirks the filters, gantt, and
// picker all depend on.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  toDate,
  getDaysDiff,
  getDaysUntil,
  isToday,
  isWeekend,
  getEndOfWeek,
  getAgingLevel,
  getDueDateStatus,
  getWeekNumber,
} from '../../js/utils/dateUtils.js';
import { arbDateStr } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:34:56.000Z'); // a Sunday

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe('toDate', () => {
  it('floors to 00:00:00.000 and ceils to 23:59:59.999 on the same day', () => {
    fc.assert(
      fc.property(arbDateStr, (d) => {
        const start = toDate(d);
        const end = toDate(d, true);
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
        expect(end.getHours()).toBe(23);
        expect(end.getMilliseconds()).toBe(999);
        expect(end.toDateString()).toBe(start.toDateString());
      })
    );
    expect(toDate(null)).toBeNull();
  });
});

describe('getDaysDiff / getDaysUntil duality', () => {
  it('diff floors, until ceils; today -> 0 for both', () => {
    expect(getDaysUntil(NOW.toISOString().slice(0, 10))).toBe(0);
    expect(getDaysDiff(NOW.toISOString())).toBe(0);
    // 36 hours ago floors to 1 day
    expect(getDaysDiff(new Date(NOW - 36 * 3600000).toISOString())).toBe(1);
    // due tomorrow: 1
    expect(getDaysUntil('2026-07-06')).toBe(1);
    // overdue yesterday: -1
    expect(getDaysUntil('2026-07-04')).toBe(-1);
  });

  it('null handling: diff -> 0, until -> Infinity', () => {
    expect(getDaysDiff(null)).toBe(0);
    expect(getDaysUntil(null)).toBe(Infinity);
  });
});

describe('isToday / isWeekend', () => {
  it('isToday matches calendar day', () => {
    expect(isToday(NOW)).toBe(true);
    expect(isToday('2026-07-04')).toBe(false);
  });

  it('isWeekend flags Saturday and Sunday', () => {
    expect(isWeekend('2026-07-04')).toBe(true); // Saturday
    expect(isWeekend('2026-07-05')).toBe(true); // Sunday
    expect(isWeekend('2026-07-06')).toBe(false); // Monday
  });
});

describe('getEndOfWeek (frozen quirk)', () => {
  it('maps a Sunday input to the NEXT Sunday (getDay()==0 adds 7)', () => {
    const end = getEndOfWeek(new Date('2026-07-05T00:00:00.000Z'));
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(12);
    expect(end.getHours()).toBe(23);
  });

  it('non-Sunday input maps to the coming Sunday', () => {
    const end = getEndOfWeek(new Date('2026-07-01T00:00:00.000Z')); // Wednesday
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(5);
  });

  it('result is always >= input and always a Sunday', () => {
    fc.assert(
      fc.property(arbDateStr, (d) => {
        const input = new Date(d);
        const end = getEndOfWeek(input);
        expect(end.getTime()).toBeGreaterThanOrEqual(input.getTime());
        expect(end.getDay()).toBe(0);
      })
    );
  });
});

describe('getAgingLevel', () => {
  it('is monotone in staleness and always 0 for completed cards', () => {
    const iso = (daysAgo) =>
      new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
    expect(getAgingLevel(iso(0), false)).toBe(0);
    expect(getAgingLevel(iso(3), false)).toBe(1);
    expect(getAgingLevel(iso(7), false)).toBe(2);
    expect(getAgingLevel(iso(14), false)).toBe(3);
    expect(getAgingLevel(iso(100), false)).toBe(3);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400 }), (days) => {
        expect(getAgingLevel(iso(days), true)).toBe(0);
        const level = getAgingLevel(iso(days), false);
        const next = getAgingLevel(iso(days + 1), false);
        expect(next).toBeGreaterThanOrEqual(level);
      })
    );
  });
});

describe('getDueDateStatus (frozen: due-soon is <= 2 days, not DUE_SOON_DAYS)', () => {
  it('classifies overdue/due-today/due-soon and mutes completed', () => {
    expect(getDueDateStatus('2026-07-04', false)).toBe('overdue');
    expect(getDueDateStatus('2026-07-05', false)).toBe('due-today');
    expect(getDueDateStatus('2026-07-06', false)).toBe('due-soon');
    expect(getDueDateStatus('2026-07-07', false)).toBe('due-soon');
    expect(getDueDateStatus('2026-07-08', false)).toBe(''); // 3 days out: NOT due-soon
    expect(getDueDateStatus('2026-07-04', true)).toBe('');
    expect(getDueDateStatus(null, false)).toBe('');
  });
});

describe('getWeekNumber', () => {
  it('is in [1, 53] and matches known ISO examples', () => {
    expect(getWeekNumber(new Date('2026-01-01T00:00:00.000Z'))).toBe(1);
    expect(getWeekNumber(new Date('2026-12-31T00:00:00.000Z'))).toBe(53);
    expect(getWeekNumber(new Date('2026-07-05T00:00:00.000Z'))).toBe(27);
    fc.assert(
      fc.property(arbDateStr, (d) => {
        const wk = getWeekNumber(new Date(d));
        expect(wk).toBeGreaterThanOrEqual(1);
        expect(wk).toBeLessThanOrEqual(53);
      })
    );
  });
});
