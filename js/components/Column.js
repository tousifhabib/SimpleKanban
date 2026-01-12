import Card from './Card.js';

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

    return colEl;
  }
}
