import Card from './Card.js';
import { i18n } from '../services/i18n/i18nService.js';

export default class Column {
  constructor(columnData) {
    this.columnData = columnData;
  }

  render() {
    const template = document.getElementById('columnTemplate');
    const colEl = template.content.firstElementChild.cloneNode(true);

    colEl.dataset.columnId = this.columnData.id;

    const headerTitle = colEl.querySelector('.column-title-text');
    const totalEffort = this.columnData.cards.reduce(
      (sum, card) => sum + (Number(card.effort) || 0),
      0
    );

    headerTitle.textContent = this.columnData.title;

    if (totalEffort > 0) {
      const summarySpan = document.createElement('span');
      summarySpan.style.fontSize = '0.85rem';
      summarySpan.style.fontWeight = 'normal';
      summarySpan.style.opacity = '0.7';
      summarySpan.style.marginLeft = '8px';
      summarySpan.textContent = `(⏱️ ${totalEffort}h)`;
      headerTitle.appendChild(summarySpan);
    }

    const headerInput = colEl.querySelector('.column-title-input');
    headerInput.value = this.columnData.title;

    const cardsContainer = colEl.querySelector('.cards');
    this.columnData.cards.forEach((cardData) => {
      cardsContainer.appendChild(new Card(cardData).render());
    });

    const addCardBtn = colEl.querySelector('.add-card-btn');
    addCardBtn.textContent = i18n.t('card.addBtnText');

    const cardInput = colEl.querySelector('.card-input');
    cardInput.placeholder = i18n.t('card.addTitle');

    const confirmBtn = colEl.querySelector('[data-action="confirm-add-card"]');
    confirmBtn.textContent = i18n.t('card.btnAdd');

    const cancelBtn = colEl.querySelector('[data-action="cancel-add-card"]');
    cancelBtn.textContent = i18n.t('card.btnCancel');

    return colEl;
  }
}
