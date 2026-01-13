import { store } from '../store.js';
import { i18n } from '../services/i18n/i18nService.js';

export default class Card {
  constructor(cardEntity) {
    this.card = cardEntity;
  }

  render() {
    const template = document.getElementById('cardTemplate');
    const cardEl = template.content.firstElementChild.cloneNode(true);

    cardEl.dataset.cardId = this.card.id;

    if (this.card.priority && this.card.priority !== 'none') {
      cardEl.classList.add(`priority-${this.card.priority}`);
    }

    if (this.card.completed) {
      cardEl.classList.add('completed');
    }

    this.applyAgingStyles(cardEl);

    const labelsContainer = cardEl.querySelector('.card-labels');
    if (this.card.labels && this.card.labels.length > 0) {
      const allLabels = store.getLabels();
      this.card.labels.forEach((labelId) => {
        const label = allLabels.find((l) => l.id === labelId);
        if (!label) return;
        const labelEl = document.createElement('span');
        labelEl.className = 'card-label';
        labelEl.style.backgroundColor = label.color;
        labelEl.textContent = label.name;
        labelsContainer.appendChild(labelEl);
      });
    }

    cardEl.querySelector('.card-text').textContent = this.card.text;

    if (
      (this.card.description && this.card.description.trim()) ||
      (this.card.logs && this.card.logs.length > 0)
    ) {
      cardEl.classList.add('has-description');
    }

    const metaContainer = cardEl.querySelector('.card-meta');
    if (metaContainer) {
      if (this.card.startDate) {
        metaContainer.appendChild(
          this.metaChip(
            'card-start-date',
            '🟢',
            this.formatDate(this.card.startDate)
          )
        );
      }

      if (this.card.dueDate) {
        const statusClass = this.card.getDueDateStatus();
        let statusText = '';
        if (statusClass === 'overdue')
          statusText = i18n.t('card.dueStatus.overdue');
        else if (statusClass === 'due-today')
          statusText = i18n.t('card.dueStatus.today');
        else if (statusClass === 'due-soon')
          statusText = i18n.t('card.dueStatus.soon');

        const dateText =
          this.formatDate(this.card.dueDate) +
          (statusText ? ` (${statusText})` : '');

        metaContainer.appendChild(
          this.metaChip(`card-due-date ${statusClass}`, '🔴', dateText)
        );
      }

      if (this.card.effort > 0) {
        let effortClass = 'card-effort';
        const val = this.card.effort;
        if (val < 4) {
          effortClass += ' effort-low';
        } else if (val < 8) {
          effortClass += ' effort-medium';
        } else {
          effortClass += ' effort-high';
        }

        metaContainer.appendChild(this.metaChip(effortClass, '⏱️', `${val}h`));
      }

      if (this.card.updatedAt) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'card-last-activity';
        activityDiv.textContent = i18n.t('card.meta.updated', {
          time: this.getTimeAgo(this.card.updatedAt),
        });
        metaContainer.appendChild(activityDiv);
      }
    }

    const completeCheckbox = cardEl.querySelector('.card-complete-checkbox');
    if (completeCheckbox) {
      completeCheckbox.checked = this.card.completed || false;
    }

    return cardEl;
  }

  applyAgingStyles(cardEl) {
    const ageLevel = this.card.getAgingStatus();
    if (ageLevel > 0) {
      cardEl.classList.add(`card-aged-${ageLevel}`);
    }
  }

  metaChip(className, icon, text) {
    const el = document.createElement('span');
    el.className = className;
    el.innerHTML = `<span class="meta-icon">${icon}</span> ${text}`;
    return el;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.getLanguage(), {
      month: 'short',
      day: 'numeric',
    });
  }

  getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return i18n.t('card.meta.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return i18n.t('card.meta.minsAgo', { m: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return i18n.t('card.meta.hoursAgo', { h: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return i18n.t('card.meta.daysAgo', { d: days });

    return date.toLocaleDateString(i18n.getLanguage(), {
      month: 'short',
      day: 'numeric',
    });
  }
}
