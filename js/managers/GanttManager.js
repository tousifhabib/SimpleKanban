import { i18n } from '../services/i18n/i18nService.js';
import { MS_DAY, isToday } from '../utils/dateUtils.js';

export const ZOOM_LEVELS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

const ZOOM_CONFIG = {
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

export default class GanttManager {
  constructor() {
    this.zoom = ZOOM_LEVELS.WEEK;
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn());
  }

  setZoom(level) {
    if (ZOOM_CONFIG[level]) {
      this.zoom = level;
      this.notify();
    }
  }

  getZoom() {
    return this.zoom;
  }

  getZoomConfig() {
    return ZOOM_CONFIG[this.zoom];
  }

  transformToGanttData(boardState, labels = []) {
    if (!boardState?.columns)
      return { scheduled: [], unscheduled: [], range: null };

    const scheduled = [];
    const unscheduled = [];

    boardState.columns.forEach((column) => {
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

        if (task.startDate && task.endDate) {
          scheduled.push(task);
        } else {
          unscheduled.push(task);
        }
      });
    });

    const range = this.calculateDateRange(scheduled);

    return { scheduled, unscheduled, range };
  }

  calculateDateRange(tasks) {
    if (!tasks.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      return { start: today, end, days: 30 };
    }

    let minDate = null;
    let maxDate = null;

    tasks.forEach((task) => {
      if (task.startDate && (!minDate || task.startDate < minDate)) {
        minDate = new Date(task.startDate);
      }
      if (task.endDate && (!maxDate || task.endDate > maxDate)) {
        maxDate = new Date(task.endDate);
      }
    });

    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);

    const days = Math.ceil((maxDate - minDate) / MS_DAY) + 1;

    return { start: minDate, end: maxDate, days };
  }

  generateTimelineHeaders(range) {
    if (!range) return { primary: [], secondary: [] };

    const { start, end } = range;
    const primary = [];
    const secondary = [];
    const current = new Date(start);

    const lang = i18n.getLanguage();

    while (current <= end) {
      const dayData = {
        date: new Date(current),
        dayOfMonth: current.getDate(),
        dayOfWeek: current.toLocaleDateString(lang, { weekday: 'short' }),
        isWeekend: current.getDay() === 0 || current.getDay() === 6,
        isToday: isToday(current),
        monthName: current.toLocaleDateString(lang, { month: 'short' }),
        year: current.getFullYear(),
        weekNumber: this.getWeekNumber(current),
      };

      primary.push(dayData);

      current.setDate(current.getDate() + 1);
    }

    if (this.zoom === ZOOM_LEVELS.DAY) {
      const months = this.groupByMonth(primary);
      months.forEach((m) =>
        secondary.push({ label: `${m.month} ${m.year}`, span: m.days })
      );
    } else if (this.zoom === ZOOM_LEVELS.WEEK) {
      const months = this.groupByMonth(primary);
      months.forEach((m) =>
        secondary.push({ label: `${m.month} ${m.year}`, span: m.days })
      );
    } else {
      const years = this.groupByYear(primary);
      years.forEach((y) =>
        secondary.push({ label: y.year.toString(), span: y.days })
      );
    }

    return { primary, secondary };
  }

  groupByMonth(days) {
    const groups = [];
    let currentMonth = null;
    let count = 0;

    days.forEach((day) => {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      if (key !== currentMonth) {
        if (currentMonth !== null) {
          groups.push({
            month: days.find(
              (d) =>
                `${d.date.getFullYear()}-${d.date.getMonth()}` === currentMonth
            )?.monthName,
            year: parseInt(currentMonth.split('-')[0]),
            days: count,
          });
        }
        currentMonth = key;
        count = 1;
      } else {
        count++;
      }
    });

    if (count > 0) {
      groups.push({
        month: days.find(
          (d) => `${d.date.getFullYear()}-${d.date.getMonth()}` === currentMonth
        )?.monthName,
        year: parseInt(currentMonth.split('-')[0]),
        days: count,
      });
    }

    return groups;
  }

  groupByYear(days) {
    const groups = [];
    let currentYear = null;
    let count = 0;

    days.forEach((day) => {
      if (day.year !== currentYear) {
        if (currentYear !== null) {
          groups.push({ year: currentYear, days: count });
        }
        currentYear = day.year;
        count = 1;
      } else {
        count++;
      }
    });

    if (count > 0) {
      groups.push({ year: currentYear, days: count });
    }

    return groups;
  }

  calculateTaskPosition(task, range) {
    if (!task.startDate || !task.endDate || !range) {
      return { left: 0, width: 0, visible: false };
    }

    const { cellWidth } = this.getZoomConfig();
    const startOffset = Math.floor((task.startDate - range.start) / MS_DAY);
    const duration = Math.ceil((task.endDate - task.startDate) / MS_DAY) + 1;

    return {
      left: startOffset * cellWidth,
      width: duration * cellWidth - 4,
      visible: true,
      startOffset,
      duration,
    };
  }

  validateDependencies(tasks) {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const errors = [];

    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (taskId, path = []) => {
      if (recursionStack.has(taskId)) {
        errors.push({
          type: 'circular',
          path: [...path, taskId],
          message: `Circular dependency detected: ${[...path, taskId].join(' → ')}`,
        });
        return true;
      }

      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task?.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskMap.has(depId)) {
            errors.push({
              type: 'missing',
              taskId,
              dependencyId: depId,
              message: `Task "${task.title}" depends on non-existent task`,
            });
            continue;
          }
          if (hasCycle(depId, [...path, taskId])) return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    tasks.forEach((task) => hasCycle(task.id));

    return { valid: errors.length === 0, errors };
  }

  getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / MS_DAY + 1) / 7);
  }

  getTodayOffset(range) {
    if (!range) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = Math.floor((today - range.start) / MS_DAY);
    const { cellWidth } = this.getZoomConfig();
    return Math.max(0, offset * cellWidth - 200);
  }
}
