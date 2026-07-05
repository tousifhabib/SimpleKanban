import { i18n } from '../../services/i18n/i18nService.js';
import { el } from '../../utils/domUtils.js';
import {
  formatDate,
  getTimeAgo,
  getAgingLevel,
  getDueDateStatus,
} from '../../utils/dateUtils.js';

const DUE_STATUS_KEYS = {
  overdue: 'card.dueStatus.overdue',
  'due-today': 'card.dueStatus.today',
  'due-soon': 'card.dueStatus.soon',
};

// Pure view: a function of (card, ctx). ctx carries board-level data the
// card needs — currently the label definitions.
export const renderCard = (card, ctx = {}) => {
  const {
    id,
    priority,
    completed,
    text,
    labels,
    description,
    logs,
    startDate,
    dueDate,
    effort,
    updatedAt,
  } = card;
  const hasDesc = description?.trim() || logs?.length > 0;
  const ageLevel = getAgingLevel(updatedAt, completed);

  const classList = [
    'card',
    priority && priority !== 'none' && `priority-${priority}`,
    completed && 'completed',
    hasDesc && 'has-description',
    ageLevel > 0 && `card-aged-${ageLevel}`,
  ]
    .filter(Boolean)
    .join(' ');

  return el(
    'div',
    {
      class: classList,
      // No drag affordance while filters hide cards — a reorder computed
      // from a filtered view would be misleading.
      draggable: !ctx.dragDisabled,
      tabindex: 0,
      'aria-label': text,
      dataset: { cardId: id },
    },
    renderLabels(labels, ctx.labels || []),
    renderContent(completed, text),
    renderMeta({ startDate, dueDate, effort, updatedAt, completed }),
    el('span', { class: 'card-has-description', title: 'Has notes' }, '📝'),
    renderActions()
  );
};

const renderLabels = (labelIds, allLabels) =>
  el(
    'div',
    { class: 'card-labels' },
    (labelIds || []).map((id) => {
      const l = allLabels.find((x) => x.id === id);
      return l
        ? el(
            'span',
            { class: 'card-label', style: { backgroundColor: l.color } },
            l.name
          )
        : null;
    })
  );

const renderContent = (completed, text) =>
  el(
    'div',
    { class: 'card-content' },
    el(
      'label',
      { class: 'card-complete-toggle' },
      el('input', {
        type: 'checkbox',
        class: 'card-complete-checkbox',
        checked: !!completed,
      }),
      el('span', { class: 'card-complete-checkmark' })
    ),
    el('span', { class: 'card-text' }, text)
  );

const renderMeta = ({ startDate, dueDate, effort, updatedAt, completed }) => {
  const chips = [];
  if (startDate)
    chips.push(metaChip('card-start-date', '🟢', formatDate(startDate)));

  if (dueDate) {
    const status = getDueDateStatus(dueDate, completed);
    const statusText =
      status && DUE_STATUS_KEYS[status]
        ? ` (${i18n.t(DUE_STATUS_KEYS[status])})`
        : '';
    chips.push(
      metaChip(
        `card-due-date ${status}`,
        '🔴',
        formatDate(dueDate) + statusText
      )
    );
  }

  if (effort > 0) {
    const ec = effort < 4 ? 'low' : effort < 8 ? 'medium' : 'high';
    chips.push(metaChip(`card-effort effort-${ec}`, '⏱️', `${effort}h`));
  }

  if (updatedAt) {
    chips.push(
      el(
        'div',
        { class: 'card-last-activity' },
        i18n.t('card.meta.updated', { time: getTimeAgo(updatedAt) })
      )
    );
  }

  return el('div', { class: 'card-meta' }, chips);
};

const metaChip = (className, icon, text) =>
  el(
    'span',
    { class: className },
    el('span', { class: 'meta-icon' }, icon),
    ' ',
    text
  );

const renderActions = () =>
  el(
    'div',
    { class: 'card-actions' },
    ['edit', 'duplicate', 'delete'].map((action) => {
      const icons = { edit: '✏️', duplicate: '📋', delete: '🗑' };
      const titles = { edit: 'Edit', duplicate: 'Duplicate', delete: 'Delete' };
      return el(
        'button',
        {
          class: 'card-action-btn',
          title: titles[action],
          'aria-label': `${titles[action]} card`,
          dataset: { action },
        },
        icons[action]
      );
    })
  );
