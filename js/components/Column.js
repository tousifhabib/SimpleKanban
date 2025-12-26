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
        headerTitle.textContent = this.columnData.title;

        const headerInput = colEl.querySelector('.column-title-input');
        headerInput.value = this.columnData.title;

        const cardsContainer = colEl.querySelector('.cards');
        this.columnData.cards.forEach((cardData) => {
            cardsContainer.appendChild(new Card(cardData).render());
        });

        return colEl;
    }
}