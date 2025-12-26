import { store } from '../store.js';
import Column from './Column.js';
import { addDebugInnerBoxToElement, getCardAfterElement, getColumnAfterElement } from '../utils/dragUtils.js';
import { performFlipAnimation } from '../utils/flipAnimation.js';
import { CONFIG } from './kanbanBoardConfig.js';
import { on } from '../utils/dom.js';

export default class KanbanBoard {
    constructor() {
        Object.assign(
            this,
            Object.fromEntries(Object.entries(CONFIG.selectors).map(([k, id]) => [k, document.getElementById(id)]))
        );

        this.currentCardId = null;
        this.currentColumnId = null;
        this.selectedLabels = [];

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

        store.subscribe(() => this.render());

        this.initModals();
        this.setupEventListeners();
        this.render();
    }

    initModals() {
        this.modals = {
            addColumn: {
                el: this.addColumnModal,
                overlay: this.modalOverlay,
                reset: () => this.addColumnForm.reset()
            },
            cardDetail: {
                el: this.cardDetailModal,
                overlay: this.cardDetailOverlay,
                reset: () => {
                    this.cardDetailForm.reset();
                    this.currentCardId = null;
                    this.currentColumnId = null;
                    this.selectedLabels = [];
                }
            },
            labels: {
                el: this.manageLabelModal,
                overlay: this.manageLabelOverlay,
                reset: () => {
                    this.newLabelName.value = '';
                    this.newLabelColor.value = '#5e6c84';
                }
            }
        };

        Object.values(this.modals).forEach((m) => {
            m.overlay.addEventListener('click', () => this.closeModal(m));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== CONFIG.keys.escape) return;
            Object.values(this.modals).forEach((m) => {
                if (this.isOpen(m)) this.closeModal(m);
            });
        });
    }

    isOpen(modal) {
        return modal.el.classList.contains('active');
    }

    openModal(modal) {
        modal.el.classList.add('active');
        modal.el.setAttribute('aria-hidden', 'false');
    }

    closeModal(modal) {
        modal.el.classList.remove('active');
        modal.el.setAttribute('aria-hidden', 'true');
        modal.reset?.();
    }

    setupEventListeners() {
        this.kanbanContainer.addEventListener(
            'dragstart',
            (e) => {
                const card = e.target.closest('.card');
                const col = e.target.closest('.column');
                if (card) return this.handleDragStart(e, card, 'card');
                if (col) return this.handleDragStart(e, col, 'column');
            },
            true
        );

        this.kanbanContainer.addEventListener(
            'dragend',
            () => {
                if (!this.dragState.active) return;
                if (this.dragState.element) this.dragState.element.classList.remove('dragging');
                this.dragState.active = false;
                this.dragState.element = null;
                this._lastLoggedContainer = null;
            },
            true
        );

        this.kanbanContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.dragState.active) return;
            this.handleDragOver(e);
        });

        this.kanbanContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
        });

        this.kanbanContainer.addEventListener('dragenter', (e) => e.preventDefault());

        on(this.kanbanContainer, 'click', '.card-action-btn', (e, btn) => {
            const action = btn.dataset.action;
            const cardEl = btn.closest('.card');
            const colEl = btn.closest('.column');
            if (!cardEl || !colEl) return;

            const { cardId } = cardEl.dataset;
            const { columnId } = colEl.dataset;

            if (action === 'edit') this.openCardDetailModal(cardId, columnId);
            if (action === 'delete' && confirm('Delete this card?')) store.removeCard(columnId, cardId);
        });

        on(this.kanbanContainer, 'click', '.card-complete-checkbox', (e, cb) => {
            e.stopPropagation();
            const cardEl = cb.closest('.card');
            const colEl = cb.closest('.column');
            if (!cardEl || !colEl) return;
            store.toggleCardComplete(colEl.dataset.columnId, cardEl.dataset.cardId);
        });

        on(this.kanbanContainer, 'click', '.card', (e, cardEl) => {
            if (e.target.closest('.card-actions') || e.target.closest('.card-complete-checkbox')) return;
            if (cardEl.classList.contains('dragging')) return;
            const colEl = cardEl.closest('.column');
            if (!colEl) return;
            this.openCardDetailModal(cardEl.dataset.cardId, colEl.dataset.columnId);
        });

        on(this.kanbanContainer, 'click', '[data-action="delete-column"]', (e, btn) => {
            const colEl = btn.closest('.column');
            if (!colEl) return;
            if (confirm('Delete this column and all its cards?')) store.removeColumn(colEl.dataset.columnId);
        });

        on(this.kanbanContainer, 'click', '.add-card-btn', (e, btn) => {
            const colEl = btn.closest('.column');
            if (!colEl) return;
            btn.style.display = 'none';
            const form = colEl.querySelector('.add-card-form');
            form.classList.add('active');
            form.querySelector('.card-input').focus();
        });

        on(this.kanbanContainer, 'click', '[data-action="confirm-add-card"]', (e, btn) => {
            const colEl = btn.closest('.column');
            if (!colEl) return;

            const form = colEl.querySelector('.add-card-form');
            const addBtn = colEl.querySelector('.add-card-btn');
            const input = form.querySelector('.card-input');
            const text = input.value.trim();

            if (text) store.addCard(colEl.dataset.columnId, text);

            input.value = '';
            form.classList.remove('active');
            addBtn.style.display = 'block';
        });

        on(this.kanbanContainer, 'click', '[data-action="cancel-add-card"]', (e, btn) => {
            const colEl = btn.closest('.column');
            if (!colEl) return;
            colEl.querySelector('.add-card-form').classList.remove('active');
            colEl.querySelector('.add-card-btn').style.display = 'block';
        });

        on(
            this.kanbanContainer,
            'blur',
            '.column-header h2',
            (e, h2) => {
                const colEl = h2.closest('.column');
                if (!colEl) return;
                const newTitle = h2.textContent.trim() || 'Untitled Column';
                h2.textContent = newTitle;
                store.updateColumnTitle(colEl.dataset.columnId, newTitle);
            },
            true
        );

        this.addColumnBtn.addEventListener('click', () => {
            this.openModal(this.modals.addColumn);
            this.columnTitleInput.focus();
        });

        this.cancelAddColumn.addEventListener('click', () => this.closeModal(this.modals.addColumn));

        this.addColumnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = this.columnTitleInput.value.trim();
            if (title) store.addColumn(title);
            this.closeModal(this.modals.addColumn);
        });

        this.cardDetailCloseBtn.addEventListener('click', () => this.closeModal(this.modals.cardDetail));
        this.cancelCardDetail.addEventListener('click', () => this.closeModal(this.modals.cardDetail));

        this.cardDetailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCardDetails();
        });

        this.manageLabelBtn.addEventListener('click', () => {
            this.renderLabelsList();
            this.openModal(this.modals.labels);
            this.newLabelName.focus();
        });

        this.manageLabelCloseBtn.addEventListener('click', () => this.closeModal(this.modals.labels));

        this.addLabelBtn.addEventListener('click', () => this.addNewLabel());

        this.newLabelName.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            this.addNewLabel();
        });

        this.labelsSelector.addEventListener('change', (e) => {
            const cb = e.target.closest('input[type="checkbox"]');
            if (!cb) return;
            const id = cb.value;
            if (cb.checked) {
                if (!this.selectedLabels.includes(id)) this.selectedLabels.push(id);
            } else {
                this.selectedLabels = this.selectedLabels.filter((x) => x !== id);
            }
        });

        this.labelsList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.label-edit-btn');
            const deleteBtn = e.target.closest('.label-delete-btn');

            if (editBtn) {
                const label = store.getLabels().find((l) => l.id === editBtn.dataset.id);
                if (label) this.editLabel(label);
            }

            if (deleteBtn) {
                this.deleteLabel(deleteBtn.dataset.id);
            }
        });
    }

    openCardDetailModal(cardId, columnId) {
        const result = store.getCard(cardId);
        if (!result) return;

        const { card } = result;

        this.currentCardId = cardId;
        this.currentColumnId = columnId;

        this.cardTitleInput.value = card.text || '';
        this.cardDescriptionInput.value = card.description || '';
        this.cardStartDateInput.value = card.startDate || '';
        this.cardDueDateInput.value = card.dueDate || '';
        this.cardCompletedInput.checked = card.completed || false;
        this.cardPriorityInput.value = card.priority || 'none';

        this.selectedLabels = card.labels ? [...card.labels] : [];
        this.renderLabelsSelector();

        this.openModal(this.modals.cardDetail);

        this.cardTitleInput.focus();
        this.cardTitleInput.select();
    }

    renderLabelsSelector() {
        const labels = store.getLabels();
        this.labelsSelector.innerHTML = '';

        if (labels.length === 0) {
            this.labelsSelector.innerHTML = '<p class="no-labels">No labels yet. Create labels from the header button.</p>';
            return;
        }

        labels.forEach((label) => {
            const isSelected = this.selectedLabels.includes(label.id);
            const labelEl = document.createElement('label');
            labelEl.className = 'label-checkbox';
            labelEl.innerHTML = `
                <input type="checkbox" value="${label.id}" ${isSelected ? 'checked' : ''}/>
                <span class="label-chip" style="background-color: ${label.color}">${label.name}</span>
            `;
            this.labelsSelector.appendChild(labelEl);
        });
    }

    saveCardDetails() {
        if (!this.currentCardId || !this.currentColumnId) return;

        const newTitle = this.cardTitleInput.value.trim();
        const newDescription = this.cardDescriptionInput.value.trim();
        const startDate = this.cardStartDateInput.value || null;
        const dueDate = this.cardDueDateInput.value || null;
        const completed = this.cardCompletedInput.checked;
        const priority = this.cardPriorityInput.value;

        if (newTitle) {
            store.updateCardDetails(this.currentColumnId, this.currentCardId, {
                text: newTitle,
                description: newDescription,
                startDate,
                dueDate,
                completed,
                priority,
                labels: this.selectedLabels
            });
        }

        this.closeModal(this.modals.cardDetail);
    }

    renderLabelsList() {
        const labels = store.getLabels();
        this.labelsList.innerHTML = '';

        if (labels.length === 0) {
            this.labelsList.innerHTML = '<p class="no-labels">No labels created yet.</p>';
            return;
        }

        labels.forEach((label) => {
            const labelItem = document.createElement('div');
            labelItem.className = 'label-item';
            labelItem.innerHTML = `
                <span class="label-preview" style="background-color: ${label.color}">${label.name}</span>
                <div class="label-actions">
                    <button class="label-edit-btn" data-id="${label.id}" title="Edit">✏️</button>
                    <button class="label-delete-btn" data-id="${label.id}" title="Delete">🗑️</button>
                </div>
            `;
            this.labelsList.appendChild(labelItem);
        });
    }

    addNewLabel() {
        const name = this.newLabelName.value.trim();
        const color = this.newLabelColor.value;

        if (!name) return;

        store.addLabel(name, color);
        this.newLabelName.value = '';
        this.newLabelColor.value = '#5e6c84';
        this.renderLabelsList();
    }

    editLabel(label) {
        const newName = prompt('Enter new label name:', label.name);
        if (!newName || !newName.trim()) return;

        const newColor = prompt('Enter new color (hex):', label.color) || label.color;
        store.updateLabel(label.id, newName.trim(), newColor);
        this.renderLabelsList();
    }

    deleteLabel(labelId) {
        if (!confirm('Delete this label? It will be removed from all cards.')) return;
        store.removeLabel(labelId);
        this.renderLabelsList();
    }

    handleDragStart(e, element, type) {
        const rect = element.getBoundingClientRect();

        this._lastLoggedContainer = null;

        element.classList.add('dragging');

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
            cachedTargets: this.cacheTargets(type)
        };

        this.lastSwappedElement = null;
        this.lastAfterElement = null;

        if (e.dataTransfer) {
            e.dataTransfer.setDragImage(element, this.dragState.offsetX, this.dragState.offsetY);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.cardId || element.dataset.columnId);
        }

        const selector = type === 'card' ? '.card' : '.column';
        document.querySelectorAll(selector).forEach((el) => addDebugInnerBoxToElement(el, this.DEBUG_RATIO));
    }

    cacheTargets(type) {
        const targets = [];
        const selector = type === 'card' ? '.card:not(.dragging)' : '.column:not(.dragging)';
        const elements = document.querySelectorAll(selector);

        elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const innerRect = this.calculateInnerRect(rect, this.DEBUG_RATIO);
            targets.push({ element: el, rect, innerRect });
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
        const { clientX, clientY } = e;
        this.updateDirection(clientX, clientY);

        const ghostRect = this.getGhostRect(clientX, clientY);
        const collisionHandled = this.checkGhostCollision(ghostRect);

        if (!collisionHandled) {
            if (this.dragState.type === 'card') this.handleFallbackCardMove(e);
            else this.handleFallbackColumnMove(e);
        }
    }

    updateDirection(x, y) {
        if (this.dragState.type === 'column') {
            if (Math.abs(x - this.dragState.lastX) > 0) this.dragState.direction = x > this.dragState.lastX ? 'right' : 'left';
        } else {
            if (Math.abs(y - this.dragState.lastY) > 0) this.dragState.direction = y > this.dragState.lastY ? 'down' : 'up';
        }

        this.dragState.lastX = x;
        this.dragState.lastY = y;
    }

    getGhostRect(clientX, clientY) {
        const left = clientX - this.dragState.offsetX;
        const top = clientY - this.dragState.offsetY;
        const width = this.dragState.rect.width;
        const height = this.dragState.rect.height;

        return this.calculateInnerRect(
            { left, top, right: left + width, bottom: top + height, width, height },
            this.DEBUG_RATIO
        );
    }

    checkGhostCollision(ghostRect) {
        for (const target of this.dragState.cachedTargets) {
            if (target.element === this.lastSwappedElement) continue;

            const intersect =
                ghostRect.left < target.innerRect.right &&
                ghostRect.right > target.innerRect.left &&
                ghostRect.top < target.innerRect.bottom &&
                ghostRect.bottom > target.innerRect.top;

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
            this.dragState.cachedTargets = this.cacheTargets(this.dragState.type);
        });
    }

    swapNodes(a, b) {
        const parentA = a.parentNode;
        const parentB = b.parentNode;
        const siblingA = a.nextSibling === b ? a : a.nextSibling;

        parentB.insertBefore(a, b);

        if (parentA === parentB) parentA.insertBefore(b, siblingA);
    }

    handleFallbackCardMove(e) {
        let container = e.target.closest('.cards');

        if (!container) {
            const column = e.target.closest('.column');
            if (column) container = column.querySelector('.cards');
        }

        if (!container) return;

        const afterEl = getCardAfterElement(container, e.clientY);
        const isNewContainer = container !== this.dragState.element.parentNode;

        if (afterEl !== this.lastAfterElement || isNewContainer) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(container, this.dragState.element, () => {
                if (afterEl) container.insertBefore(this.dragState.element, afterEl);
                else container.appendChild(this.dragState.element);
            });
        }
    }

    handleFallbackColumnMove(e) {
        const afterEl = getColumnAfterElement(this.kanbanContainer, e.clientX);
        if (afterEl !== this.lastAfterElement) {
            this.lastAfterElement = afterEl;
            performFlipAnimation(this.kanbanContainer, this.dragState.element, () => {
                if (afterEl) this.kanbanContainer.insertBefore(this.dragState.element, afterEl);
                else this.kanbanContainer.appendChild(this.dragState.element);
            });
        }
    }

    handleDrop() {
        const element = this.dragState.element;
        if (!element) return;

        element.classList.remove('dragging');

        if (this.dragState.type === 'column') {
            const cols = Array.from(this.kanbanContainer.querySelectorAll('.column')).map((c) => c.dataset.columnId);
            store.reorderColumns(cols);
        } else {
            const newCol = element.closest('.column');

            if (newCol) {
                const { cardId } = element.dataset;
                const { columnId: targetColumnId } = newCol.dataset;

                const state = store.getState();
                let oldColumnId;

                for (const c of state.columns) {
                    if (c.cards.some((cd) => cd.id === cardId)) {
                        oldColumnId = c.id;
                        break;
                    }
                }

                const container = newCol.querySelector('.cards');
                const newOrder = Array.from(container.querySelectorAll('.card')).map((el) => el.dataset.cardId);

                if (oldColumnId === targetColumnId) {
                    store.reorderCards(targetColumnId, newOrder);
                } else {
                    store.moveCard(cardId, oldColumnId, targetColumnId, newOrder);
                }
            }
        }

        this.dragState.active = false;
        this.dragState.element = null;
        this._lastLoggedContainer = null;
    }

    render() {
        this.kanbanContainer.innerHTML = '';
        store.getState().columns.forEach((colData) => {
            this.kanbanContainer.appendChild(new Column(colData).render());
        });
    }
}
