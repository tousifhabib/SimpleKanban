import { el } from '../../utils/domUtils.js';
import { formatDate } from '../../utils/dateUtils.js';

export const renderToolbar = (currentZoom, zoomLevels, t) =>
  el(
    'div',
    { class: 'gantt-toolbar' },
    el(
      'div',
      { class: 'gantt-toolbar-left' },
      el(
        'button',
        { class: 'gantt-back-btn', dataset: { action: 'back' } },
        el('span', {}, '←'),
        ' ',
        el('span', {}, t('gantt.backToKanban'))
      ),
      el('h2', { class: 'gantt-title' }, t('gantt.title'))
    ),
    el(
      'div',
      { class: 'gantt-toolbar-center' },
      el(
        'div',
        { class: 'gantt-zoom-controls' },
        Object.values(zoomLevels).map((level) =>
          el(
            'button',
            {
              class: `zoom-btn ${currentZoom === level ? 'active' : ''}`,
              dataset: { action: 'zoom', level },
            },
            t(`gantt.zoomLevels.${level}`)
          )
        )
      )
    ),
    el(
      'div',
      { class: 'gantt-toolbar-right' },
      el(
        'button',
        { class: 'gantt-today-btn', dataset: { action: 'today' } },
        t('gantt.today')
      )
    )
  );

export const renderTimelineGrid = (headers, layout, cellWidth) => {
  const totalWidth = headers.primary.length * cellWidth;
  return el(
    'div',
    {
      class: 'gantt-grid',
      style: { width: `${totalWidth}px`, height: `${layout.totalHeight}px` },
    },
    headers.primary.map((_, i) =>
      el('div', {
        class: 'gantt-grid-col',
        style: {
          left: `${i * cellWidth}px`,
          width: `${cellWidth}px`,
          height: `${layout.totalHeight}px`,
        },
      })
    ),
    layout.groups.map((group) =>
      el('div', {
        class: 'gantt-grid-row group-bg',
        style: {
          top: `${group.y}px`,
          width: `${totalWidth}px`,
          height: '32px',
        },
      })
    ),
    layout.groups
      .flatMap((g) => g.tasks)
      .map((task) =>
        el('div', {
          class: 'gantt-grid-row',
          style: {
            top: `${task.y}px`,
            width: `${totalWidth}px`,
            height: '48px',
          },
        })
      )
  );
};

export const renderSidebarTasks = (layout) =>
  layout.groups.map((group) =>
    el(
      'div',
      { class: 'gantt-group' },
      el(
        'div',
        { class: 'gantt-group-header', style: { height: '32px' } },
        el('span', { class: 'gantt-group-title' }, group.column.title),
        el('span', { class: 'gantt-group-count' }, group.tasks.length)
      ),
      group.tasks.map((task) =>
        el(
          'div',
          {
            class: `gantt-sidebar-row ${task.completed ? 'completed' : ''}`,
            dataset: { taskId: task.id },
            style: { height: '48px' },
          },
          el(
            'div',
            { class: 'gantt-task-info' },
            el('span', {
              class: `gantt-task-priority priority-${task.priority}`,
            }),
            el('span', { class: 'gantt-task-title' }, task.title)
          )
        )
      )
    )
  );

export const renderTimelineHeader = (headers, cellWidth, currentZoom) => {
  if (!headers?.primary.length) return el('div');
  const totalWidth = headers.primary.length * cellWidth;

  return el(
    'div',
    {},
    el(
      'div',
      {
        class: 'gantt-header-row secondary',
        style: { width: `${totalWidth}px`, height: '32px' },
      },
      headers.secondary.map((h) =>
        el(
          'div',
          {
            class: 'gantt-header-cell',
            style: { width: `${h.span * cellWidth}px` },
          },
          h.label
        )
      )
    ),
    el(
      'div',
      {
        class: 'gantt-header-row primary',
        style: { width: `${totalWidth}px`, height: '36px' },
      },
      headers.primary.map((day) =>
        el(
          'div',
          {
            class: [
              'gantt-header-cell',
              'day',
              day.isWeekend && 'weekend',
              day.isToday && 'today',
              `zoom-${currentZoom}`,
            ]
              .filter(Boolean)
              .join(' '),
            style: {
              width: `${cellWidth}px`,
              minWidth: `${cellWidth}px`,
              flex: `0 0 ${cellWidth}px`,
            },
          },
          el('span', { class: 'day-number' }, day.dayOfMonth),
          el('span', { class: 'day-name' }, day.dayOfWeek)
        )
      )
    )
  );
};

export const renderTaskBars = (layout, calculatePosition, range) => {
  const barHeight = 28;
  const barOffset = (48 - barHeight) / 2;

  return el(
    'div',
    { class: 'gantt-bars' },
    layout.groups.flatMap((group) =>
      group.tasks.map((task) => {
        const pos = calculatePosition(task, range);
        if (!pos.visible) return null;
        return el(
          'div',
          {
            class: `gantt-bar priority-${task.priority} ${task.completed ? 'completed' : ''}`,
            dataset: { taskId: task.id },
            style: {
              left: `${pos.left}px`,
              top: `${task.y + barOffset}px`,
              width: `${pos.width}px`,
              height: `${barHeight}px`,
            },
          },
          el(
            'div',
            { class: 'gantt-bar-content' },
            el('span', { class: 'gantt-bar-title' }, task.title)
          ),
          el('div', {
            class: 'gantt-bar-progress',
            style: { width: task.completed ? '100%' : '0%' },
          })
        );
      })
    )
  );
};

export const renderDependencyLines = (layout, calculatePosition, range) => {
  const taskMap = new Map();
  layout.groups.forEach((g) => g.tasks.forEach((t) => taskMap.set(t.id, t)));

  const ROW_HEIGHT = 48;
  const BEND = 10;
  const ARROW_GAP = 20;
  const validColor = '#64748b';
  const invalidColor = '#ef4444';

  const lines = [];

  taskMap.forEach((task) => {
    task.dependencies.forEach((dep) => {
      const depTask = taskMap.get(dep.id);
      if (!depTask) return;

      const pos = calculatePosition(task, range);
      const depPos = calculatePosition(depTask, range);

      if (pos.visible && depPos.visible) {
        let startX, endX, isValid;
        const startY = depTask.y + 24;
        const endY = task.y + 24;
        let d = '';

        if (dep.type === 'SS') {
          startX = depPos.left;
          endX = pos.left;
          isValid = depTask.startDate <= task.startDate;

          if (startX - BEND > endX - ARROW_GAP) {
            const leftX = endX - ARROW_GAP;
            d = `M ${startX} ${startY} H ${leftX} V ${endY} H ${endX}`;
          } else {
            d = `M ${startX} ${startY} H ${startX - BEND} V ${endY} H ${endX}`;
          }
        } else {
          startX = depPos.left + depPos.width;
          endX = pos.left;
          isValid = depTask.endDate <= task.startDate;

          if (endX > startX + BEND * 2) {
            const midX = startX + (endX - startX) / 2;
            d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
          } else {
            const isTargetAbove = endY < startY;
            const gapY = isTargetAbove
              ? startY - ROW_HEIGHT / 2
              : startY + ROW_HEIGHT / 2;

            d = `M ${startX} ${startY} H ${startX + BEND} V ${gapY} H ${endX - ARROW_GAP} V ${endY} H ${endX}`;
          }
        }

        lines.push({ d, valid: isValid });
      }
    });
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'gantt-dependencies');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', `${layout.totalHeight}px`);
  svg.innerHTML = `
    <defs>
      <marker id="arrow-valid" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${validColor}" />
      </marker>
      <marker id="arrow-invalid" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${invalidColor}" />
      </marker>
    </defs>
    ${lines.map((l) => `<path class="gantt-dep-line ${l.valid ? '' : 'invalid'}" d="${l.d}" marker-end="url(#${l.valid ? 'arrow-valid' : 'arrow-invalid'})" />`).join('')}
  `;
  return svg;
};

export const renderUnscheduledSection = (unscheduled, t) =>
  el(
    'div',
    { class: 'gantt-unscheduled' },
    el(
      'div',
      { class: 'gantt-unscheduled-header' },
      el('h3', {}, t('gantt.unscheduled')),
      el(
        'span',
        { class: 'gantt-unscheduled-count' },
        `${unscheduled.length} ${t('gantt.tasks')}`
      )
    ),
    el(
      'div',
      { class: 'gantt-unscheduled-list' },
      unscheduled.map((task) =>
        el(
          'div',
          {
            class: `gantt-unscheduled-item ${task.completed ? 'completed' : ''}`,
            dataset: { taskId: task.id },
          },
          el('span', {
            class: `gantt-task-priority priority-${task.priority}`,
          }),
          el('span', { class: 'gantt-unscheduled-title' }, task.title),
          el('span', { class: 'gantt-unscheduled-column' }, task.column.title),
          task.startDate
            ? el(
                'span',
                { class: 'gantt-unscheduled-date' },
                `🟢 ${formatDate(task.startDate)}`
              )
            : null,
          task.endDate
            ? el(
                'span',
                { class: 'gantt-unscheduled-date' },
                `🔴 ${formatDate(task.endDate)}`
              )
            : null,
          !task.startDate && !task.endDate
            ? el(
                'span',
                { class: 'gantt-unscheduled-hint' },
                t('gantt.noDatesSet')
              )
            : null
        )
      )
    )
  );
