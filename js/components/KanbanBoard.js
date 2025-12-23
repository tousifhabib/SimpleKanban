import {store} from '../store.js';
import Column from './Column.js';
import {
    addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement
} from '../utils/dragUtils.js';
import {performFlipAnimation} from '../utils/flipAnimation.js';
import {CONFIG} from './kanbanBoardConfig.js';

export default class KanbanBoard {
    constructor() {
        this.kanbanContainer = document.getElementById(CONFIG.selectors.kanbanContainer);
        this.addColumnModal = document.getElementById(CONFIG.selectors.addColumnModal);
        this.modalOverlay = document.getElementById(CONFIG.selectors.modalOverlay);
        this.addColumnForm = document.getElementById(CONFIG.selectors.addColumnForm);
        this.columnTitleInput = document.getElementById(CONFIG.selectors.columnTitleInput);
        this.addColumnBtn = document.getElementById(CONFIG.selectors.addColumnBtn);
        this.cancelAddColumnBtn = document.getElementById(CONFIG.selectors.cancelAddColumn);

        this.cardDetailModal = document.getElementById('cardDetailModal');
        this.cardDetailOverlay = document.getElementById('cardDetailOverlay');
        this.cardDetailForm = document.getElementById('cardDetailForm');
        this.cardTitleInput = document.getElementById('cardTitleInput');
        this.cardDescriptionInput = document.getElementById('cardDescriptionInput');
        this.cardDetailCloseBtn = document.getElementById('cardDetailCloseBtn');
        this.cancelCardDetailBtn = document.getElementById('cancelCardDetail');

        this.currentCardId = null;
        this.currentColumnId = null;

        this.DEBUG_RATIO = CONFIG.values.debugRatio;

        this.dragState = {
            active: false,
            element: null,
            type: null,
            offsetX: 0,
            offsetY: 0,
            rect: null,
            cachedTargets: [],
            lastX: 0,
            lastY: 0,
            direction: null
        };

        this.lastSwappedElement = null;
        this.lastAfterElement = null;

        this._lastLoggedContainer = null;

        this.handleCardClick = this.handleCardClick.bind(this);

        store.subscribe(() => this.render());
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        this.kanbanContainer.addEventListener('dragstart', e => {
            const card = e.target.closest('.card');
            const col = e.target.closest('.column');
            if (card) return this.handleDragStart(e, card, 'card');
            if (col) return this.handleDragStart(e, col, 'column');
        }, true);

        this.kanbanContainer.addEventListener('dragover', e => {
            e.preventDefault();
            if (!this.dragState.active) return;
            this.handleDragOver(e);
        });

        this.kanbanContainer.addEventListener('drop', e => {
            e.preventDefault();
            this.handleDrop(e);
        });

        this.kanbanContainer.addEventListener('dragenter', e => e.preventDefault());

        document.addEventListener('click', e => this.handleClick(e));

        this.setupModalListeners();
        this.setupCardDetailModalListeners();
    }

    setupModalListeners() {
        this.addColumnBtn.addEventListener('click', () => this.openAddColumnModal());
        this.cancelAddColumnBtn.addEventListener('click', () => this.closeAddColumnModal());
        this.modalOverlay.addEventListener('click', () => this.closeAddColumnModal());
        this.addColumnForm.addEventListener('submit', e => {
            e.preventDefault();
            const title = this.columnTitleInput.value.trim();
            if (title) store.addColumn(title);
            this.closeAddColumnModal();
        });

        document.addEventListener('keydown', e => {
            if (e.key === CONFIG.keys.escape) {
                if (this.addColumnModal.classList.contains('active')) {
                    this.closeAddColumnModal();
                }
                if (this.cardDetailModal.classList.contains('active')) {
                    this.closeCardDetailModal();
                }
            }
        });
    }

    setupCardDetailModalListeners() {
        this.cardDetailCloseBtn.addEventListener('click', () => this.closeCardDetailModal());
        this.cancelCardDetailBtn.addEventListener('click', () => this.closeCardDetailModal());
        this.cardDetailOverlay.addEventListener('click', () => this.closeCardDetailModal());
        
        this.cardDetailForm.addEventListener('submit', e => {
            e.preventDefault();
            this.saveCardDetails();
        });
    }

    handleCardClick(cardId, columnId) {
        this.openCardDetailModal(cardId, columnId);
    }

    openCardDetailModal(cardId, columnId) {
        const result = store.getCard(cardId);
        if (!result) return;

        const { card } = result;
        this.currentCardId = cardId;
        this.currentColumnId = columnId;

        this.cardTitleInput.value = card.text || '';
        this.cardDescriptionInput.value = card.description || '';

        this.cardDetailModal.classList.add('active');
        this.cardDetailModal.setAttribute('aria-hidden', 'false');
        
        this.cardTitleInput.focus();
        this.cardTitleInput.select();
    }

    closeCardDetailModal() {
        this.cardDetailModal.classList.remove('active');
        this.cardDetailModal.setAttribute('aria-hidden', 'true');
        this.cardDetailForm.reset();
        this.currentCardId = null;
        this.currentColumnId = null;
    }

    saveCardDetails() {
        if (!this.currentCardId || !this.currentColumnId) return;

        const newTitle = this.cardTitleInput.value.trim();
        const newDescription = this.cardDescriptionInput.value.trim();

        if (newTitle) {
            store.updateCardDetails(this.currentColumnId, this.currentCardId, {
                text: newTitle,
                description: newDescription
            });
        }

        this.closeCardDetailModal();
    }

    handleClick(e) {
        const btn = e.target.closest('.card-action-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const cardEl = btn.closest('.card');
        const colEl = btn.closest('.column');
        if (!cardEl || !colEl) return;

        const {cardId} = cardEl.dataset;
        const {columnId: colId} = colEl.dataset;

        if (action === 'edit') {
            this.openCardDetailModal(cardId, colId);
        } else if (action === 'delete' && confirm('Delete this card?')) {
            store.removeCard(colId, cardId);
        }
    }

    handleDragStart(e, element, type) {
        const rect = element.getBoundingClientRect();

        this._lastLoggedContainer = null;

        this.dragState = {
            active: true,
            element,
            type,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            rect,
            lastX: e.clientX,
            lastY: e.clientY,
            direction: null,
            cachedTargets: this.cacheTargets(type, element)
        };

        this.lastSwappedElement = null;
        this.lastAfterElement = null;

        if (e.dataTransfer) {
            e.dataTransfer.setDragImage(element, this.dragState.offsetX, this.dragState.offsetY);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.cardId || element.dataset.columnId);
        }

        const selector = type === 'card' ? '.card' : '.column';
        document
            .querySelectorAll(selector)
            .forEach(el => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
    }

    cacheTargets(type) {
        const targets = [];
        const selector = type === 'card' ? '.card:not(.dragging)' : '.column:not(.dragging)';
        const elements = document.querySelectorAll(selector);

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const innerRect = this.calculateInnerRect(rect, this.DEBUG_RATIO);
            targets.push({
                element: el, rect, innerRect
            });
        });

        return targets;
    }

    calculateInnerRect(rect, ratio) {
        const insetX = (rect.width * (1 - ratio)) / 2;
        const insetY = (rect.height * (1 - ratio)) / 2;

        return {
            left: rect.left + insetX,
            top: rect.top + insetY,
            right: rect.right - insetX,
            bottom: rect.bottom - insetY,
            width: rect.width * ratio,
            height: rect.height * ratio
        };
    }

    handleDragOver(e) {
        const {clientX, clientY} = e;
        this.updateDirection(clientX, clientY);

        const ghostRect = this.getGhostRect(clientX, clientY);
        const collisionHandled = this.checkGhostCollision(ghostRect);

        if (!collisionHandled) {
            if (this.dragState.type === 'card') {
                this.handleFallbackCardMove(e);
            } else {
                this.handleFallbackColumnMove(e);
            }
        }
    }

    updateDirection(x, y) {
        if (this.dragState.type === 'column') {
            if (Math.abs(x - this.dragState.lastX) > 0) {
                this.dragState.direction = x > this.dragState.lastX ? 'right' : 'left';
            }
        } else {
            if (Math.abs(y - this.dragState.lastY) > 0) {
                this.dragState.direction = y > this.dragState.lastY ? 'down' : 'up';
            }
        }

        this.dragState.lastX = x;
        this.dragState.lastY = y;
    }

    getGhostRect(clientX, clientY) {
        const left = clientX - this.dragState.offsetX;
        const top = clientY - this.dragState.offsetY;
        const width = this.dragState.rect.width;
        const height = this.dragState.rect.height;

        return this.calculateInnerRect({
            left, top, right: left + width, bottom: top + height, width, height
        }, this.DEBUG_RATIO);
    }

    checkGhostCollision(ghostRect) {
        for (const target of this.dragState.cachedTargets) {
            if (target.element === this.lastSwappedElement) continue;

            const intersect = ghostRect.left < target.innerRect.right && ghostRect.right > target.innerRect.left && ghostRect.top < target.innerRect.bottom && ghostRect.bottom > target.innerRect.top;

            const debugBox = target.element.querySelector('.debug-inner-box');

            if (intersect) {
                if (debugBox) debugBox.style.borderColor = 'yellow';

                if (this.shouldSwap(ghostRect, target, this.dragState.type)) {
                    this.performSwap(this.dragState.element, target.element);
                    return true;
                }
            } else if (debugBox) {
                debugBox.style.borderColor = 'red';
            }
        }

        return false;
    }

    shouldSwap(ghostRect, targetObj, type) {
        const targetRect = targetObj.rect;
        const ghostFullLeft = ghostRect.left - (targetRect.width * (1 - this.DEBUG_RATIO)) / 2;

        if (type === 'column') {
            if (this.dragState.direction === 'right' && targetRect.left < ghostFullLeft) return false;
            if (this.dragState.direction === 'left' && targetRect.left > ghostFullLeft) return false;

            const overlapX = Math.min(ghostRect.right, targetObj.innerRect.right) - Math.max(ghostRect.left, targetObj.innerRect.left);
            const minWidth = Math.min(ghostRect.width, targetObj.innerRect.width);

            return overlapX / minWidth > CONFIG.values.swapThreshold;
        }

        const overlapY = Math.min(ghostRect.bottom, targetObj.innerRect.bottom) - Math.max(ghostRect.top, targetObj.innerRect.top);
        const minHeight = Math.min(ghostRect.height, targetObj.innerRect.height);

        return overlapY / minHeight > CONFIG.values.swapThreshold;
    }

    performSwap(draggedEl, staticEl) {
        const draggedParent = draggedEl.parentNode;
        const staticParent = staticEl.parentNode;

        performFlipAnimation(staticParent, staticEl, () => {
            performFlipAnimation(draggedParent, draggedEl, () => {
                this.swapNodes(draggedEl, staticEl);
            });
        });

        this.lastSwappedElement = staticEl;

        requestAnimationFrame(() => {
            this.dragState.cachedTargets = this.cacheTargets(this.dragState.type, this.dragState.element);
        });
    }

    swapNodes(a, b) {
        const parentA = a.parentNode;
        const parentB = b.parentNode;
        const siblingA = a.nextSibling === b ? a : a.nextSibling;

        parentB.insertBefore(a, b);

        if (parentA === parentB) {
            parentA.insertBefore(b, siblingA);
        }
    }

    handleFallbackCardMove(e) {
        let container = e.target.closest('.cards');

        if (!container) {
            const column = e.target.closest('.column');
            if (column) {
                container = column.querySelector('.cards');
            }
        }

        if (!container) return;

        const afterEl = getCardAfterElement(container, e.clientY);

        const isNewContainer = container !== this.dragState.element.parentNode;

        if (afterEl !== this.lastAfterElement || isNewContainer) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(container, this.dragState.element, () => {
                if (afterEl) {
                    container.insertBefore(this.dragState.element, afterEl);
                } else {
                    container.appendChild(this.dragState.element);
                }
            });
        }
    }

    handleFallbackColumnMove(e) {
        const afterEl = getColumnAfterElement(this.kanbanContainer, e.clientX);
        if (afterEl !== this.lastAfterElement) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(this.kanbanContainer, this.dragState.element, () => {
                if (afterEl) {
                    this.kanbanContainer.insertBefore(this.dragState.element, afterEl);
                } else {
                    this.kanbanContainer.appendChild(this.dragState.element);
                }
            });
        }
    }

    handleDrop(e) {
        console.group('⬇️ Handle Drop Triggered');
        const element = this.dragState.element;
        if (!element) {
            console.error('❌ Error: No dragged element found in state.');
            console.groupEnd();
            return;
        }

        element.classList.remove('dragging');

        if (this.dragState.type === 'column') {
            const cols = Array.from(this.kanbanContainer.querySelectorAll('.column')).map(c => c.dataset.columnId);
            store.reorderColumns(cols);
            console.log('Reordered Columns');
        } else {
            const newCol = element.closest('.column');

            console.log('Dragged Element:', element);
            console.log('Detected New Column (via DOM):', newCol);

            if (newCol) {
                const {cardId} = element.dataset;
                const {columnId: targetColumnId} = newCol.dataset;

                const state = store.getState();
                let oldColumnId;

                for (const c of state.columns) {
                    if (c.cards.some(cd => cd.id === cardId)) {
                        oldColumnId = c.id;
                        break;
                    }
                }

                console.log(`Card ID: ${cardId}`);
                console.log(`Old Column ID: ${oldColumnId}`);
                console.log(`Target Column ID: ${targetColumnId}`);

                const container = newCol.querySelector('.cards');
                const newOrder = Array.from(container.querySelectorAll('.card')).map(el => el.dataset.cardId);

                if (oldColumnId === targetColumnId) {
                    console.log('Action: Reordering in same column');
                    store.reorderCards(targetColumnId, newOrder);
                } else {
                    console.log('Action: Moving to new column');
                    store.moveCard(cardId, oldColumnId, targetColumnId, newOrder);
                }
            } else {
                console.error('❌ Error: Dropped card but could not find parent .column in DOM.');
            }
        }

        this.dragState.active = false;
        this.dragState.element = null;
        this._lastLoggedContainer = null;
        console.groupEnd();
    }

    openAddColumnModal() {
        this.addColumnModal.classList.add('active');
        this.addColumnModal.setAttribute('aria-hidden', 'false');
        this.columnTitleInput.focus();
    }

    closeAddColumnModal() {
        this.addColumnModal.classList.remove('active');
        this.addColumnModal.setAttribute('aria-hidden', 'true');
        this.addColumnForm.reset();
    }

    render() {
        this.kanbanContainer.innerHTML = '';
        store.getState().columns.forEach(colData => {
            const column = new Column(colData, this.handleCardClick);
            this.kanbanContainer.appendChild(column.render());
        });
    }
}
