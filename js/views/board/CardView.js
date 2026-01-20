import { store } from '../../state/Store.js';
import { i18n } from '../../services/i18n/i18nService.js';
import { el } from '../../utils/domUtils.js';
import { formatDate, getTimeAgo } from '../../utils/dateUtils.js';

const DUE_STATUS_KEYS = {
  overdue: 'card.dueStatus.overdue',
  'due-today': 'card.dueStatus.today',
  'due-soon': 'card.dueStatus.soon',
};

export default class CardView {
  constructor(cardEntity) {
    this.card = cardEntity;
  }

  render() {
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
    } = this.card;
    const hasDesc = description?.trim() || logs?.length > 0;
    const ageLevel = this.card.getAgingStatus();

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
      { class: classList, draggable: true, dataset: { cardId: id } },
      this.renderLabels(labels),
      this.renderContent(completed, text),
      this.renderMeta(startDate, dueDate, effort, updatedAt),
      el('span', { class: 'card-has-description', title: 'Has notes' }, '📝'),
      this.renderActions()
    );
  }

  renderLabels(labelIds) {
    return el(
      'div',
      { class: 'card-labels' },
      (labelIds || []).map((labelId) => {
        const label = store.getLabels().find((l) => l.id === labelId);
        return label
          ? el(
              'span',
              { class: 'card-label', style: { backgroundColor: label.color } },
              label.name
            )
          : null;
      })
    );
  }

  renderContent(completed, text) {
    return el(
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
  }

  renderMeta(startDate, dueDate, effort, updatedAt) {
    const children = [];

    if (startDate) {
      children.push(
        this.metaChip('card-start-date', '🟢', formatDate(startDate))
      );
    }

    if (dueDate) {
      const status = this.card.getDueDateStatus();
      const statusKey = DUE_STATUS_KEYS[status];
      const statusText = statusKey ? ` (${i18n.t(statusKey)})` : '';
      children.push(
        this.metaChip(
          `card-due-date ${status}`,
          '🔴',
          formatDate(dueDate) + statusText
        )
      );
    }

    if (effort > 0) {
      const effortClass =
        effort < 4
          ? 'effort-low'
          : effort < 8
            ? 'effort-medium'
            : 'effort-high';
      children.push(
        this.metaChip(`card-effort ${effortClass}`, '⏱️', `${effort}h`)
      );
    }

    if (updatedAt) {
      children.push(
        el(
          'div',
          { class: 'card-last-activity' },
          i18n.t('card.meta.updated', { time: getTimeAgo(updatedAt) })
        )
      );
    }

    return el('div', { class: 'card-meta' }, children);
  }

  metaChip(className, icon, text) {
    return el(
      'span',
      { class: className },
      el('span', { class: 'meta-icon' }, icon),
      ' ',
      text
    );
  }

  renderActions() {
    const actions = [
      ['edit', '✏️', 'Edit'],
      ['duplicate', '📋', 'Duplicate'],
      ['delete', '🗑', 'Delete'],
    ];
    return el(
      'div',
      { class: 'card-actions' },
      actions.map(([action, icon, title]) =>
        el(
          'button',
          { class: 'card-action-btn', title, dataset: { action } },
          icon
        )
      )
    );
  }
}
