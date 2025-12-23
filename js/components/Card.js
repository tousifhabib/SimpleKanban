import {addDebugInnerBoxToElement} from "../utils/dragUtils.js";

export default class Card {
    constructor(cardData, columnId, onCardClick) {
        this.cardData = cardData;
        this.columnId = columnId;
        this.onCardClick = onCardClick;
        this.cardEl = null;

        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleCardClick = this.handleCardClick.bind(this);
    }

    createCardElement() {
        const template = document.getElementById('cardTemplate');
        const cardEl = template.content.firstElementChild.cloneNode(true);

        cardEl.dataset.cardId = this.cardData.id;
        cardEl.querySelector('.card-text').textContent = this.cardData.text;
        
        if (this.cardData.description && this.cardData.description.trim()) {
            cardEl.classList.add('has-description');
        }

        cardEl.addEventListener('dragstart', this.handleDragStart);
        cardEl.addEventListener('dragend', this.handleDragEnd);
        cardEl.addEventListener('click', this.handleCardClick);

        return cardEl;
    }

    handleCardClick(e) {
        if (e.target.closest('.card-action-btn') || e.target.closest('.card-actions')) {
            return;
        }
        
        if (e.target.classList.contains('dragging')) {
            return;
        }

        if (this.onCardClick) {
            this.onCardClick(this.cardData.id, this.columnId);
        }
    }

    handleDragStart(e) {
        e.stopPropagation();
        const allCards = document.querySelectorAll('.card');
        allCards.forEach(card => addDebugInnerBoxToElement(card, 0.7));
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
