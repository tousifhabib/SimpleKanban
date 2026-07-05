// Characterization suite 7: gantt calculations (range, headers, positions).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ZOOM_LEVELS } from '../../js/domain/gantt/timeline.js';
import { legacyGanttManager } from '../helpers/legacyGanttApi.js';
import { arbDateStr } from '../helpers/arbitraries.js';

const NOW = new Date('2026-07-05T12:00:00.000Z');
const MS_DAY = 86400000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

const mkCard = (over = {}) => ({
  id: over.id ?? `card-${Math.random().toString(36).slice(2)}`,
  text: 't',
  ...over,
});

const boardWith = (cards) => ({
  columns: [{ id: 'col', title: 'C', cards }],
});

describe('transformToGanttData', () => {
  it('partitions: scheduled iff both startDate and dueDate present', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            startDate: fc.oneof(fc.constant(null), arbDateStr),
            dueDate: fc.oneof(fc.constant(null), arbDateStr),
          }),
          { maxLength: 8 }
        ),
        (specs) => {
          const gm = legacyGanttManager();
          const cards = specs.map((s, i) => mkCard({ id: `c${i}`, ...s }));
          const { scheduled, unscheduled } = gm.transformToGanttData(
            boardWith(cards)
          );
          expect(scheduled.length + unscheduled.length).toBe(cards.length);
          for (const t of scheduled) {
            expect(t.startDate).not.toBeNull();
            expect(t.endDate).not.toBeNull();
          }
          for (const t of unscheduled) {
            expect(t.startDate === null || t.endDate === null).toBe(true);
          }
        }
      )
    );
  });

  it('resolves label ids and carries column context', () => {
    const gm = legacyGanttManager();
    const labels = [{ id: 'l1', name: 'L', color: '#f00' }];
    const { unscheduled } = gm.transformToGanttData(
      boardWith([mkCard({ id: 'c1', labels: ['l1', 'missing'] })]),
      labels
    );
    expect(unscheduled[0].labels).toEqual([labels[0]]);
    expect(unscheduled[0].column).toEqual({ id: 'col', title: 'C' });
  });

  it('null board yields empty structure', () => {
    const gm = legacyGanttManager();
    expect(gm.transformToGanttData(null)).toEqual({
      scheduled: [],
      unscheduled: [],
      range: null,
    });
  });
});

describe('calculateDateRange (frozen: -3/+7 padding)', () => {
  it('empty input -> today..today+30, days: 30', () => {
    const gm = legacyGanttManager();
    const range = gm.calculateDateRange([]);
    expect(range.days).toBe(30);
    expect(range.start.getTime()).toBe(
      new Date('2026-07-05T00:00:00.000Z').getTime()
    );
    expect(range.end.getTime() - range.start.getTime()).toBe(30 * MS_DAY);
  });

  it('property: range covers every task with exactly -3/+7 day padding', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(arbDateStr, arbDateStr)
            .map(([a, b]) => (a <= b ? [a, b] : [b, a])),
          { minLength: 1, maxLength: 6 }
        ),
        (pairs) => {
          const gm = legacyGanttManager();
          const tasks = pairs.map(([s, e], i) => ({
            id: `t${i}`,
            startDate: new Date(s),
            endDate: new Date(e),
          }));
          const range = gm.calculateDateRange(tasks);

          const minStart = Math.min(...tasks.map((t) => t.startDate.getTime()));
          const maxEnd = Math.max(...tasks.map((t) => t.endDate.getTime()));
          expect(range.start.getTime()).toBe(minStart - 3 * MS_DAY);
          expect(range.end.getTime()).toBe(maxEnd + 7 * MS_DAY);
          expect(range.days).toBe(
            Math.ceil((range.end - range.start) / MS_DAY) + 1
          );
        }
      )
    );
  });
});

describe('generateTimelineHeaders', () => {
  it('primary has one entry per day inclusive; secondary spans sum to primary length', () => {
    const gm = legacyGanttManager();
    const range = {
      start: new Date('2026-06-20T00:00:00.000Z'),
      end: new Date('2026-07-10T00:00:00.000Z'),
    };
    const { primary, secondary } = gm.generateTimelineHeaders(range);
    expect(primary).toHaveLength(21);
    expect(secondary.map((g) => g.span).reduce((a, b) => a + b, 0)).toBe(21);
    // June and July groups
    expect(secondary).toHaveLength(2);
    expect(primary.find((d) => d.isToday)).toBeTruthy();
  });

  it('month zoom groups by year', () => {
    const gm = legacyGanttManager();
    gm.setZoom(ZOOM_LEVELS.MONTH);
    const range = {
      start: new Date('2026-12-25T00:00:00.000Z'),
      end: new Date('2027-01-05T00:00:00.000Z'),
    };
    const { secondary } = gm.generateTimelineHeaders(range);
    expect(secondary.map((g) => g.label)).toEqual(['2026', '2027']);
  });

  it('null range -> empty headers', () => {
    const gm = legacyGanttManager();
    expect(gm.generateTimelineHeaders(null)).toEqual({
      primary: [],
      secondary: [],
    });
  });
});

describe('calculateTaskPosition (frozen arithmetic)', () => {
  it('left = floor(dayOffset) * cellWidth; width = (ceil(duration)+1) * cellWidth - 4', () => {
    const gm = legacyGanttManager(); // WEEK zoom: cellWidth 60
    const range = { start: new Date('2026-07-01T00:00:00.000Z') };
    const task = {
      startDate: new Date('2026-07-04T00:00:00.000Z'),
      endDate: new Date('2026-07-06T00:00:00.000Z'),
    };
    const pos = gm.calculateTaskPosition(task, range);
    expect(pos).toEqual({
      left: 3 * 60,
      width: 3 * 60 - 4,
      visible: true,
      startOffset: 3,
      duration: 3,
    });
  });

  it('unscheduled tasks are invisible', () => {
    const gm = legacyGanttManager();
    expect(gm.calculateTaskPosition({ startDate: null }, {})).toEqual({
      left: 0,
      width: 0,
      visible: false,
    });
  });

  it('single-day task has duration 1', () => {
    const gm = legacyGanttManager();
    const d = new Date('2026-07-04T00:00:00.000Z');
    const pos = gm.calculateTaskPosition(
      { startDate: d, endDate: d },
      { start: d }
    );
    expect(pos.duration).toBe(1);
  });
});

describe('zoom', () => {
  it('setZoom on a bogus level is a no-op; valid levels swap cellWidth', () => {
    const gm = legacyGanttManager();
    expect(gm.getZoom()).toBe(ZOOM_LEVELS.WEEK);
    expect(gm.getZoomConfig().cellWidth).toBe(60);
    gm.setZoom('bogus');
    expect(gm.getZoom()).toBe(ZOOM_LEVELS.WEEK);
    gm.setZoom(ZOOM_LEVELS.DAY);
    expect(gm.getZoomConfig().cellWidth).toBe(120);
    gm.setZoom(ZOOM_LEVELS.MONTH);
    expect(gm.getZoomConfig().cellWidth).toBe(32);
  });

  it('setZoom notifies subscribers', () => {
    const gm = legacyGanttManager();
    const spy = vi.fn();
    gm.subscribe(spy);
    gm.setZoom(ZOOM_LEVELS.DAY);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('getTodayOffset', () => {
  it('clamps at zero and subtracts the 200px lead-in', () => {
    const gm = legacyGanttManager(); // week: 60px
    const range10 = { start: new Date('2026-06-25T00:00:00.000Z') }; // today offset: 10 days
    expect(gm.getTodayOffset(range10)).toBe(10 * 60 - 200);
    const rangeNow = { start: new Date('2026-07-05T00:00:00.000Z') };
    expect(gm.getTodayOffset(rangeNow)).toBe(0);
    expect(gm.getTodayOffset(null)).toBe(0);
  });
});
