import { createObservable } from '../core/Observable.js';
import { i18n } from '../services/i18n/i18nService.js';
import {
  MS_DAY,
  isToday,
  isWeekend,
  getWeekNumber,
} from '../utils/dateUtils.js';

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
  observable = createObservable();
  zoom = ZOOM_LEVELS.WEEK;

  subscribe(fn) {
    return this.observable.subscribe(fn);
  }

  notify() {
    this.observable.notify();
  }

  setZoom(level) {
    if (ZOOM_CONFIG[level]) {
      this.zoom = level;
      this.notify();
    }
  }

  getZoom = () => this.zoom;
  getZoomConfig = () => ZOOM_CONFIG[this.zoom];

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

        (task.startDate && task.endDate ? scheduled : unscheduled).push(task);
      });
    });

    return {
      scheduled,
      unscheduled,
      range: this.calculateDateRange(scheduled),
    };
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
      days: Math.ceil((maxDate - minDate) / MS_DAY) + 1,
    };
  }

  generateTimelineHeaders(range) {
    if (!range) return { primary: [], secondary: [] };

    const { start, end } = range;
    const primary = [];
    const secondary = [];
    const current = new Date(start);
    const lang = i18n.getLanguage();

    while (current <= end) {
      primary.push({
        date: new Date(current),
        dayOfMonth: current.getDate(),
        dayOfWeek: current.toLocaleDateString(lang, { weekday: 'short' }),
        isWeekend: isWeekend(current),
        isToday: isToday(current),
        monthName: current.toLocaleDateString(lang, { month: 'short' }),
        year: current.getFullYear(),
        weekNumber: getWeekNumber(current),
      });
      current.setDate(current.getDate() + 1);
    }

    const grouper =
      this.zoom === ZOOM_LEVELS.MONTH ? this.groupByYear : this.groupByMonth;
    grouper(primary).forEach((g) => secondary.push(g));

    return { primary, secondary };
  }

  groupByMonth(days) {
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
  }

  groupByYear(days) {
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
  }

  calculateTaskPosition(task, range) {
    if (!task.startDate || !task.endDate || !range)
      return { left: 0, width: 0, visible: false };

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

  getTodayOffset(range) {
    if (!range) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offset = Math.floor((today - range.start) / MS_DAY);
    return Math.max(0, offset * this.getZoomConfig().cellWidth - 200);
  }
}
