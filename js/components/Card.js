import {addDebugInnerBoxToElement} from "../utils/dragUtils";

export default class Card {
    constructor(cardData, columnId) {
        this.cardData = cardData;
        this.columnId = columnId;
        this.cardEl = null;

        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
    }

    createCardElement() {
        const template = document.getElementById('cardTemplate');
        const cardEl = template.content.firstElementChild.cloneNode(true);

        cardEl.dataset.cardId = this.cardData.id;
        cardEl.querySelector('.card-text').textContent = this.cardData.text;
        cardEl.addEventListener('dragstart', this.handleDragStart);
        cardEl.addEventListener('dragend', this.handleDragEnd);

        return cardEl;
    }

    handleDragStart(e) {
        e.stopPropagation();
        const allCards = document.querySelectorAll('.card');
        allCards.forEach(card => addDebugInnerBoxToElement(card, 0.8));
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    render() {
        if (!this.cardEl) {
            this.cardEl = this.createCardElement();
        }
        return this.cardEl;
    }
}
