// Test-harness adapter mapping the legacy GanttManager API onto the pure
// timeline domain, with zoom as closure state.

import { createObservable } from '../../js/core/Observable.js';
import * as timeline from '../../js/domain/gantt/timeline.js';
import { i18n } from '../../js/services/i18n/i18nService.js';

export const legacyGanttManager = () => {
  let zoom = timeline.DEFAULT_ZOOM;
  const observable = createObservable();

  return {
    subscribe: observable.subscribe,
    setZoom(level) {
      if (timeline.ZOOM_CONFIG[level]) {
        zoom = level;
        observable.notify();
      }
    },
    getZoom: () => zoom,
    getZoomConfig: () => timeline.ZOOM_CONFIG[zoom],
    transformToGanttData: (board, labels = []) =>
      timeline.toGanttData(board, labels, new Date()),
    calculateDateRange: (tasks) => timeline.dateRange(tasks, new Date()),
    generateTimelineHeaders: (range) =>
      timeline.timelineHeaders(range, {
        zoom,
        lang: i18n.getLanguage(),
        now: new Date(),
      }),
    calculateTaskPosition: (task, range) =>
      timeline.taskPosition(zoom)(task, range),
    getTodayOffset: (range) => timeline.todayOffset(zoom, range, new Date()),
  };
};
