import { store } from '../store.js';
import GanttManager, { ZOOM_LEVELS } from '../managers/GanttManager.js';
import { i18n } from '../services/i18n/i18nService.js';
import { formatDate } from '../utils/dateUtils.js';

const renderToolbar = (currentZoom, t) => `
  <div class="gantt-toolbar">
    <div class="gantt-toolbar-left">
      <button class="gantt-back-btn" data-action="back"><span>←</span> <span>${t('gantt.backToKanban')}</span></button>
      <h2 class="gantt-title">${t('gantt.title')}</h2>
    </div>
    <div class="gantt-toolbar-center">
      <div class="gantt-zoom-controls">
        ${Object.values(ZOOM_LEVELS)
          .map(
            (level) => `
          <button class="zoom-btn ${currentZoom === level ? 'active' : ''}" data-action="zoom" data-level="${level}">
            ${t(`gantt.zoomLevels.${level}`)}
          </button>
        `
          )
          .join('')}
      </div>
    </div>
    <div class="gantt-toolbar-right">
      <button class="gantt-today-btn" data-action="today">${t('gantt.today')}</button>
    </div>
  </div>
`;

const renderTimelineGrid = (headers, layout, safePx, zoomCfg) => {
  const totalWidthPx = safePx(headers.primary.length * zoomCfg.cellWidth);
  const totalHeightPx = safePx(layout.totalHeight);

  return `
    <div class="gantt-grid" style="width: ${totalWidthPx}; height: ${totalHeightPx}">
      ${headers.primary
        .map(
          (_, i) =>
            `<div class="gantt-grid-col" style="left: ${safePx(i * zoomCfg.cellWidth)}; width: ${safePx(zoomCfg.cellWidth)}; height: ${totalHeightPx}"></div>`
        )
        .join('')}
      ${layout.groups
        .map(
          (group) =>
            `<div class="gantt-grid-row group-bg" style="top: ${safePx(group.y)}; width: ${totalWidthPx}; height: 32px"></div>`
        )
        .join('')}
      ${layout.groups
        .flatMap((g) => g.tasks)
        .map(
          (task) =>
            `<div class="gantt-grid-row" style="top: ${safePx(task.y)}; width: ${totalWidthPx}; height: 48px"></div>`
        )
        .join('')}
    </div>
  `;
};

const renderSidebarTasks = (layout) => {
  return layout.groups
    .map(
      (group) => `
      <div class="gantt-group">
        <div class="gantt-group-header" style="height: 32px">
          <span class="gantt-group-title">${group.column.title}</span>
          <span class="gantt-group-count">${group.tasks.length}</span>
        </div>
        ${group.tasks
          .map(
            (task) => `
          <div class="gantt-sidebar-row ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" style="height: 48px">
            <div class="gantt-task-info">
              <span class="gantt-task-priority priority-${task.priority}"></span>
              <span class="gantt-task-title">${task.title}</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    )
    .join('');
};

const renderTimelineHeader = (headers, safePx, zoomCfg, currentZoom) => {
  if (!headers || !headers.primary.length) return '';
  const totalWidth = headers.primary.length * zoomCfg.cellWidth;
  const totalWidthPx = safePx(totalWidth);

  return `
    <div class="gantt-header-row secondary" style="width: ${totalWidthPx}; height: 32px">
      ${headers.secondary
        .map(
          (h) => `
        <div class="gantt-header-cell" style="width: ${safePx(h.span * zoomCfg.cellWidth)}">${h.label}</div>
      `
        )
        .join('')}
    </div>
    <div class="gantt-header-row primary" style="width: ${totalWidthPx}; height: 36px">
      ${headers.primary
        .map((day) => {
          const classList = ['gantt-header-cell', 'day'];
          if (day.isWeekend) classList.push('weekend');
          if (day.isToday) classList.push('today');
          classList.push(`zoom-${currentZoom}`);
          return `
          <div class="${classList.join(' ')}" 
               style="width: ${safePx(zoomCfg.cellWidth)}; min-width: ${safePx(zoomCfg.cellWidth)}; flex: 0 0 ${safePx(zoomCfg.cellWidth)}">
            <span class="day-number">${day.dayOfMonth}</span>
            <span class="day-name">${day.dayOfWeek}</span>
          </div>
        `;
        })
        .join('')}
    </div>
    `;
};

const renderTaskBars = (layout, manager, range, safePx) => {
  const barHeight = 28;
  const barOffset = (48 - barHeight) / 2;

  return `
    <div class="gantt-bars">
      ${layout.groups
        .flatMap((group) => group.tasks)
        .map((task) => {
          const pos = manager.calculateTaskPosition(task, range);
          if (!pos.visible) return '';
          return `
          <div class="gantt-bar priority-${task.priority} ${task.completed ? 'completed' : ''}"
               data-task-id="${task.id}"
               style="left: ${safePx(pos.left)}; top: ${safePx(task.y + barOffset)}; width: ${safePx(pos.width)}; height: ${safePx(barHeight)}">
            <div class="gantt-bar-content">
              <span class="gantt-bar-title">${task.title}</span>
            </div>
            <div class="gantt-bar-progress" style="width: ${task.completed ? 100 : 0}%"></div>
          </div>
        `;
        })
        .join('')}
    </div>
    `;
};

const renderDependencyLines = (layout, manager, range, safePx) => {
  const taskMap = new Map();
  layout.groups.forEach((g) => g.tasks.forEach((t) => taskMap.set(t.id, t)));
  const lines = [];

  const ROW_HEIGHT = 48;
  const BEND = 12;
  const ARROW_OFFSET = 28;

  taskMap.forEach((task) => {
    task.dependencies.forEach((depId) => {
      const depTask = taskMap.get(depId);
      if (!depTask) return;

      const pos = manager.calculateTaskPosition(task, range);
      const depPos = manager.calculateTaskPosition(depTask, range);

      if (pos.visible && depPos.visible) {
        const startX = depPos.left + depPos.width;
        const startY = depTask.y + 24;
        const endX = pos.left;
        const endY = task.y + 24;

        const isForward = endX > startX + BEND * 2;
        let d = '';

        if (isForward) {
          const midX = startX + (endX - startX) / 2;
          d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
        } else {
          const isTargetAbove = endY < startY;
          const gapY = isTargetAbove
            ? startY - ROW_HEIGHT / 2
            : startY + ROW_HEIGHT / 2;
          d = [
            `M ${startX} ${startY}`,
            `H ${startX + BEND}`,
            `V ${gapY}`,
            `H ${endX - ARROW_OFFSET}`,
            `V ${endY}`,
            `H ${endX}`,
          ].join(' ');
        }
        lines.push({ d, valid: depTask.endDate <= task.startDate });
      }
    });
  });

  const validColor = '#64748b';
  const invalidColor = '#ef4444';
  const totalHeightStr = safePx(layout.totalHeight);

  return `
    <svg class="gantt-dependencies" width="100%" height="${totalHeightStr}">
      <defs>
        <marker id="arrow-valid" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${validColor}" />
        </marker>
        <marker id="arrow-invalid" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${invalidColor}" />
        </marker>
      </defs>
      ${lines.map((l) => `<path class="gantt-dep-line ${l.valid ? '' : 'invalid'}" d="${l.d}" marker-end="url(#${l.valid ? 'arrow-valid' : 'arrow-invalid'})" />`).join('')}
    </svg>
    `;
};

const renderUnscheduledSection = (data) => {
  const t = (key, params) => i18n.t(key, params) || key;
  return `
      <div class="gantt-unscheduled">
        <div class="gantt-unscheduled-header">
          <h3>${t('gantt.unscheduled')}</h3>
          <span class="gantt-unscheduled-count">${data.unscheduled.length} ${t('gantt.tasks')}</span>
        </div>
        <div class="gantt-unscheduled-list">
          ${data.unscheduled
            .map(
              (task) => `
            <div class="gantt-unscheduled-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
              <span class="gantt-task-priority priority-${task.priority}"></span>
              <span class="gantt-unscheduled-title">${task.title}</span>
              <span class="gantt-unscheduled-column">${task.column.title}</span>
              ${task.startDate ? `<span class="gantt-unscheduled-date">🟢 ${formatDate(task.startDate)}</span>` : ''}
              ${task.endDate ? `<span class="gantt-unscheduled-date">🔴 ${formatDate(task.endDate)}</span>` : ''}
              ${!task.startDate && !task.endDate ? `<span class="gantt-unscheduled-hint">${t('gantt.noDatesSet')}</span>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
};

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

  safePx(val) {
    return (Number.isNaN(parseFloat(val)) ? 0 : parseFloat(val)) + 'px';
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
    const totalHeightStr = this.safePx(this.layout.totalHeight);
    const zoomCfg = this.manager.getZoomConfig();

    this.container.innerHTML = `
      <div class="gantt-wrapper">
        ${renderToolbar(this.manager.getZoom(), t)}
        <div class="gantt-container">
          <div class="gantt-sidebar">
            <div class="gantt-sidebar-header"><span>${t('gantt.taskName')}</span></div>
            <div class="gantt-sidebar-content">${renderSidebarTasks(this.layout)}</div>
          </div>
          <div class="gantt-timeline" id="ganttTimeline">
            <div class="gantt-timeline-header">${renderTimelineHeader(this.headers, this.safePx, zoomCfg, this.manager.getZoom())}</div>
            <div class="gantt-timeline-body" style="height: ${totalHeightStr}; min-height: ${totalHeightStr};">
              ${renderTimelineGrid(this.headers, this.layout, this.safePx, zoomCfg)}
              ${renderTaskBars(this.layout, this.manager, this.data.range, this.safePx)}
              ${renderDependencyLines(this.layout, this.manager, this.data.range, this.safePx)}
            </div>
          </div>
        </div>
        ${this.data.unscheduled.length ? renderUnscheduledSection(this.data) : ''}
      </div>
    `;

    this.bindEvents();
    this.scrollToToday();
  }

  groupTasksByColumn(tasks) {
    const groups = new Map();
    tasks.forEach((task) => {
      const colId = task.column.id;
      if (!groups.has(colId))
        groups.set(colId, { column: task.column, tasks: [] });
      groups.get(colId).tasks.push(task);
    });
    return Array.from(groups.values());
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
    this.container.querySelectorAll('[data-task-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const taskId = el.dataset.taskId;
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
      const offset = this.manager.getTodayOffset(this.data.range);
      timeline.scrollLeft = offset;
    }
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
