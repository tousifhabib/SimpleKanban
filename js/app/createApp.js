// The application shell: wires the pure core (domain transitions and
// selectors) to the DOM through factories and injected dependencies.
// Everything effectful the app does flows through `env`.

import { createBoardStore, STORAGE_KEY } from './boardStore.js';
import { createUiRefs } from './uiRefs.js';
import { createModals } from './modals.js';
import { createCardDetail } from './cardDetail.js';
import { createRandomPicker } from './randomPicker.js';
import {
  createBoardCommands,
  createFormSubmitHandlers,
} from './boardCommands.js';
import { setupBoardEvents } from './boardEvents.js';
import * as make from '../domain/board/commands.js';
import * as sel from '../domain/board/selectors.js';
import { importProgram } from '../effects/programs.js';
import { runInBrowser } from '../effects/browserInterpreter.js';
import { renderColumn } from '../views/board/ColumnView.js';
import { renderLabelsList } from '../views/board/LabelsList.js';
import {
  renderBoardOptions,
  renderLangOptions,
} from '../views/layout/selectorOptions.js';
import { createFilterStore } from './filterStore.js';
import { createFilterPanel } from './filterPanel.js';
import { createPickerOptions } from './pickerOptions.js';
import { filterCards, isActive } from '../domain/filters/predicates.js';
import DragDropManager from '../managers/DragDropManager.js';
import GanttView from '../views/gantt/GanttView.js';
import { i18n } from '../services/i18n/i18nService.js';
import {
  supportedLanguages,
  languageMeta,
} from '../services/i18n/locales/index.js';

export const createApp = ({ env, doc }) => {
  const ui = createUiRefs(doc);
  const localeTemplates = () => i18n.getLocale().templates;
  const store = createBoardStore(env, localeTemplates());

  const dispatch = store.dispatch;
  const query = store.getState;
  const fx = env.fx;
  const t = (key, params) => i18n.t(key, params);
  const ask = {
    confirm: (message) => env.interactions.confirm(message).run(),
    prompt: (message, def) => env.interactions.prompt(message, def).run(),
  };
  const runEffects = runInBrowser(env);

  const uiStore = createFilterStore(env);
  const filtersActive = () => isActive(uiStore.getState().filters);
  const pickerOptions = createPickerOptions(env);
  const modals = createModals(doc);
  const cardDetail = createCardDetail({ ui, modals, dispatch, query, fx, t });
  const rp = createRandomPicker({ ui, modals, pickerOptions, query, fx, t });

  const render = () => {
    ui.kanbanContainer.replaceChildren();
    ui.kanbanContainer.classList.toggle('filters-active', filtersActive());
    const labels = sel.labels(query());
    const applyFilters = filterCards(uiStore.getState().filters, {
      labels,
      now: fx.now(),
    });
    sel.activeBoard(query())?.columns.forEach((col) => {
      ui.kanbanContainer.appendChild(
        renderColumn({ ...col, cards: applyFilters(col.cards) }, { labels })
      );
    });
  };

  const gantt = new GanttView(ui.ganttView, {
    getBoard: () => sel.activeBoard(query()),
    getLabels: () => sel.labels(query()),
    onCardClick: (card, colId) => {
      switchView('kanban');
      cardDetail.open(card.id, colId);
    },
    onNavigateBack: () => switchView('kanban'),
  });

  const switchView = (viewName) => {
    doc
      .querySelectorAll('.nav-btn')
      .forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.view === viewName)
      );
    ui.kanbanView.hidden = viewName !== 'kanban';
    ui.ganttView.hidden = viewName !== 'gantt';
    if (viewName === 'gantt') gantt.render();
    else render();
  };

  const filterPanel = createFilterPanel(ui.filterBar, {
    uiStore,
    labels: sel.labels(query()),
    onFilterChange: () => render(),
    t,
    ask,
    fx,
    subscribeI18n: (fn) => i18n.subscribe(fn),
  });

  const renderLabels = () => {
    ui.labelsList.replaceChildren(...renderLabelsList(sel.labels(query())));
  };

  const updateBoardSelector = () => {
    const boards = sel.boardList(query());
    ui.boardSelector.replaceChildren(
      ...renderBoardOptions(boards, sel.activeBoardId(query()))
    );
    if (ui.deleteBoardBtn) ui.deleteBoardBtn.disabled = boards.length <= 1;
  };

  const populateLangSelector = () => {
    const current = i18n.getLanguage();
    ui.langSelector.replaceChildren(
      ...renderLangOptions(current, supportedLanguages, languageMeta)
    );
    ui.langSelector.value = current;
  };

  const toggleAddCard = (col, show) => {
    col.querySelector('.add-card-form').classList.toggle('active', show);
    col.querySelector('.add-card-btn').style.display = show ? 'none' : 'block';
    const input = col.querySelector('.card-input');
    if (show) input.focus();
    else input.value = '';
  };

  const saveColTitle = (input) => {
    dispatch(
      make.renameColumn()(
        input.closest('.column').dataset.columnId,
        input.value.trim() || 'Untitled'
      )
    );
    input.style.display = 'none';
    input.previousElementSibling.style.display = 'block';
  };

  const handleDrop = (cardId, newColId, newOrder) => {
    const oldColId = sel
      .activeBoard(query())
      .columns.find((c) => c.cards.some((card) => card.id === cardId))?.id;
    if (oldColId === newColId) {
      dispatch(make.reorderCards()(newColId, newOrder));
    } else {
      dispatch(make.moveCard(fx)(cardId, oldColId, newColId, newOrder));
    }
  };

  new DragDropManager(ui.kanbanContainer, {
    onDropCard: (cardId, newColId, newOrder) =>
      !filtersActive() && handleDrop(cardId, newColId, newOrder),
    onDropColumn: (newOrder) =>
      !filtersActive() && dispatch(make.reorderColumns()(newOrder)),
  });

  const modalConfigs = [
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
      () => cardDetail.reset(),
    ],
    [
      'labels',
      'manageLabelModal',
      'manageLabelOverlay',
      null,
      () => {
        ui.newLabelName.value = '';
        ui.newLabelColor.value = '#5e6c84';
      },
    ],
    [
      'randomPicker',
      'randomPickerModal',
      'randomPickerOverlay',
      null,
      () => rp.clearPicked(),
    ],
  ];
  modalConfigs.forEach(([name, modalId, overlayId, formId, onReset]) =>
    modals.register(name, { modalId, overlayId, formId, onReset })
  );

  const commands = createBoardCommands({
    ui,
    modals,
    pickerOptions,
    dispatch,
    query,
    fx,
    t,
    ask,
    runEffects,
    localeTemplates,
    get cardCtx() {
      return cardDetail.cardCtx;
    },
    picked: rp.picked,
    openCard: (id, col) => cardDetail.open(id, col),
    renderLabels,
    renderLogs: (logs) => cardDetail.renderLogs(logs),
    renderDependencies: (deps) => cardDetail.renderDependencies(deps),
    populateDependencySelect: () => cardDetail.populateDependencySelect(),
    populateOptions: rp.populateOptions,
    saveOptions: rp.saveOptions,
    pickRandom: rp.pickRandom,
    toggleAddCard,
  });

  const formHandlers = createFormSubmitHandlers({
    ui,
    dispatch,
    query,
    fx,
    localeTemplates,
  }).set('cardDetailForm', () => cardDetail.save());

  setupBoardEvents({
    ui,
    modals,
    commands,
    formHandlers,
    dispatch,
    fx,
    setLanguage: (lang) => i18n.setLanguage(lang),
    importJson: (json) => {
      try {
        return runEffects(importProgram(STORAGE_KEY, json));
      } catch {
        return false;
      }
    },
    openCard: (id, col) => cardDetail.open(id, col),
    saveColTitle,
    onSwitchView: switchView,
    onLabelToggle: (id, checked) => cardDetail.toggleLabel(id, checked),
  });

  const refresh = () => {
    updateBoardSelector();
    filterPanel.setLabels(sel.labels(query()));
    populateLangSelector();
    render();
    gantt.render();
  };

  store.subscribe(refresh);
  i18n.subscribe(refresh);
  refresh();

  return Object.freeze({ store, refresh, switchView });
};
