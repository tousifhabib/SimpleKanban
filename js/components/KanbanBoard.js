import { store } from '../store.js';
import Column from './Column.js';
import DragDropManager from '../managers/DragDropManager.js';
import ModalManager from '../managers/ModalManager.js';
import FilterManager from '../managers/FilterManager.js';
import RandomPickerManager from '../managers/RandomPickerManager.js';
import FilterPanel from './FilterPanel.js';
import { CONFIG } from './kanbanBoardConfig.js';
import { on } from '../utils/dom.js';
import { i18n } from '../services/i18n/i18nService.js';
import {
  supportedLanguages,
  languageMeta,
} from '../services/i18n/locales/index.js';

export default class KanbanBoard {
  constructor() {
    const s = CONFIG.selectors;
    this.kanbanContainer = document.getElementById(s.kanbanContainer);
    this.boardSelector = document.getElementById(s.boardSelector);
    this.langSelector = document.getElementById(s.langSelector);

    this.addBoardBtn = document.getElementById(s.addBoardBtn);
    this.renameBoardBtn = document.getElementById(s.renameBoardBtn);
    this.deleteBoardBtn = document.getElementById(s.deleteBoardBtn);

    this.filterBarContainer = document.getElementById(s.filterBar);

    this.importBtn = document.getElementById(s.importBtn);
    this.exportBtn = document.getElementById(s.exportBtn);
    this.importFileInput = document.getElementById(s.importFileInput);
    this.manageLabelBtn = document.getElementById(s.manageLabelBtn);
    this.addColumnBtn = document.getElementById(s.addColumnBtn);

    this.newBoardName = document.getElementById(s.newBoardName);
    this.newBoardTemplate = document.getElementById(s.newBoardTemplate);
    this.createBoardForm = document.getElementById(s.createBoardForm);
    this.renameBoardName = document.getElementById(s.renameBoardName);
    this.renameBoardForm = document.getElementById(s.renameBoardForm);
    this.deleteBoardName = document.getElementById(s.deleteBoardName);
    this.deleteBoardMessage = document.getElementById(s.deleteBoardMessage);
    this.confirmDeleteBoard = document.getElementById(s.confirmDeleteBoard);

    this.columnTitleInput = document.getElementById(s.columnTitleInput);
    this.addColumnForm = document.getElementById(s.addColumnForm);

    this.cardTitleInput = document.getElementById(s.cardTitleInput);
    this.cardDescriptionInput = document.getElementById(s.cardDescriptionInput);
    this.cardStartDateInput = document.getElementById(s.cardStartDateInput);
    this.cardDueDateInput = document.getElementById(s.cardDueDateInput);
    this.cardEffortInput = document.getElementById(s.cardEffortInput);
    this.cardCompletedInput = document.getElementById(s.cardCompletedInput);
    this.cardPriorityInput = document.getElementById(s.cardPriorityInput);
    this.labelsSelector = document.getElementById(s.labelsSelector);
    this.cardLogList = document.getElementById(s.cardLogList);
    this.newLogInput = document.getElementById(s.newLogInput);
    this.addLogBtn = document.getElementById(s.addLogBtn);
    this.cardDetailForm = document.getElementById(s.cardDetailForm);
    this.cardDetailCloseBtn = document.getElementById(s.cardDetailCloseBtn);

    this.manageLabelCloseBtn = document.getElementById(s.manageLabelCloseBtn);
    this.labelsList = document.getElementById(s.labelsList);
    this.newLabelName = document.getElementById(s.newLabelName);
    this.newLabelColor = document.getElementById(s.newLabelColor);
    this.addLabelBtn = document.getElementById(s.addLabelBtn);

    this.optionsBtn = document.getElementById(s.optionsBtn);
    this.optionsCloseBtn = document.getElementById(s.optionsCloseBtn);
    this.saveOptionsBtn = document.getElementById(s.saveOptionsBtn);
    this.resetOptionsBtn = document.getElementById(s.resetOptionsBtn);
    this.optColumnsSelector = document.getElementById(s.optColumnsSelector);
    this.optFactorPriority = document.getElementById(s.optFactorPriority);
    this.optFactorDueDate = document.getElementById(s.optFactorDueDate);
    this.optFactorAging = document.getElementById(s.optFactorAging);
    this.optExcludeCompleted = document.getElementById(s.optExcludeCompleted);

    this.randomPickerBtn = document.getElementById(s.randomPickerBtn);
    this.randomPickerCloseBtn = document.getElementById(s.randomPickerCloseBtn);
    this.randomPickerResult = document.getElementById(s.randomPickerResult);
    this.randomPickerCard = document.getElementById(s.randomPickerCard);
    this.randomPickerColumnInfo = document.getElementById(
      s.randomPickerColumnInfo
    );
    this.randomPickerEmpty = document.getElementById(s.randomPickerEmpty);
    this.randomPickerStats = document.getElementById(s.randomPickerStats);
    this.goToCardBtn = document.getElementById(s.goToCardBtn);
    this.pickAgainBtn = document.getElementById(s.pickAgainBtn);

    this.currentCardId = null;
    this.currentColumnId = null;
    this.selectedLabels = [];
    this.pickedCard = null;
    this.pickedColumn = null;

    this.filterManager = new FilterManager();
    this.initializeFilterPanel();

    this.randomPickerManager = new RandomPickerManager();

    this.modalManager = new ModalManager();
    this.registerModals();

    new DragDropManager(this.kanbanContainer, {
      onDropCard: (cardId, newColId, newOrder) =>
        this.handleCardDrop(cardId, newColId, newOrder),
      onDropColumn: (newOrder) => store.reorderColumns(newOrder),
    });

    this.populateLanguageSelector();
    i18n.updatePage();

    this.setupEventListeners();
    this.updateBoardSelector();
    this.render();

    store.subscribe(() => {
      this.updateBoardSelector();
      this.updateFilterPanelLabels();
      this.render();
    });

    i18n.subscribe(() => {
      this.populateLanguageSelector();
      this.render();
      this.updateBoardSelector();
    });
  }

  initializeFilterPanel() {
    if (this.filterBarContainer) {
      this.filterBarContainer.innerHTML = '';
      this.filterBarContainer.className = '';

      this.filterPanel = new FilterPanel(this.filterBarContainer, {
        filterManager: this.filterManager,
        labels: store.getLabels(),
        columns: store.getState()?.columns || [],
        onFilterChange: () => this.render(),
      });
    }
  }

  updateFilterPanelLabels() {
    if (this.filterPanel) {
      this.filterPanel.setLabels(store.getLabels());
      this.filterPanel.setColumns(store.getState()?.columns || []);
    }
  }

  populateLanguageSelector() {
    const current = i18n.getLanguage();
    const sorted = [...supportedLanguages].sort((a, b) => a.localeCompare(b));
    const langs = [current, ...sorted.filter((l) => l !== current)];

    this.langSelector.innerHTML = '';

    langs.forEach((lang) => {
      const meta = languageMeta[lang] || {};
      const option = document.createElement('option');
      option.value = lang;

      const short = meta.short || lang.toUpperCase();
      const flag = meta.flag ? `${meta.flag} ` : '';
      option.textContent = `${flag}${short}`;

      if (meta.name) option.title = meta.name;

      this.langSelector.appendChild(option);
    });

    this.langSelector.value = current;
  }

  registerModals() {
    this.modalManager.register('createBoard', {
      modalId: 'createBoardModal',
      overlayId: 'createBoardOverlay',
      formId: 'createBoardForm',
    });
    this.modalManager.register('renameBoard', {
      modalId: 'renameBoardModal',
      overlayId: 'renameBoardOverlay',
      formId: 'renameBoardForm',
    });
    this.modalManager.register('deleteBoard', {
      modalId: 'deleteBoardModal',
      overlayId: 'deleteBoardOverlay',
    });
    this.modalManager.register('addColumn', {
      modalId: 'addColumnModal',
      overlayId: 'modalOverlay',
      formId: 'addColumnForm',
    });
    this.modalManager.register('cardDetail', {
      modalId: 'cardDetailModal',
      overlayId: 'cardDetailOverlay',
      formId: 'cardDetailForm',
      onReset: () => this.resetCardDetail(),
    });
    this.modalManager.register('labels', {
      modalId: 'manageLabelModal',
      overlayId: 'manageLabelOverlay',
      onReset: () => {
        this.newLabelName.value = '';
        this.newLabelColor.value = '#5e6c84';
      },
    });
    this.modalManager.register('options', {
      modalId: 'optionsModal',
      overlayId: 'optionsOverlay',
    });
    this.modalManager.register('randomPicker', {
      modalId: 'randomPickerModal',
      overlayId: 'randomPickerOverlay',
      onReset: () => {
        this.pickedCard = null;
        this.pickedColumn = null;
      },
    });
  }

  isFilterActive() {
    return this.filterManager.isActive();
  }

  handleCardDrop(cardId, newColumnId, newOrder) {
    if (this.isFilterActive()) return;

    const state = store.getState();
    let oldColumnId;
    for (const c of state.columns) {
      if (c.cards.some((cd) => cd.id === cardId)) {
        oldColumnId = c.id;
        break;
      }
    }

    if (oldColumnId === newColumnId) {
      store.reorderCards(newColumnId, newOrder);
    } else {
      store.moveCard(cardId, oldColumnId, newColumnId, newOrder);
    }
  }

  render() {
    this.kanbanContainer.innerHTML = '';
    const boardState = store.getState();
    const allLabels = store.getLabels();

    if (this.isFilterActive()) {
      this.kanbanContainer.classList.add('filters-active');
    } else {
      this.kanbanContainer.classList.remove('filters-active');
    }

    if (boardState && boardState.columns) {
      boardState.columns.forEach((colData) => {
        const cardsToRender = this.filterManager.applyFilters(
          colData.cards,
          allLabels
        );

        this.kanbanContainer.appendChild(
          new Column({ ...colData, cards: cardsToRender }).render()
        );
      });
    }

    this.updateFilterResultCount(boardState, allLabels);
  }

  updateFilterResultCount(boardState, allLabels) {
    if (!boardState || !this.isFilterActive()) return;

    let totalCards = 0;
    let filteredCards = 0;

    boardState.columns.forEach((col) => {
      totalCards += col.cards.length;
      filteredCards += this.filterManager.applyFilters(
        col.cards,
        allLabels
      ).length;
    });

    console.debug(
      `Filtering active: Showing ${filteredCards} of ${totalCards} total cards.`
    );
  }

  updateBoardSelector() {
    const boards = store.getBoards();
    const activeId = store.getActiveBoardId();
    this.boardSelector.innerHTML = '';
    boards.forEach((b) => {
      const option = document.createElement('option');
      option.value = b.id;
      option.textContent = b.name;
      if (b.id === activeId) option.selected = true;
      this.boardSelector.appendChild(option);
    });
    if (this.deleteBoardBtn) this.deleteBoardBtn.disabled = boards.length <= 1;
  }

  setupEventListeners() {
    this.langSelector.addEventListener('change', (e) => {
      i18n.setLanguage(e.target.value);
    });

    this.boardSelector.addEventListener('change', (e) => {
      const select = e.target;
      store.setActiveBoard(select.value);
    });
    this.addBoardBtn.addEventListener('click', () => {
      this.modalManager.open('createBoard');
      this.newBoardName.focus();
    });
    this.createBoardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.newBoardName.value.trim();
      const template = this.newBoardTemplate.value;
      if (name) store.createBoard(name, template);
      this.modalManager.close('createBoard');
    });

    this.renameBoardBtn.addEventListener('click', () => {
      const active = store.getActiveBoard();
      if (!active) return;
      this.renameBoardName.value = active.name;
      this.modalManager.open('renameBoard');
    });
    this.renameBoardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      store.renameBoard(store.getActiveBoardId(), this.renameBoardName.value);
      this.modalManager.close('renameBoard');
    });

    this.deleteBoardBtn.addEventListener('click', () => {
      const active = store.getActiveBoard();
      if (active) {
        this.deleteBoardMessage.textContent = i18n.t(
          'modals.deleteBoard.warning',
          { boardName: active.name }
        );
        this.modalManager.open('deleteBoard');
      }
    });
    this.confirmDeleteBoard.addEventListener('click', () => {
      if (store.deleteBoard(store.getActiveBoardId()))
        this.modalManager.close('deleteBoard');
    });

    [
      'createBoard',
      'renameBoard',
      'deleteBoard',
      'addColumn',
      'cardDetail',
    ].forEach((name) => {
      const btn = document.getElementById(
        `cancel${name.charAt(0).toUpperCase() + name.slice(1)}`
      );
      if (btn)
        btn.addEventListener('click', () => this.modalManager.close(name));
    });

    this.addColumnBtn.addEventListener('click', () => {
      this.modalManager.open('addColumn');
      this.columnTitleInput.focus();
    });
    this.addColumnForm.addEventListener('submit', (e) => {
      e.preventDefault();
      store.addColumn(this.columnTitleInput.value.trim());
      this.modalManager.close('addColumn');
    });

    on(
      this.kanbanContainer,
      'click',
      '[data-action="delete-column"]',
      (e, btn) => {
        const colEl = btn.closest('.column');
        if (!colEl) return;
        if (confirm(i18n.t('board.confirmDeleteColumn'))) {
          store.removeColumn(colEl.dataset.columnId);
        }
      }
    );

    on(this.kanbanContainer, 'click', '.column-title-text', (e, textEl) => {
      const input = textEl.parentElement.querySelector('.column-title-input');
      textEl.style.display = 'none';
      input.style.display = 'block';
      input.focus();
    });
    on(
      this.kanbanContainer,
      'blur',
      '.column-title-input',
      (e, input) => {
        const newTitle = input.value.trim() || 'Untitled';
        const colEl = input.closest('.column');
        store.updateColumnTitle(colEl.dataset.columnId, newTitle);
        input.style.display = 'none';
        colEl.querySelector('.column-title-text').style.display = 'block';
      },
      true
    );
    on(this.kanbanContainer, 'keydown', '.column-title-input', (e, input) => {
      if (e.key === 'Enter') input.blur();
    });

    on(this.kanbanContainer, 'click', '.card-action-btn', (e, btn) => {
      const action = btn.dataset.action;
      const colId = btn.closest('.column').dataset.columnId;
      const cardId = btn.closest('.card').dataset.cardId;

      if (action === 'edit') {
        this.openCardDetailModal(cardId, colId);
      } else if (action === 'duplicate') {
        this.duplicateCard(cardId, colId);
      } else if (
        action === 'delete' &&
        confirm(i18n.t('board.confirmDeleteCard'))
      ) {
        store.removeCard(colId, cardId);
      }
    });

    on(this.kanbanContainer, 'click', '.card', (e, cardEl) => {
      if (
        e.target.closest('.card-actions') ||
        e.target.closest('.card-complete-toggle')
      )
        return;
      if (cardEl.classList.contains('dragging')) return;
      const colId = cardEl.closest('.column').dataset.columnId;
      this.openCardDetailModal(cardEl.dataset.cardId, colId);
    });

    on(this.kanbanContainer, 'change', '.card-complete-checkbox', (e, cb) => {
      const cardEl = cb.closest('.card');
      const colEl = cb.closest('.column');
      store.toggleCardComplete(colEl.dataset.columnId, cardEl.dataset.cardId);
    });

    on(this.kanbanContainer, 'click', '.add-card-btn', (e, btn) => {
      const col = btn.closest('.column');
      btn.style.display = 'none';
      col.querySelector('.add-card-form').classList.add('active');
      col.querySelector('.card-input').focus();
    });
    on(
      this.kanbanContainer,
      'click',
      '[data-action="confirm-add-card"]',
      (e, btn) => {
        const col = btn.closest('.column');
        const text = col.querySelector('.card-input').value.trim();
        if (text) store.addCard(col.dataset.columnId, text);
        col.querySelector('.add-card-form').classList.remove('active');
        col.querySelector('.add-card-btn').style.display = 'block';
        col.querySelector('.card-input').value = '';
      }
    );
    on(
      this.kanbanContainer,
      'click',
      '[data-action="cancel-add-card"]',
      (e, btn) => {
        const col = btn.closest('.column');
        col.querySelector('.add-card-form').classList.remove('active');
        col.querySelector('.add-card-btn').style.display = 'block';
      }
    );

    this.cardDetailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      store.updateCardDetails(this.currentColumnId, this.currentCardId, {
        text: this.cardTitleInput.value,
        description: this.cardDescriptionInput.value,
        startDate: this.cardStartDateInput.value || null,
        dueDate: this.cardDueDateInput.value || null,
        effort: Number(this.cardEffortInput.value) || 0,
        completed: this.cardCompletedInput.checked,
        priority: this.cardPriorityInput.value,
        labels: this.selectedLabels,
      });
      this.modalManager.close('cardDetail');
    });

    this.cardDetailCloseBtn.addEventListener('click', () =>
      this.modalManager.close('cardDetail')
    );
    this.addLogBtn.addEventListener('click', () => {
      const text = this.newLogInput.value.trim();
      if (text) {
        store.addCardLog(this.currentColumnId, this.currentCardId, text);
        const { card } = store.getCard(this.currentCardId);
        this.renderCardLogs(card.logs);
        this.newLogInput.value = '';
      }
    });

    this.manageLabelBtn.addEventListener('click', () => {
      this.renderLabelsList();
      this.modalManager.open('labels');
    });
    this.manageLabelCloseBtn.addEventListener('click', () =>
      this.modalManager.close('labels')
    );
    this.addLabelBtn.addEventListener('click', () => this.addNewLabel());
    this.labelsSelector.addEventListener('change', (e) => {
      const maybeInput = e.target.closest('input');
      if (!maybeInput) return;

      const input = maybeInput;
      const id = input.value;

      if (input.checked) {
        this.selectedLabels.push(id);
      } else {
        this.selectedLabels = this.selectedLabels.filter((l) => l !== id);
      }
    });

    this.exportBtn.addEventListener('click', () => {
      const data = JSON.stringify(store.state, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kanban-backup.json';
      a.click();
    });
    this.importBtn.addEventListener('click', () =>
      this.importFileInput.click()
    );
    this.importFileInput.addEventListener('change', (e) => {
      const input = e.target;
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        store.importData(text);
      };
      reader.readAsText(file);
    });

    this.setupOptionsEventListeners();

    this.setupRandomPickerEventListeners();
  }

  setupOptionsEventListeners() {
    if (this.optionsBtn) {
      this.optionsBtn.addEventListener('click', () => {
        this.populateOptionsModal();
        this.modalManager.open('options');
      });
    }

    if (this.optionsCloseBtn) {
      this.optionsCloseBtn.addEventListener('click', () => {
        this.modalManager.close('options');
      });
    }

    if (this.saveOptionsBtn) {
      this.saveOptionsBtn.addEventListener('click', () => {
        this.saveOptions();
        this.modalManager.close('options');
      });
    }

    if (this.resetOptionsBtn) {
      this.resetOptionsBtn.addEventListener('click', () => {
        this.randomPickerManager.resetOptions();
        this.populateOptionsModal();
      });
    }
  }

  setupRandomPickerEventListeners() {
    if (this.randomPickerBtn) {
      this.randomPickerBtn.addEventListener('click', () => {
        this.pickRandomCard();
      });
    }

    if (this.randomPickerCloseBtn) {
      this.randomPickerCloseBtn.addEventListener('click', () => {
        this.modalManager.close('randomPicker');
      });
    }

    if (this.goToCardBtn) {
      this.goToCardBtn.addEventListener('click', () => {
        if (this.pickedCard && this.pickedColumn) {
          this.modalManager.close('randomPicker');
          this.openCardDetailModal(this.pickedCard.id, this.pickedColumn.id);
        }
      });
    }

    if (this.pickAgainBtn) {
      this.pickAgainBtn.addEventListener('click', () => {
        this.pickRandomCard();
      });
    }
  }

  populateOptionsModal() {
    const options = this.randomPickerManager.getOptions();
    const boardState = store.getState();

    if (this.optFactorPriority) {
      this.optFactorPriority.checked = options.factorPriority;
    }
    if (this.optFactorDueDate) {
      this.optFactorDueDate.checked = options.factorDueDate;
    }
    if (this.optFactorAging) {
      this.optFactorAging.checked = options.factorAging;
    }
    if (this.optExcludeCompleted) {
      this.optExcludeCompleted.checked = options.excludeCompleted;
    }

    if (this.optColumnsSelector && boardState && boardState.columns) {
      this.optColumnsSelector.innerHTML = '';
      boardState.columns.forEach((col) => {
        const label = document.createElement('label');
        label.className = 'options-column-checkbox';
        const isChecked =
          options.includeColumns.length === 0 ||
          options.includeColumns.includes(col.id);
        label.innerHTML = `
          <input type="checkbox" value="${col.id}" ${isChecked ? 'checked' : ''} />
          <span>${col.title}</span>
        `;
        this.optColumnsSelector.appendChild(label);
      });
    }
  }

  saveOptions() {
    const selectedColumns = [];
    if (this.optColumnsSelector) {
      const checkedBoxes =
        this.optColumnsSelector.querySelectorAll('input:checked');
      const allBoxes = this.optColumnsSelector.querySelectorAll('input');

      if (checkedBoxes.length < allBoxes.length) {
        checkedBoxes.forEach((cb) => {
          selectedColumns.push(cb.value);
        });
      }
    }

    this.randomPickerManager.setOptions({
      factorPriority: this.optFactorPriority?.checked ?? true,
      factorDueDate: this.optFactorDueDate?.checked ?? true,
      factorAging: this.optFactorAging?.checked ?? true,
      excludeCompleted: this.optExcludeCompleted?.checked ?? true,
      includeColumns: selectedColumns,
    });
  }

  pickRandomCard() {
    const boardState = store.getState();
    const result = this.randomPickerManager.pickRandomCard(boardState);
    const stats = this.randomPickerManager.getPoolStats(boardState);

    if (result) {
      this.pickedCard = result.card;
      this.pickedColumn = result.column;
      this.renderRandomPickerResult(result.card, result.column, stats);
      this.randomPickerResult.style.display = 'block';
      this.randomPickerEmpty.style.display = 'none';
      this.goToCardBtn.style.display = 'inline-block';
    } else {
      this.pickedCard = null;
      this.pickedColumn = null;
      this.randomPickerResult.style.display = 'none';
      this.randomPickerEmpty.style.display = 'block';
      this.goToCardBtn.style.display = 'none';
    }

    this.renderRandomPickerStats(stats);
    this.modalManager.open('randomPicker');
  }

  renderRandomPickerResult(card, column) {
    const allLabels = store.getLabels();

    let labelsHtml = '';
    if (card.labels && card.labels.length > 0) {
      labelsHtml = '<div class="randomizer-card-labels">';
      card.labels.forEach((labelId) => {
        const label = allLabels.find((l) => l.id === labelId);
        if (label) {
          labelsHtml += `<span class="card-label" style="background-color: ${label.color}">${label.name}</span>`;
        }
      });
      labelsHtml += '</div>';
    }

    let priorityBadge = '';
    if (card.priority && card.priority !== 'none') {
      const priorityText =
        i18n.t(`card.priorities.${card.priority}`) || card.priority;
      priorityBadge = `<span class="randomizer-priority priority-${card.priority}">${priorityText}</span>`;
    }

    let dueDateBadge = '';
    if (card.dueDate) {
      const date = new Date(card.dueDate);
      const dateStr = date.toLocaleDateString(i18n.getLanguage(), {
        month: 'short',
        day: 'numeric',
      });
      const dueDateStatus = card.getDueDateStatus
        ? card.getDueDateStatus()
        : '';
      dueDateBadge = `<span class="randomizer-due-date ${dueDateStatus}">🔴 ${dateStr}</span>`;
    }

    this.randomPickerCard.innerHTML = `
      ${labelsHtml}
      <div class="randomizer-card-title">${card.text}</div>
      ${card.description ? `<div class="randomizer-card-desc">${card.description.substring(0, 100)}${card.description.length > 100 ? '...' : ''}</div>` : ''}
      <div class="randomizer-card-meta">
        ${priorityBadge}
        ${dueDateBadge}
        ${card.effort ? `<span class="randomizer-effort">⏱️ ${card.effort}h</span>` : ''}
      </div>
    `;

    this.randomPickerColumnInfo.innerHTML = `
      <span class="column-indicator">${i18n.t('modals.randomPicker.inColumn') || 'In column:'}</span>
      <span class="column-name">${column.title}</span>
    `;
  }

  renderRandomPickerStats(stats) {
    this.randomPickerStats.innerHTML = `
      <div class="stats-text">
        ${
          i18n.t('modals.randomPicker.stats', {
            eligible: stats.eligible,
            total: stats.total,
          }) || `${stats.eligible} of ${stats.total} cards in selection pool`
        }
      </div>
    `;
  }

  duplicateCard(cardId, columnId) {
    const duplicated = store.duplicateCard(columnId, cardId);
    if (duplicated) {
      setTimeout(() => {
        const newCardEl = this.kanbanContainer.querySelector(
          `[data-card-id="${duplicated.id}"]`
        );
        if (newCardEl) {
          newCardEl.classList.add('card-duplicated');
          setTimeout(() => newCardEl.classList.remove('card-duplicated'), 1000);
        }
      }, 50);
    }
  }

  resetCardDetail() {
    this.cardDetailForm.reset();
    this.cardEffortInput.value = '';
    this.currentCardId = null;
    this.currentColumnId = null;
    this.selectedLabels = [];
    this.cardLogList.innerHTML = '';
    this.newLogInput.value = '';
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
    this.cardEffortInput.value = card.effort || '';
    this.cardCompletedInput.checked = card.completed || false;
    this.cardPriorityInput.value = card.priority || 'none';

    this.renderCardLogs(card.logs || []);
    this.selectedLabels = card.labels ? [...card.labels] : [];
    this.renderLabelsSelector();

    this.modalManager.open('cardDetail');
  }

  renderCardLogs(logs) {
    this.cardLogList.innerHTML = '';
    if (!logs || !logs.length) {
      this.cardLogList.style.display = 'none';
      return;
    }
    this.cardLogList.style.display = 'block';
    [...logs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((log) => {
        const d = new Date(log.createdAt).toLocaleString(i18n.getLanguage());
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<div class="log-header"><span class="log-timestamp">${d}</span></div><div class="log-text">${log.text}</div>`;
        this.cardLogList.appendChild(div);
      });
  }

  renderLabelsSelector() {
    const labels = store.getLabels();
    this.labelsSelector.innerHTML = '';
    labels.forEach((l) => {
      const chk = this.selectedLabels.includes(l.id);
      const lbl = document.createElement('label');
      lbl.className = 'label-checkbox';
      lbl.innerHTML = `<input type="checkbox" value="${l.id}" ${chk ? 'checked' : ''}/><span class="label-chip" style="background:${l.color}">${l.name}</span>`;
      this.labelsSelector.appendChild(lbl);
    });
  }

  renderLabelsList() {
    const list = this.labelsList;
    list.innerHTML = '';
    store.getLabels().forEach((l) => {
      const div = document.createElement('div');
      div.className = 'label-item';
      div.innerHTML = `
              <span class="label-preview" style="background:${l.color}">${l.name}</span>
              <div class="label-actions">
                  <button class="label-edit-btn" data-id="${l.id}">✏️</button>
                  <button class="label-delete-btn" data-id="${l.id}">🗑️</button>
              </div>
          `;

      div.querySelector('.label-delete-btn').onclick = () => {
        if (confirm(i18n.t('board.confirmDeleteLabel')))
          store.removeLabel(l.id);
        this.renderLabelsList();
      };

      div.querySelector('.label-edit-btn').onclick = () => {
        const newName = prompt(i18n.t('board.promptLabelName'), l.name);
        if (!newName || !newName.trim()) return;
        const newColor =
          prompt(i18n.t('board.promptLabelColor'), l.color) || l.color;
        store.updateLabel(l.id, newName.trim(), newColor);
        this.renderLabelsList();
      };

      list.appendChild(div);
    });
  }

  addNewLabel() {
    const name = this.newLabelName.value.trim();
    if (name) {
      store.addLabel(name, this.newLabelColor.value);
      this.newLabelName.value = '';
      this.renderLabelsList();
    }
  }
}
