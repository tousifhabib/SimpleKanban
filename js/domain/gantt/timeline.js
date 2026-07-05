// Gantt timeline math as pure functions. `now` and `lang` are inputs;
// day sequences are generated lazily. Arithmetic frozen by the
// characterization suite (-3/+7 range padding, cellWidth tables,
// width = duration * cellWidth - 4).

import { MS_DAY, isToday, isWeekend, getWeekNumber } from '../dates.js';

export const ZOOM_LEVELS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

export const ZOOM_CONFIG = {
  [ZOOM_LEVELS.DAY]: {
    cellWidth: 120,
    headerFormat: 'day',
    subHeaderFormat: 'weekday',
  },
  [ZOOM_LEVELS.WEEK]: {
    cellWidth: 60,
    headerFormat: 'week',
    subHeaderFormat: 'month',
  },
  [ZOOM_LEVELS.MONTH]: {
    cellWidth: 32,
    headerFormat: 'month',
    subHeaderFormat: 'year',
  },
};

export const DEFAULT_ZOOM = ZOOM_LEVELS.WEEK;

// Lazy inclusive day sequence.
export function* daysBetween(start, end) {
  const current = new Date(start);
  while (current <= end) {
    yield new Date(current);
    current.setDate(current.getDate() + 1);
  }
}

export const toGanttData = (board, labels = [], now) => {
  if (!board?.columns) return { scheduled: [], unscheduled: [], range: null };

  const scheduled = [];
  const unscheduled = [];

  board.columns.forEach((column) => {
    column.cards.forEach((card) => {
      const task = {
        id: card.id,
        title: card.text,
        description: card.description,
        startDate: card.startDate ? new Date(card.startDate) : null,
        endDate: card.dueDate ? new Date(card.dueDate) : null,
        effort: card.effort || 0,
        priority: card.priority || 'none',
        completed: card.completed || false,
        dependencies: card.dependencies || [],
        labels: (card.labels || [])
          .map((id) => labels.find((l) => l.id === id))
          .filter(Boolean),
        column: { id: column.id, title: column.title },
        card,
      };

      (task.startDate && task.endDate ? scheduled : unscheduled).push(task);
    });
  });

  return {
    scheduled,
    unscheduled,
    range: dateRange(scheduled, now),
  };
};

export const dateRange = (tasks, now) => {
  if (!tasks.length) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    return { start: today, end, days: 30 };
  }

  let minDate = null;
  let maxDate = null;

  tasks.forEach((task) => {
    if (task.startDate && (!minDate || task.startDate < minDate))
      minDate = new Date(task.startDate);
    if (task.endDate && (!maxDate || task.endDate > maxDate))
      maxDate = new Date(task.endDate);
  });

  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(0, 0, 0, 0);

  return {
    start: minDate,
    end: maxDate,
    // Math.round, not ceil: both bounds are local midnights, so across a
    // DST boundary the span is n*24h ± 1h. ceil over-counted by one on
    // fall-back transitions, desynchronizing the grid from the header
    // day loop; round always recovers the calendar-day count.
    days: Math.round((maxDate - minDate) / MS_DAY) + 1,
  };
};

export const groupByMonth = (days) => {
  const groups = [];
  let currentKey = null;
  let count = 0;
  let monthName = '';
  let year = 0;

  days.forEach((day) => {
    const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (key !== currentKey) {
      if (currentKey !== null)
        groups.push({ label: `${monthName} ${year}`, span: count });
      currentKey = key;
      monthName = day.monthName;
      year = day.year;
      count = 1;
    } else {
      count++;
    }
  });

  if (count > 0) groups.push({ label: `${monthName} ${year}`, span: count });
  return groups;
};

export const groupByYear = (days) => {
  const groups = [];
  let currentYear = null;
  let count = 0;

  days.forEach((day) => {
    if (day.year !== currentYear) {
      if (currentYear !== null)
        groups.push({ label: String(currentYear), span: count });
      currentYear = day.year;
      count = 1;
    } else {
      count++;
    }
  });

  if (count > 0) groups.push({ label: String(currentYear), span: count });
  return groups;
};

export const timelineHeaders = (range, { zoom, lang, now }) => {
  if (!range) return { primary: [], secondary: [] };

  const primary = [...daysBetween(range.start, range.end)].map((date) => ({
    date,
    dayOfMonth: date.getDate(),
    dayOfWeek: date.toLocaleDateString(lang, { weekday: 'short' }),
    isWeekend: isWeekend(date),
    isToday: isToday(date, now),
    monthName: date.toLocaleDateString(lang, { month: 'short' }),
    year: date.getFullYear(),
    weekNumber: getWeekNumber(date),
  }));

  const grouper = zoom === ZOOM_LEVELS.MONTH ? groupByYear : groupByMonth;

  return { primary, secondary: grouper(primary) };
};

export const taskPosition = (zoom) => (task, range) => {
  if (!task.startDate || !task.endDate || !range)
    return { left: 0, width: 0, visible: false };

  const { cellWidth } = ZOOM_CONFIG[zoom];
  const startOffset = Math.floor((task.startDate - range.start) / MS_DAY);
  const duration = Math.ceil((task.endDate - task.startDate) / MS_DAY) + 1;

  return {
    left: startOffset * cellWidth,
    width: duration * cellWidth - 4,
    visible: true,
    startOffset,
    duration,
  };
};

export const todayOffset = (zoom, range, now) => {
  if (!range) return 0;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const offset = Math.floor((today - range.start) / MS_DAY);
  return Math.max(0, offset * ZOOM_CONFIG[zoom].cellWidth - 200);
};

// Sidebar/bar layout: y-offsets for column groups and their tasks.
export const layoutTasks = (scheduled) => {
  const grouped = new Map();
  for (const task of scheduled) {
    if (!grouped.has(task.column.id)) grouped.set(task.column.id, []);
    grouped.get(task.column.id).push(task);
  }

  let currentY = 0;
  const groups = [...grouped.values()].map((groupTasks) => {
    const groupY = currentY;
    currentY += 32;
    const tasks = groupTasks.map((task) => {
      const taskY = currentY;
      currentY += 48;
      return { ...task, y: taskY };
    });
    return { column: groupTasks[0].column, y: groupY, tasks };
  });

  return { groups, totalHeight: Math.max(200, currentY) };
};
