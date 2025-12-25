import {addDebugInnerBoxToElement} from "../utils/dragUtils.js";
import {store} from "../store.js";

export default class Card {
    constructor(cardData, columnId, onCardClick) {
        this.cardData = cardData;
        this.columnId = columnId;
        this.onCardClick = onCardClick;
        this.cardEl = null;

        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleCardClick = this.handleCardClick.bind(this);
        this.handleCompleteClick = this.handleCompleteClick.bind(this);
    }

    createCardElement() {
        const template = document.getElementById('cardTemplate');
        const cardEl = template.content.firstElementChild.cloneNode(true);

        cardEl.dataset.cardId = this.cardData.id;

        if (this.cardData.priority && this.cardData.priority !== 'none') {
            cardEl.classList.add(`priority-${this.cardData.priority}`);
        }

        if (this.cardData.completed) {
            cardEl.classList.add('completed');
        }

        const labelsContainer = cardEl.querySelector('.card-labels');
        if (labelsContainer && this.cardData.labels && this.cardData.labels.length > 0) {
            const allLabels = store.getLabels();
            this.cardData.labels.forEach(labelId => {
                const label = allLabels.find(l => l.id === labelId);
                if (label) {
                    const labelEl = document.createElement('span');
                    labelEl.className = 'card-label';
                    labelEl.style.backgroundColor = label.color;
                    labelEl.textContent = label.name;
                    labelsContainer.appendChild(labelEl);
                }
            });
        }

        cardEl.querySelector('.card-text').textContent = this.cardData.text;

        if (this.cardData.description && this.cardData.description.trim()) {
            cardEl.classList.add('has-description');
        }

        const metaContainer = cardEl.querySelector('.card-meta');
        if (metaContainer) {
            if (this.cardData.startDate) {
                const startDateEl = document.createElement('span');
                startDateEl.className = 'card-start-date';
                startDateEl.innerHTML = `<span class="meta-icon">🟢</span> ${this.formatDate(this.cardData.startDate)}`;
                metaContainer.appendChild(startDateEl);
            }

            if (this.cardData.dueDate) {
                const dueDateEl = document.createElement('span');
                dueDateEl.className = 'card-due-date ' + this.getDueDateClass();
                dueDateEl.innerHTML = `<span class="meta-icon">🔴</span> ${this.formatDate(this.cardData.dueDate)}`;
                metaContainer.appendChild(dueDateEl);
            }
        }

        const completeCheckbox = cardEl.querySelector('.card-complete-checkbox');
        if (completeCheckbox) {
            completeCheckbox.checked = this.cardData.completed || false;
            completeCheckbox.addEventListener('click', this.handleCompleteClick);
        }

        cardEl.addEventListener('dragstart', this.handleDragStart);
        cardEl.addEventListener('dragend', this.handleDragEnd);
        cardEl.addEventListener('click', this.handleCardClick);

        return cardEl;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    getDueDateClass() {
        if (!this.cardData.dueDate || this.cardData.completed) return '';

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueDate = new Date(this.cardData.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays === 0) return 'due-today';
        if (diffDays <= 2) return 'due-soon';
        return '';
    }

    handleCompleteClick(e) {
        e.stopPropagation();
        store.toggleCardComplete(this.columnId, this.cardData.id);
    }

    handleCardClick(e) {
        if (e.target.closest('.card-action-btn') || e.target.closest('.card-actions')) {
            return;
        }

        if (e.target.closest('.card-complete-checkbox')) {
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