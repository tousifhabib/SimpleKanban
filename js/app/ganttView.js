// Gantt view as a closure factory. Zoom is view-local state; all math is
// pure (domain/gantt/timeline.js); the derived model is memoized on the
// immutable inputs so re-renders with unchanged state skip recomputation.

import { el } from '../utils/domUtils.js';
import { memoizeLast } from '../fp/memo.js';
import {
  ZOOM_LEVELS,
  ZOOM_CONFIG,
  DEFAULT_ZOOM,
  toGanttData,
  timelineHeaders,
  taskPosition,
  todayOffset,
  layoutTasks,
} from '../domain/gantt/timeline.js';
import {
  renderToolbar,
  renderTimelineGrid,
  renderSidebarTasks,
  renderTimelineHeader,
  renderTaskBars,
  renderDependencyLines,
  renderUnscheduledSection,
} from '../views/gantt/GanttRenderers.js';

export const createGanttView = (
  container,
  {
    getBoard,
    getLabels,
    getLang,
    now,
    t,
    onCardClick = () => {},
    onNavigateBack = () => {},
  }
) => {
  let zoom = DEFAULT_ZOOM;
  let data = null;

  // Derived model, recomputed only when an input reference changes —
  // board and labels are immutable, so identity tracks content.
  const deriveModel = memoizeLast((board, labels, currentZoom, lang) => {
    const ganttData = toGanttData(board, labels, now());
    return {
      data: ganttData,
      headers: timelineHeaders(ganttData.range, {
        zoom: currentZoom,
        lang,
        now: now(),
      }),
      layout: layoutTasks(ganttData.scheduled),
    };
  });

  const scrollToToday = () => {
    const timeline = container.querySelector('#ganttTimeline');
    if (timeline && data?.range) {
      timeline.scrollLeft = todayOffset(zoom, data.range, now());
    }
  };

  const bindEvents = () => {
    container.querySelectorAll('[data-action="zoom"]').forEach((btn) => {
      btn.addEventListener('click', () => setZoom(btn.dataset.level));
    });
    container
      .querySelector('[data-action="back"]')
      ?.addEventListener('click', () => onNavigateBack());
    container
      .querySelector('[data-action="today"]')
      ?.addEventListener('click', () => scrollToToday());
    container.querySelectorAll('[data-task-id]').forEach((elem) => {
      elem.addEventListener('click', () => {
        const taskId = elem.dataset.taskId;
        const task = [...data.scheduled, ...data.unscheduled].find(
          (item) => item.id === taskId
        );
        if (task) onCardClick(task.card, task.column.id);
      });
    });

    const timeline = container.querySelector('.gantt-timeline');
    const sidebarContent = container.querySelector('.gantt-sidebar-content');
    if (timeline && sidebarContent) {
      timeline.addEventListener(
        'scroll',
        () => (sidebarContent.scrollTop = timeline.scrollTop)
      );
      sidebarContent.addEventListener(
        'scroll',
        () => (timeline.scrollTop = sidebarContent.scrollTop)
      );
    }
  };

  const render = () => {
    const model = deriveModel(getBoard(), getLabels(), zoom, getLang());
    data = model.data;
    const { headers, layout } = model;
    const zoomCfg = ZOOM_CONFIG[zoom];
    const calculatePosition = taskPosition(zoom);

    container.replaceChildren(
      el(
        'div',
        { class: 'gantt-wrapper' },
        renderToolbar(zoom, ZOOM_LEVELS, t),
        el(
          'div',
          { class: 'gantt-container' },
          el(
            'div',
            { class: 'gantt-sidebar' },
            el(
              'div',
              { class: 'gantt-sidebar-header' },
              el('span', {}, t('gantt.taskName'))
            ),
            el(
              'div',
              { class: 'gantt-sidebar-content' },
              renderSidebarTasks(layout)
            )
          ),
          el(
            'div',
            { class: 'gantt-timeline', id: 'ganttTimeline' },
            el(
              'div',
              { class: 'gantt-timeline-header' },
              renderTimelineHeader(headers, zoomCfg.cellWidth, zoom)
            ),
            el(
              'div',
              {
                class: 'gantt-timeline-body',
                style: {
                  height: `${layout.totalHeight}px`,
                  minHeight: `${layout.totalHeight}px`,
                },
              },
              renderTimelineGrid(headers, layout, zoomCfg.cellWidth),
              renderTaskBars(layout, calculatePosition, data.range),
              renderDependencyLines(layout, calculatePosition, data.range)
            )
          )
        ),
        data.unscheduled.length
          ? renderUnscheduledSection(data.unscheduled, t)
          : null
      )
    );

    bindEvents();
    scrollToToday();
  };

  const setZoom = (level) => {
    if (ZOOM_CONFIG[level]) {
      zoom = level;
      render();
    }
  };

  render();

  return Object.freeze({
    render,
    destroy: () => container.replaceChildren(),
  });
};
