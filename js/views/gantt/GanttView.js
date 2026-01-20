import { store } from '../../state/Store.js';
import GanttManager, { ZOOM_LEVELS } from '../../managers/GanttManager.js';
import { i18n } from '../../services/i18n/i18nService.js';
import { el } from '../../utils/domUtils.js';
import {
  renderToolbar,
  renderTimelineGrid,
  renderSidebarTasks,
  renderTimelineHeader,
  renderTaskBars,
  renderDependencyLines,
  renderUnscheduledSection,
} from './GanttRenderers.js';

export default class GanttView {
  constructor(
    container,
    { onCardClick = () => {}, onNavigateBack = () => {} }
  ) {
    this.container = container;
    this.onCardClick = onCardClick;
    this.onNavigateBack = onNavigateBack;
    this.manager = new GanttManager();
    this.data = null;
    this.headers = null;
    this.layout = { groups: [], totalHeight: 200 };
    this.init();
  }

  init() {
    this.manager.subscribe(() => this.render());
    store.subscribe(() => this.render());
    i18n.subscribe(() => this.render());
    this.render();
  }

  render() {
    const boardState = store.getState();
    const labels = store.getLabels();
    this.data = this.manager.transformToGanttData(boardState, labels);
    this.headers = this.manager.generateTimelineHeaders(this.data.range);

    let currentY = 0;
    this.layout.groups = this.groupTasksByColumn(this.data.scheduled).map(
      (group) => {
        const gY = currentY;
        currentY += 32;
        const tasks = group.tasks.map((task) => {
          const tY = currentY;
          currentY += 48;
          return { ...task, y: tY };
        });
        return { ...group, y: gY, tasks };
      }
    );
    this.layout.totalHeight = Math.max(200, currentY);

    const t = (k, p) => i18n.t(k, p) || k;
    const zoomCfg = this.manager.getZoomConfig();
    const calculatePosition = (task, range) =>
      this.manager.calculateTaskPosition(task, range);

    this.container.replaceChildren(
      el(
        'div',
        { class: 'gantt-wrapper' },
        renderToolbar(this.manager.getZoom(), ZOOM_LEVELS, t),
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
              renderSidebarTasks(this.layout)
            )
          ),
          el(
            'div',
            { class: 'gantt-timeline', id: 'ganttTimeline' },
            el(
              'div',
              { class: 'gantt-timeline-header' },
              renderTimelineHeader(
                this.headers,
                zoomCfg.cellWidth,
                this.manager.getZoom()
              )
            ),
            el(
              'div',
              {
                class: 'gantt-timeline-body',
                style: {
                  height: `${this.layout.totalHeight}px`,
                  minHeight: `${this.layout.totalHeight}px`,
                },
              },
              renderTimelineGrid(this.headers, this.layout, zoomCfg.cellWidth),
              renderTaskBars(this.layout, calculatePosition, this.data.range),
              renderDependencyLines(
                this.layout,
                calculatePosition,
                this.data.range
              )
            )
          )
        ),
        this.data.unscheduled.length
          ? renderUnscheduledSection(this.data.unscheduled, t)
          : null
      )
    );

    this.bindEvents();
    this.scrollToToday();
  }

  groupTasksByColumn(tasks) {
    const grouped = Object.groupBy(tasks, (task) => task.column.id);
    return Object.entries(grouped).map(([, groupTasks]) => ({
      column: groupTasks[0].column,
      tasks: groupTasks,
    }));
  }

  bindEvents() {
    this.container.querySelectorAll('[data-action="zoom"]').forEach((btn) => {
      btn.addEventListener('click', () =>
        this.manager.setZoom(btn.dataset.level)
      );
    });
    this.container
      .querySelector('[data-action="back"]')
      ?.addEventListener('click', () => this.onNavigateBack());
    this.container
      .querySelector('[data-action="today"]')
      ?.addEventListener('click', () => this.scrollToToday());
    this.container.querySelectorAll('[data-task-id]').forEach((elem) => {
      elem.addEventListener('click', () => {
        const taskId = elem.dataset.taskId;
        const task = [...this.data.scheduled, ...this.data.unscheduled].find(
          (t) => t.id === taskId
        );
        if (task) this.onCardClick(task.card, task.column.id);
      });
    });

    const timeline = this.container.querySelector('.gantt-timeline');
    const sidebarContent = this.container.querySelector(
      '.gantt-sidebar-content'
    );
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
  }

  scrollToToday() {
    const timeline = this.container.querySelector('#ganttTimeline');
    if (timeline && this.data.range) {
      timeline.scrollLeft = this.manager.getTodayOffset(this.data.range);
    }
  }

  destroy() {
    this.container.replaceChildren();
  }
}
