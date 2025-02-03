import { store } from '../store.js';
import Card from './Card.js';

export default class Column {
    constructor(columnData) {
        this.columnData = columnData;
        this.columnEl = null;

        this.onAddCardClick = this.onAddCardClick.bind(this);
        this.onConfirmAddCard = this.onConfirmAddCard.bind(this);
        this.onCancelAddCard = this.onCancelAddCard.bind(this);
        this.onDeleteColumnClick = this.onDeleteColumnClick.bind(this);
        this.onColumnHeaderBlur = this.onColumnHeaderBlur.bind(this);
        this.handleColumnDragStart = this.handleColumnDragStart.bind(this);
        this.handleColumnDragEnd = this.handleColumnDragEnd.bind(this);
    }

    createColumnElement() {
        const template = document.getElementById('columnTemplate');
        const colEl = template.content.firstElementChild.cloneNode(true);
        colEl.dataset.columnId = this.columnData.id;

        const header = colEl.querySelector('.column-header h2');
        header.textContent = this.columnData.title;

        const cardsContainer = colEl.querySelector('.cards');
        this.columnData.cards.forEach((cardData) => {
            const card = new Card(cardData, this.columnData.id);
            cardsContainer.appendChild(card.render());
        });

        const addCardBtn = colEl.querySelector('.add-card-btn');
        const addCardForm = colEl.querySelector('.add-card-form');
        const confirmAddCardBtn = addCardForm.querySelector('[data-action="confirm-add-card"]');
        const cancelAddCardBtn = addCardForm.querySelector('[data-action="cancel-add-card"]');
        const deleteColumnBtn = colEl.querySelector('[data-action="delete-column"]');

        addCardBtn.addEventListener('click', this.onAddCardClick);
        confirmAddCardBtn.addEventListener('click', this.onConfirmAddCard);
        cancelAddCardBtn.addEventListener('click', this.onCancelAddCard);
        deleteColumnBtn.addEventListener('click', this.onDeleteColumnClick);
        header.addEventListener('blur', this.onColumnHeaderBlur);

        colEl.addEventListener('dragstart', this.handleColumnDragStart);
        colEl.addEventListener('dragend', this.handleColumnDragEnd);
        colEl.addEventListener('dragover', (e) => e.preventDefault());
        colEl.addEventListener('drop', (e) => e.preventDefault());

        return colEl;
    }

    // -----------
    // Column Event Handlers
    // -----------

    onAddCardClick(e) {
        const colEl = e.currentTarget.closest('.column');
        const addCardBtn = colEl.querySelector('.add-card-btn');
        const addCardForm = colEl.querySelector('.add-card-form');
        addCardBtn.style.display = 'none';
        addCardForm.classList.add('active');
        addCardForm.querySelector('.card-input').focus();
    }

    onConfirmAddCard(e) {
        const colEl = e.currentTarget.closest('.column');
        const addCardForm = colEl.querySelector('.add-card-form');
        const addCardBtn = colEl.querySelector('.add-card-btn');
        const input = addCardForm.querySelector('.card-input');
        const text = input.value.trim();

        if (text) {
            store.addCard(this.columnData.id, text);
        }

        input.value = '';
        addCardForm.classList.remove('active');
        addCardBtn.style.display = 'block';
    }

    onCancelAddCard(e) {
        const colEl = e.currentTarget.closest('.column');
        const addCardForm = colEl.querySelector('.add-card-form');
        const addCardBtn = colEl.querySelector('.add-card-btn');
        addCardForm.classList.remove('active');
        addCardBtn.style.display = 'block';
    }

    onDeleteColumnClick() {
        if (confirm('Delete this column and all its cards?')) {
            store.removeColumn(this.columnData.id);
        }
    }

    onColumnHeaderBlur(e) {
        const newTitle = e.target.textContent.trim() || 'Untitled Column';
        e.target.textContent = newTitle;
        store.updateColumnTitle(this.columnData.id, newTitle);
    }

    // -----------
    // Column Drag Handlers
    // -----------

    handleColumnDragStart(e) {
        const colEl = e.target.closest('.column');
        if (!colEl) return;
        colEl.classList.add('dragging');
        e.dataTransfer.setData('text/column', colEl.dataset.columnId);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleColumnDragEnd(e) {
        const colEl = e.target.closest('.column');
        if (colEl) {
            colEl.classList.remove('dragging');
        }
    }

    // -----------
    // Render
    // -----------

    render() {
        if (!this.columnEl) {
            this.columnEl = this.createColumnElement();
        }
        return this.columnEl;
    }
}
