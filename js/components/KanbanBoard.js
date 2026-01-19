import { store } from '../store.js';
import Column from './Column.js';
import DragDropManager from '../managers/DragDropManager.js';
import ModalManager from '../managers/ModalManager.js';
import FilterManager from '../managers/FilterManager.js';
import RandomPickerManager from '../managers/RandomPickerManager.js';
import FilterPanel from './FilterPanel.js';
import { i18n } from '../services/i18n/i18nService.js';
import {
  supportedLanguages,
  languageMeta,
} from '../services/i18n/locales/index.js';

export default class KanbanBoard {
  constructor() {
    this.ui = new Proxy({}, { get: (_, id) => document.getElementById(id) });
    this.ctx = { cardId: null, colId: null, labels: [] };
    this.fm = new FilterManager();
    this.picker = new RandomPickerManager();
    this.modals = new ModalManager();
    this.init();
  }

  init() {
    this.filterPanel = new FilterPanel(this.ui.filterBar, {
      filterManager: this.fm,
      labels: store.getLabels(),
      onFilterChange: () => this.render(),
    });

    this.setupModals();
    this.setupDragDrop();
    this.setupActions();
    this.bindEvents();

    const refresh = () => {
      this.updateBoardSelector();
      this.filterPanel.setLabels(store.getLabels());
      this.populateLangSelector();
      this.render();
    };

    store.subscribe(refresh);
    i18n.subscribe(refresh);
    refresh();
  }

  setupModals() {
    const configs = {
      createBoard: {
        id: 'createBoardModal',
        overlay: 'createBoardOverlay',
        form: 'createBoardForm',
      },
      renameBoard: {
        id: 'renameBoardModal',
        overlay: 'renameBoardOverlay',
        form: 'renameBoardForm',
      },
      deleteBoard: { id: 'deleteBoardModal', overlay: 'deleteBoardOverlay' },
      addColumn: {
        id: 'addColumnModal',
        overlay: 'modalOverlay',
        form: 'addColumnForm',
      },
      options: { id: 'optionsModal', overlay: 'optionsOverlay' },
      cardDetail: {
        id: 'cardDetailModal',
        overlay: 'cardDetailOverlay',
        form: 'cardDetailForm',
        onReset: () => this.resetCtx(),
      },
      labels: {
        id: 'manageLabelModal',
        overlay: 'manageLabelOverlay',
        onReset: () => {
          this.ui.newLabelName.value = '';
          this.ui.newLabelColor.value = '#5e6c84';
        },
      },
      randomPicker: {
        id: 'randomPickerModal',
        overlay: 'randomPickerOverlay',
        onReset: () => (this.picked = null),
      },
    };
    Object.entries(configs).forEach(([k, v]) =>
      this.modals.register(k, {
        modalId: v.id,
        overlayId: v.overlay,
        formId: v.form,
        onReset: v.onReset,
      })
    );
  }

  setupDragDrop() {
    new DragDropManager(this.ui.kanbanContainer, {
      onDropCard: (cId, nColId, nOrd) =>
        !this.fm.isActive() && this.handleDrop(cId, nColId, nOrd),
      onDropColumn: (nOrd) => !this.fm.isActive() && store.reorderColumns(nOrd),
    });
  }

  setupActions() {
    this.actions = {
      addBoardBtn: () => {
        this.modals.open('createBoard');
        this.ui.newBoardName.focus();
      },
      renameBoardBtn: () => {
        this.ui.renameBoardName.value = store.activeBoard?.name;
        this.modals.open('renameBoard');
      },
      deleteBoardBtn: () => {
        this.ui.deleteBoardMessage.textContent = i18n.t(
          'modals.deleteBoard.warning',
          { boardName: store.activeBoard?.name }
        );
        this.modals.open('deleteBoard');
      },
      confirmDeleteBoard: () =>
        store.deleteBoard(store.activeBoardId) &&
        this.modals.close('deleteBoard'),
      addColumnBtn: () => {
        this.modals.open('addColumn');
        this.ui.columnTitleInput.focus();
      },
      manageLabelBtn: () => {
        this.renderLabels();
        this.modals.open('labels');
      },
      addLabelBtn: () => this.addLabel(),
      manageLabelCloseBtn: () => this.modals.close('labels'),
      addLogBtn: () => this.addLog(),
      cardDetailCloseBtn: () => this.modals.close('cardDetail'),
      importBtn: () => this.ui.importFileInput.click(),
      exportBtn: () => this.exportData(),
      optionsBtn: () => {
        this.populateOptions();
        this.modals.open('options');
      },
      saveOptionsBtn: () => {
        this.saveOptions();
        this.modals.close('options');
      },
      resetOptionsBtn: () => {
        this.picker.resetOptions();
        this.populateOptions();
      },
      randomPickerBtn: () => this.pickRandom(),
      goToCardBtn: () => {
        if (this.picked) {
          const { card, column } = this.picked;
          this.modals.close('randomPicker');
          this.openCard(card.id, column.id);
        }
      },
      pickAgainBtn: () => this.pickRandom(),
      'delete-column': (t) =>
        confirm(i18n.t('board.confirmDeleteColumn')) &&
        store.removeColumn(t.closest('.column').dataset.columnId),
      'confirm-add-card': (t) => {
        const col = t.closest('.column');
        const val = col.querySelector('.card-input').value.trim();
        if (val) store.addCard(col.dataset.columnId, val);
        this.toggleAddCard(col, false);
      },
      'cancel-add-card': (t) => this.toggleAddCard(t.closest('.column'), false),
      edit: (t) =>
        this.openCard(
          t.closest('.card').dataset.cardId,
          t.closest('.column').dataset.columnId
        ),
      duplicate: (t) =>
        this.dupCard(
          t.closest('.card').dataset.cardId,
          t.closest('.column').dataset.columnId
        ),
      delete: (t) =>
        confirm(i18n.t('board.confirmDeleteCard')) &&
        store.removeCard(
          t.closest('.column').dataset.columnId,
          t.closest('.card').dataset.cardId
        ),
    };

    this.submitActions = {
      createBoardForm: () =>
        store.createBoard(
          this.ui.newBoardName.value.trim(),
          this.ui.newBoardTemplate.value
        ),
      renameBoardForm: () =>
        store.renameBoard(
          store.getActiveBoardId(),
          this.ui.renameBoardName.value
        ),
      addColumnForm: () =>
        store.addColumn(this.ui.columnTitleInput.value.trim()),
      cardDetailForm: () =>
        store.updateCardDetails(
          this.ctx.colId,
          this.ctx.cardId,
          this.getFormValues()
        ),
    };
  }

  bindEvents() {
    document.addEventListener('click', (e) => this.routeClick(e));
    document.addEventListener('change', (e) => this.routeChange(e));
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      const action = this.submitActions[e.target.id];
      if (action) {
        action();
        this.modals.close(e.target.id.replace('Form', ''));
      }
    });
    this.ui.kanbanContainer.addEventListener(
      'blur',
      (e) =>
        e.target.matches('.column-title-input') && this.saveColTitle(e.target),
      true
    );
    this.ui.kanbanContainer.addEventListener(
      'keydown',
      (e) =>
        e.key === 'Enter' &&
        e.target.matches('.column-title-input') &&
        e.target.blur()
    );
  }

  routeClick(e) {
    const t = e.target,
      id = t.id;
    const actionKey =
      t.dataset.action || t.closest('[data-action]')?.dataset.action || id;

    if (this.actions[actionKey]) return this.actions[actionKey](t);
    if (id?.startsWith('cancel') || id?.endsWith('CloseBtn')) {
      const modal = Object.values(this.modals.modals).find((m) =>
        m.el.contains(t)
      );
      if (modal)
        this.modals.close(
          Object.keys(this.modals.modals).find(
            (k) => this.modals.modals[k] === modal
          )
        );
    }

    if (t.classList.contains('column-title-text')) {
      t.style.display = 'none';
      const inp = t.nextElementSibling;
      inp.style.display = 'block';
      inp.focus();
    }
    if (t.classList.contains('add-card-btn'))
      this.toggleAddCard(t.closest('.column'), true);
    if (t.classList.contains('label-delete-btn')) {
      if (confirm(i18n.t('board.confirmDeleteLabel')))
        store.removeLabel(t.dataset.id);
      this.renderLabels();
    }
    if (t.classList.contains('label-edit-btn')) {
      const l = store.getLabels().find((x) => x.id === t.dataset.id);
      const n = prompt(i18n.t('board.promptLabelName'), l.name);
      if (n?.trim())
        store.updateLabel(
          l.id,
          n.trim(),
          prompt(i18n.t('board.promptLabelColor'), l.color) || l.color
        );
      this.renderLabels();
    }
    const card = t.closest('.card');
    if (
      card &&
      !card.classList.contains('dragging') &&
      !t.closest('.card-actions') &&
      !t.closest('.card-complete-toggle')
    ) {
      this.openCard(
        card.dataset.cardId,
        card.closest('.column').dataset.columnId
      );
    }
  }

  routeChange(e) {
    const t = e.target;
    if (t.id === 'langSelector') i18n.setLanguage(t.value);
    if (t.id === 'boardSelector') store.setActiveBoard(t.value);
    if (t.id === 'importFileInput' && t.files[0]) {
      const r = new FileReader();
      r.onload = (ev) => store.importData(ev.target.result);
      r.readAsText(t.files[0]);
    }
    if (t.matches('.card-complete-checkbox'))
      store.toggleCardComplete(
        t.closest('.column').dataset.columnId,
        t.closest('.card').dataset.cardId
      );
    if (t.closest('#labelsSelector'))
      this.ctx.labels = t.checked
        ? [...this.ctx.labels, t.value]
        : this.ctx.labels.filter((l) => l !== t.value);
  }

  render() {
    this.ui.kanbanContainer.innerHTML = '';
    this.ui.kanbanContainer.classList.toggle(
      'filters-active',
      this.fm.isActive()
    );
    store.getState()?.columns.forEach((col) => {
      this.ui.kanbanContainer.appendChild(
        new Column({
          ...col,
          cards: this.fm.applyFilters(col.cards, store.getLabels()),
        }).render()
      );
    });
  }

  handleDrop(cId, nColId, nOrd) {
    const oldColId = store
      .getState()
      .columns.find((c) => c.cards.some((cd) => cd.id === cId))?.id;
    oldColId === nColId
      ? store.reorderCards(nColId, nOrd)
      : store.moveCard(cId, oldColId, nColId, nOrd);
  }

  toggleAddCard(col, show) {
    col.querySelector('.add-card-form').classList.toggle('active', show);
    col.querySelector('.add-card-btn').style.display = show ? 'none' : 'block';
    const inp = col.querySelector('.card-input');
    show ? inp.focus() : (inp.value = '');
  }

  saveColTitle(inp) {
    store.updateColumnTitle(
      inp.closest('.column').dataset.columnId,
      inp.value.trim() || 'Untitled'
    );
    inp.style.display = 'none';
    inp.previousElementSibling.style.display = 'block';
  }

  dupCard(cId, colId) {
    const dup = store.duplicateCard(colId, cId);
    if (dup)
      setTimeout(() => {
        const el = this.ui.kanbanContainer.querySelector(
          `[data-card-id="${dup.id}"]`
        );
        el?.classList.add('card-duplicated');
        setTimeout(() => el?.classList.remove('card-duplicated'), 1000);
      }, 50);
  }

  openCard(cId, colId) {
    const { card } = store.getCard(cId) || {};
    if (!card) return;
    this.ctx = { cardId: cId, colId, labels: [...(card.labels || [])] };
    const fields = {
      Title: 'text',
      Description: 'description',
      StartDate: 'startDate',
      DueDate: 'dueDate',
      Effort: 'effort',
      Priority: 'priority',
    };
    Object.entries(fields).forEach(
      ([k, v]) =>
        (this.ui[`card${k}Input`].value = card[v] || (v === 'effort' ? 0 : ''))
    );
    this.ui.cardCompletedInput.checked = card.completed || false;
    this.renderLogs(card.logs);
    this.renderLabelSelector();
    this.modals.open('cardDetail');
  }

  getFormValues() {
    return {
      text: this.ui.cardTitleInput.value,
      description: this.ui.cardDescriptionInput.value,
      startDate: this.ui.cardStartDateInput.value || null,
      dueDate: this.ui.cardDueDateInput.value || null,
      effort: Number(this.ui.cardEffortInput.value) || 0,
      completed: this.ui.cardCompletedInput.checked,
      priority: this.ui.cardPriorityInput.value,
      labels: this.ctx.labels,
    };
  }

  addLog() {
    const text = this.ui.newLogInput.value.trim();
    if (text) {
      store.addCardLog(this.ctx.colId, this.ctx.cardId, text);
      this.renderLogs(store.getCard(this.ctx.cardId).card.logs);
      this.ui.newLogInput.value = '';
    }
  }

  renderLogs(logs = []) {
    this.ui.cardLogList.style.display = logs.length ? 'block' : 'none';
    this.ui.cardLogList.innerHTML = [...logs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (l) =>
          `<div class="log-entry"><div class="log-header"><span class="log-timestamp">${new Date(l.createdAt).toLocaleString()}</span></div><div class="log-text">${l.text}</div></div>`
      )
      .join('');
  }

  renderLabelSelector() {
    this.ui.labelsSelector.innerHTML = store
      .getLabels()
      .map(
        (l) =>
          `<label class="label-checkbox"><input type="checkbox" value="${l.id}" ${this.ctx.labels.includes(l.id) ? 'checked' : ''}/><span class="label-chip" style="background:${l.color}">${l.name}</span></label>`
      )
      .join('');
  }

  renderLabels() {
    this.ui.labelsList.innerHTML = store
      .getLabels()
      .map(
        (l) =>
          `<div class="label-item"><span class="label-preview" style="background:${l.color}">${l.name}</span><div class="label-actions"><button class="label-edit-btn" data-id="${l.id}">✏️</button><button class="label-delete-btn" data-id="${l.id}">🗑️</button></div></div>`
      )
      .join('');
  }

  addLabel() {
    const name = this.ui.newLabelName.value.trim();
    if (name) {
      store.addLabel(name, this.ui.newLabelColor.value);
      this.ui.newLabelName.value = '';
      this.renderLabels();
    }
  }

  resetCtx() {
    this.ui.cardDetailForm.reset();
    this.ctx = { cardId: null, colId: null, labels: [] };
    this.ui.cardLogList.innerHTML = '';
  }

  exportData() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(store.state, null, 2)], {
        type: 'application/json',
      })
    );
    a.download = 'kanban-backup.json';
    a.click();
  }

  populateLangSelector() {
    const cur = i18n.getLanguage();
    this.ui.langSelector.innerHTML = [
      cur,
      ...supportedLanguages.filter((l) => l !== cur),
    ]
      .map(
        (l) =>
          `<option value="${l}">${languageMeta[l].flag} ${languageMeta[l].short || l.toUpperCase()}</option>`
      )
      .join('');
    this.ui.langSelector.value = cur;
  }

  updateBoardSelector() {
    const boards = store.getBoards();
    this.ui.boardSelector.innerHTML = boards
      .map(
        (b) =>
          `<option value="${b.id}" ${b.id === store.activeBoardId ? 'selected' : ''}>${b.name}</option>`
      )
      .join('');
    if (this.ui.deleteBoardBtn)
      this.ui.deleteBoardBtn.disabled = boards.length <= 1;
  }

  populateOptions() {
    const o = this.picker.getOptions();
    ['Priority', 'DueDate', 'Aging'].forEach(
      (k) => (this.ui[`optFactor${k}`].checked = o[`factor${k}`])
    );
    this.ui.optExcludeCompleted.checked = o.excludeCompleted;
    this.ui.optColumnsSelector.innerHTML = store
      .getState()
      ?.columns.map(
        (c) =>
          `<label class="options-column-checkbox"><input type="checkbox" value="${c.id}" ${!o.includeColumns.length || o.includeColumns.includes(c.id) ? 'checked' : ''} /><span>${c.title}</span></label>`
      )
      .join('');
  }

  saveOptions() {
    const checked = Array.from(
      this.ui.optColumnsSelector.querySelectorAll('input:checked')
    ).map((i) => i.value);
    this.picker.setOptions({
      factorPriority: this.ui.optFactorPriority.checked,
      factorDueDate: this.ui.optFactorDueDate.checked,
      factorAging: this.ui.optFactorAging.checked,
      excludeCompleted: this.ui.optExcludeCompleted.checked,
      includeColumns:
        checked.length < this.ui.optColumnsSelector.children.length
          ? checked
          : [],
    });
  }

  pickRandom() {
    const res = this.picker.pickRandomCard(store.getState());
    this.picked = res;
    this.ui.randomPickerResult.style.display = res ? 'block' : 'none';
    this.ui.randomPickerEmpty.style.display = res ? 'none' : 'block';
    this.ui.goToCardBtn.style.display = res ? 'inline-block' : 'none';

    if (res) {
      const labels = store
        .getLabels()
        .filter((l) => res.card.labels?.includes(l.id))
        .map(
          (l) =>
            `<span class="card-label" style="background:${l.color}">${l.name}</span>`
        )
        .join('');
      this.ui.randomPickerCard.innerHTML = `${labels ? `<div class="randomizer-card-labels">${labels}</div>` : ''}<div class="randomizer-card-title">${res.card.text}</div>`;
      this.ui.randomPickerColumnInfo.innerHTML = `<span class="column-indicator">${i18n.t('modals.randomPicker.inColumn')}</span><span class="column-name">${res.column.title}</span>`;
    }
    this.ui.randomPickerStats.innerHTML = `<div class="stats-text">${i18n.t('modals.randomPicker.stats', this.picker.getPoolStats(store.getState()))}</div>`;
    this.modals.open('randomPicker');
  }
}
