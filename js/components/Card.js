import { store } from '../store.js';
import { i18n } from '../services/i18n/i18nService.js';
import { el } from '../utils/dom.js';
import { formatDate, getTimeAgo } from '../utils/dateUtils.js';

export default class Card {
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
    const hasDesc =
      (description && description.trim()) || (logs && logs.length > 0);
    const ageLevel = this.card.getAgingStatus();

    // 1. Labels
    const labelEls = (labels || []).map((labelId) => {
      const label = store.getLabels().find((l) => l.id === labelId);
      return label
        ? el(
            'span',
            { class: 'card-label', style: { backgroundColor: label.color } },
            label.name
          )
        : null;
    });

    // 2. Meta Chips
    const metaChildren = [];

    if (startDate) {
      metaChildren.push(
        this.metaChip('card-start-date', '🟢', formatDate(startDate))
      );
    }

    if (dueDate) {
      const statusClass = this.card.getDueDateStatus();
      const statusTextMap = {
        overdue: 'card.dueStatus.overdue',
        'due-today': 'card.dueStatus.today',
        'due-soon': 'card.dueStatus.soon',
      };
      const statusText = statusTextMap[statusClass]
        ? ` (${i18n.t(statusTextMap[statusClass])})`
        : '';

      metaChildren.push(
        this.metaChip(
          `card-due-date ${statusClass}`,
          '🔴',
          formatDate(dueDate) + statusText
        )
      );
    }

    if (effort > 0) {
      const effortClass = `card-effort ${effort < 4 ? 'effort-low' : effort < 8 ? 'effort-medium' : 'effort-high'}`;
      metaChildren.push(this.metaChip(effortClass, '⏱️', `${effort}h`));
    }

    if (updatedAt) {
      metaChildren.push(
        el(
          'div',
          { class: 'card-last-activity' },
          i18n.t('card.meta.updated', { time: getTimeAgo(updatedAt) })
        )
      );
    }

    // 3. Construct Card Tree
    return el(
      'div',
      {
        class: `card ${priority && priority !== 'none' ? `priority-${priority}` : ''} ${completed ? 'completed' : ''} ${hasDesc ? 'has-description' : ''} ${ageLevel > 0 ? `card-aged-${ageLevel}` : ''}`,
        draggable: true,
        dataset: { cardId: id },
      },
      el('div', { class: 'card-labels' }, labelEls),
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
      ),
      el('div', { class: 'card-meta' }, metaChildren),
      el('span', { class: 'card-has-description', title: 'Has notes' }, '📝'),
      el(
        'div',
        { class: 'card-actions' },
        this.actionBtn('edit', '✏️', 'Edit'),
        this.actionBtn('duplicate', '📋', 'Duplicate'),
        this.actionBtn('delete', '🗑', 'Delete')
      )
    );
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

  actionBtn(action, icon, title) {
    return el(
      'button',
      { class: 'card-action-btn', title, dataset: { action } },
      icon
    );
  }
}
