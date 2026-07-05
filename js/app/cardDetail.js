// Card-detail controller as a closure factory. The draft (open card id,
// column, pending label toggles) is legitimate view-local state held in
// the closure; every read goes through selectors, every write through
// dispatch. Render helpers are pure functions of their data.

import { el } from '../utils/domUtils.js';
import * as make from '../domain/board/commands.js';
import * as sel from '../domain/board/selectors.js';
import { getOrElse, map } from '../fp/maybe.js';

const renderLogEntries = (logs) =>
  [...logs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((log) =>
      el(
        'div',
        { class: 'log-entry' },
        el(
          'div',
          { class: 'log-header' },
          el(
            'span',
            { class: 'log-timestamp' },
            new Date(log.createdAt).toLocaleString()
          )
        ),
        el('div', { class: 'log-text' }, log.text)
      )
    );

const renderLabelOptions = (allLabels, selectedIds) =>
  allLabels.map((label) =>
    el(
      'label',
      { class: 'label-checkbox' },
      el('input', {
        type: 'checkbox',
        value: label.id,
        checked: selectedIds.includes(label.id),
      }),
      el(
        'span',
        { class: 'label-chip', style: { background: label.color } },
        label.name
      )
    )
  );

const renderDependencyItems = (deps, lookupCard, t) => {
  if (!deps.length) {
    return [
      el(
        'div',
        { class: 'no-dependencies' },
        t('card.detail.noDependencies') || 'No dependencies'
      ),
    ];
  }
  return deps
    .map((dep) =>
      getOrElse(null)(
        map(({ card }) =>
          el(
            'div',
            { class: 'dependency-item' },
            el(
              'div',
              { class: 'dependency-info' },
              el(
                'span',
                {
                  style: {
                    background: '#e2e8f0',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '8px',
                  },
                },
                dep.type
              ),
              el('span', {
                class: `dependency-priority priority-${card.priority}`,
              }),
              el('span', { class: 'dependency-title' }, card.text)
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'dependency-remove-btn',
                dataset: { id: card.id },
              },
              '✕'
            )
          )
        )(lookupCard(dep.id))
      )
    )
    .filter(Boolean);
};

export const createCardDetail = ({ ui, modals, dispatch, query, fx, t }) => {
  let draft = { cardId: null, colId: null, labels: [] };

  const lookupCard = (id) => sel.findCard(id)(query());

  const renderLogs = (logs = []) => {
    ui.cardLogList.style.display = logs.length ? 'block' : 'none';
    ui.cardLogList.replaceChildren(...renderLogEntries(logs));
  };

  const renderLabelSelector = () => {
    ui.labelsSelector.replaceChildren(
      ...renderLabelOptions(sel.labels(query()), draft.labels)
    );
  };

  const renderDependencies = (deps = []) => {
    ui.dependenciesList.replaceChildren(
      ...renderDependencyItems(deps, lookupCard, t)
    );
  };

  const populateDependencySelect = () => {
    const currentDepIds = getOrElse([])(
      map(({ card }) => (card.dependencies || []).map((d) => d.id))(
        lookupCard(draft.cardId)
      )
    );
    const available = sel
      .allCards(query())
      .filter(
        (entry) =>
          entry.card.id !== draft.cardId &&
          !currentDepIds.includes(entry.card.id)
      );

    ui.dependencySelect.replaceChildren(
      ui.dependencySelect.options[0],
      ...available.map((entry) =>
        el(
          'option',
          { value: entry.card.id },
          `${entry.card.text} (${entry.columnTitle})`
        )
      )
    );
  };

  const getFormValues = () => ({
    text: ui.cardTitleInput.value,
    description: ui.cardDescriptionInput.value,
    startDate: ui.cardStartDateInput.value || null,
    dueDate: ui.cardDueDateInput.value || null,
    effort: Number(ui.cardEffortInput.value) || 0,
    priority: ui.cardPriorityInput.value,
    completed: ui.cardCompletedInput.checked,
    labels: draft.labels,
  });

  return Object.freeze({
    get cardCtx() {
      return draft;
    },

    open(cardId, colId) {
      const found = lookupCard(cardId);
      const card = getOrElse(null)(map((entry) => entry.card)(found));
      if (!card) return;

      draft = { cardId, colId, labels: [...(card.labels || [])] };

      const fieldMap = {
        cardTitleInput: card.text,
        cardDescriptionInput: card.description,
        cardStartDateInput: card.startDate,
        cardDueDateInput: card.dueDate,
        cardEffortInput: card.effort || 0,
        cardPriorityInput: card.priority || 'none',
      };
      Object.entries(fieldMap).forEach(([id, value]) => {
        ui[id].value = value || '';
      });
      ui.cardCompletedInput.checked = !!card.completed;

      renderLogs(card.logs);
      renderLabelSelector();
      renderDependencies(card.dependencies);
      populateDependencySelect();
      modals.open('cardDetail');
    },

    save() {
      dispatch(make.updateCard(fx)(draft.colId, draft.cardId, getFormValues()));
    },

    toggleLabel(labelId, checked) {
      draft = {
        ...draft,
        labels: checked
          ? [...draft.labels, labelId]
          : draft.labels.filter((l) => l !== labelId),
      };
    },

    reset() {
      ui.cardDetailForm.reset();
      draft = { cardId: null, colId: null, labels: [] };
      ui.cardLogList.replaceChildren();
    },

    renderLogs,
    renderDependencies,
    populateDependencySelect,
  });
};
