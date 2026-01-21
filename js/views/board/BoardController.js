import { store } from '../../state/Store.js';
import { el } from '../../utils/domUtils.js';
import { renderColumn } from './ColumnView.js';
import DragDropManager from '../../managers/DragDropManager.js';
import ModalManager from '../../managers/ModalManager.js';
import FilterManager from '../../managers/FilterManager.js';
import RandomPickerManager from '../../managers/RandomPickerManager.js';
import FilterPanel from '../common/FilterPanel.js';
import GanttView from '../gantt/GanttView.js';
import CardDetail from './CardDetail.js';
import {
  createBoardCommands,
  createFormSubmitHandlers,
} from './BoardCommands.js';
import { setupBoardEvents } from './BoardEvents.js';
import { i18n } from '../../services/i18n/i18nService.js';
import {
  supportedLanguages,
  languageMeta,
} from '../../services/i18n/locales/index.js';

export default class BoardController {
  constructor() {
    this.ui = new Proxy({}, { get: (_, id) => document.getElementById(id) });
    this.fm = new FilterManager();
    this.picker = new RandomPickerManager();
    this.modals = new ModalManager();
    this.cardCtrl = new CardDetail(this.ui, this.modals);
    this.gantt = null;
    this.picked = null;
    this.init();
  }

  init() {
    this.filterPanel = new FilterPanel(this.ui.filterBar, {
      filterManager: this.fm,
      labels: store.getLabels(),
      onFilterChange: () => this.render(),
    });

    this.gantt = new GanttView(this.ui.ganttView, {
      onCardClick: (card, colId) => {
        this.switchView('kanban');
        this.cardCtrl.open(card.id, colId);
      },
      onNavigateBack: () => this.switchView('kanban'),
    });

    this.setupModals();
    this.setupDragDrop();
    this.setupEvents();

    const refresh = () => {
      this.updateBoardSelector();
      this.filterPanel.setLabels(store.getLabels());
      this.populateLangSelector();
      this.render();
      this.gantt?.render();
    };

    store.subscribe(refresh);
    i18n.subscribe(refresh);
    refresh();
  }

  switchView(viewName) {
    document
      .querySelectorAll('.nav-btn')
      .forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.view === viewName)
      );
    this.ui.kanbanView.hidden = viewName !== 'kanban';
    this.ui.ganttView.hidden = viewName !== 'gantt';
    viewName === 'gantt' ? this.gantt.render() : this.render();
  }

  setupModals() {
    const configs = [
      [
        'createBoard',
        'createBoardModal',
        'createBoardOverlay',
        'createBoardForm',
      ],
      [
        'renameBoard',
        'renameBoardModal',
        'renameBoardOverlay',
        'renameBoardForm',
      ],
      ['deleteBoard', 'deleteBoardModal', 'deleteBoardOverlay'],
      ['addColumn', 'addColumnModal', 'modalOverlay', 'addColumnForm'],
      ['options', 'optionsModal', 'optionsOverlay'],
      [
        'cardDetail',
        'cardDetailModal',
        'cardDetailOverlay',
        'cardDetailForm',
        () => this.cardCtrl.reset(),
      ],
      [
        'labels',
        'manageLabelModal',
        'manageLabelOverlay',
        null,
        () => {
          this.ui.newLabelName.value = '';
          this.ui.newLabelColor.value = '#5e6c84';
        },
      ],
      [
        'randomPicker',
        'randomPickerModal',
        'randomPickerOverlay',
        null,
        () => (this.picked = null),
      ],
    ];
    configs.forEach(([name, modalId, overlayId, formId, onReset]) =>
      this.modals.register(name, { modalId, overlayId, formId, onReset })
    );
  }

  setupDragDrop() {
    new DragDropManager(this.ui.kanbanContainer, {
      onDropCard: (cId, nColId, nOrd) =>
        !this.fm.isActive() && this.handleDrop(cId, nColId, nOrd),
      onDropColumn: (nOrd) => !this.fm.isActive() && store.reorderColumns(nOrd),
    });
  }

  setupEvents() {
    const commandContext = {
      ui: this.ui,
      modals: this.modals,
      fm: this.fm,
      picker: this.picker,
      get cardCtx() {
        return this.cardCtrl.cardCtx;
      },
      get picked() {
        return this.picked;
      },
      getFormValues: () => this.cardCtrl.getFormValues(),
      openCard: (id, col) => this.cardCtrl.open(id, col),
      renderLabels: () => this.renderLabels(),
      renderLogs: (logs) => this.cardCtrl.renderLogs(logs),
      renderDependencies: (deps) => this.cardCtrl.renderDependencies(deps),
      populateDependencySelect: () => this.cardCtrl.populateDependencySelect(),
      populateOptions: () => this.populateOptions(),
      saveOptions: () => this.saveOptions(),
      pickRandom: () => this.pickRandom(),
      toggleAddCard: (col, show) => this.toggleAddCard(col, show),
      dupCard: (id, col) => this.dupCard(id, col),
    };

    setupBoardEvents({
      ui: Object.assign(Object.create(this.ui), {
        onSwitchView: (v) => this.switchView(v),
        onLabelToggle: (id, c) => this.cardCtrl.toggleLabel(id, c),
      }),
      modals: this.modals,
      commands: createBoardCommands(commandContext),
      formHandlers: createFormSubmitHandlers(this.ui, this.modals).set(
        'cardDetailForm',
        () => this.cardCtrl.save()
      ),
      openCard: (id, col) => this.cardCtrl.open(id, col),
      saveColTitle: (inp) => this.saveColTitle(inp),
    });
  }

  render() {
    this.ui.kanbanContainer.replaceChildren();
    this.ui.kanbanContainer.classList.toggle(
      'filters-active',
      this.fm.isActive()
    );
    store.getState()?.columns.forEach((col) => {
      this.ui.kanbanContainer.appendChild(
        renderColumn({
          ...col,
          cards: this.fm.applyFilters(col.cards, store.getLabels()),
        })
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
    if (dup) {
      setTimeout(() => {
        const elem = this.ui.kanbanContainer.querySelector(
          `[data-card-id="${dup.id}"]`
        );
        elem?.classList.add('card-duplicated');
        setTimeout(() => elem?.classList.remove('card-duplicated'), 1000);
      }, 50);
    }
  }

  renderLabels() {
    this.ui.labelsList.replaceChildren(
      ...store
        .getLabels()
        .map((l) =>
          el(
            'div',
            { class: 'label-item' },
            el(
              'span',
              { class: 'label-preview', style: { background: l.color } },
              l.name
            ),
            el(
              'div',
              { class: 'label-actions' },
              el(
                'button',
                { class: 'label-edit-btn', dataset: { id: l.id } },
                '✏️'
              ),
              el(
                'button',
                { class: 'label-delete-btn', dataset: { id: l.id } },
                '🗑️'
              )
            )
          )
        )
    );
  }

  populateLangSelector() {
    const cur = i18n.getLanguage();
    this.ui.langSelector.replaceChildren(
      ...[cur, ...supportedLanguages.filter((l) => l !== cur)].map((l) =>
        el(
          'option',
          { value: l },
          `${languageMeta[l].flag} ${languageMeta[l].short || l.toUpperCase()}`
        )
      )
    );
    this.ui.langSelector.value = cur;
  }

  updateBoardSelector() {
    const boards = store.getBoards();
    this.ui.boardSelector.replaceChildren(
      ...boards.map((b) =>
        el(
          'option',
          { value: b.id, selected: b.id === store.activeBoardId },
          b.name
        )
      )
    );
    if (this.ui.deleteBoardBtn)
      this.ui.deleteBoardBtn.disabled = boards.length <= 1;
  }

  populateOptions() {
    const o = this.picker.getOptions();
    ['Priority', 'DueDate', 'Aging'].forEach(
      (k) => (this.ui[`optFactor${k}`].checked = o[`factor${k}`])
    );
    this.ui.optExcludeCompleted.checked = o.excludeCompleted;
    this.ui.optColumnsSelector.replaceChildren(
      ...(store.getState()?.columns || []).map((c) =>
        el(
          'label',
          { class: 'options-column-checkbox' },
          el('input', {
            type: 'checkbox',
            value: c.id,
            checked:
              !o.includeColumns.length || o.includeColumns.includes(c.id),
          }),
          el('span', {}, c.title)
        )
      )
    );
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
        .filter((l) => res.card.labels?.includes(l.id));
      this.ui.randomPickerCard.replaceChildren(
        labels.length
          ? el(
              'div',
              { class: 'randomizer-card-labels' },
              ...labels.map((l) =>
                el(
                  'span',
                  { class: 'card-label', style: { background: l.color } },
                  l.name
                )
              )
            )
          : null,
        el('div', { class: 'randomizer-card-title' }, res.card.text)
      );
      this.ui.randomPickerColumnInfo.replaceChildren(
        el(
          'span',
          { class: 'column-indicator' },
          i18n.t('modals.randomPicker.inColumn')
        ),
        el('span', { class: 'column-name' }, res.column.title)
      );
    }

    this.ui.randomPickerStats.replaceChildren(
      el(
        'div',
        { class: 'stats-text' },
        i18n.t(
          'modals.randomPicker.stats',
          this.picker.getPoolStats(store.getState())
        )
      )
    );
    this.modals.open('randomPicker');
  }
}
