import { store } from '../../state/Store.js';
import { i18n } from '../../services/i18n/i18nService.js';
import { el } from '../../utils/domUtils.js';

export default class CardDetail {
  constructor(ui, modals) {
    this.ui = ui;
    this.modals = modals;
    this.ctx = { cardId: null, colId: null, labels: [] };
  }

  get cardCtx() {
    return this.ctx;
  }

  open(cardId, colId) {
    const { card } = store.getCard(cardId) || {};
    if (!card) return;

    this.ctx = { cardId, colId, labels: [...(card.labels || [])] };

    const map = {
      cardTitleInput: card.text,
      cardDescriptionInput: card.description,
      cardStartDateInput: card.startDate,
      cardDueDateInput: card.dueDate,
      cardEffortInput: card.effort || 0,
      cardPriorityInput: card.priority || 'none',
    };
    Object.entries(map).forEach(([id, val]) => (this.ui[id].value = val || ''));
    this.ui.cardCompletedInput.checked = !!card.completed;

    this.renderLogs(card.logs);
    this.renderLabelSelector();
    this.renderDependencies(card.dependencies);
    this.populateDependencySelect();
    this.modals.open('cardDetail');
  }

  getFormValues() {
    return {
      text: this.ui.cardTitleInput.value,
      description: this.ui.cardDescriptionInput.value,
      startDate: this.ui.cardStartDateInput.value || null,
      dueDate: this.ui.cardDueDateInput.value || null,
      effort: Number(this.ui.cardEffortInput.value) || 0,
      priority: this.ui.cardPriorityInput.value,
      completed: this.ui.cardCompletedInput.checked,
      labels: this.ctx.labels,
    };
  }

  save() {
    store.updateCardDetails(
      this.ctx.colId,
      this.ctx.cardId,
      this.getFormValues()
    );
  }

  toggleLabel(labelId, checked) {
    this.ctx.labels = checked
      ? [...this.ctx.labels, labelId]
      : this.ctx.labels.filter((l) => l !== labelId);
  }

  reset() {
    this.ui.cardDetailForm.reset();
    this.ctx = { cardId: null, colId: null, labels: [] };
    this.ui.cardLogList.innerHTML = '';
  }

  renderLogs(logs = []) {
    this.ui.cardLogList.style.display = logs.length ? 'block' : 'none';
    this.ui.cardLogList.replaceChildren(
      ...[...logs]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((l) =>
          el(
            'div',
            { class: 'log-entry' },
            el(
              'div',
              { class: 'log-header' },
              el(
                'span',
                { class: 'log-timestamp' },
                new Date(l.createdAt).toLocaleString()
              )
            ),
            el('div', { class: 'log-text' }, l.text)
          )
        )
    );
  }

  renderLabelSelector() {
    this.ui.labelsSelector.replaceChildren(
      ...store.getLabels().map((l) =>
        el(
          'label',
          { class: 'label-checkbox' },
          el('input', {
            type: 'checkbox',
            value: l.id,
            checked: this.ctx.labels.includes(l.id),
          }),
          el(
            'span',
            { class: 'label-chip', style: { background: l.color } },
            l.name
          )
        )
      )
    );
  }

  renderDependencies(deps = []) {
    if (!deps.length) {
      this.ui.dependenciesList.replaceChildren(
        el(
          'div',
          { class: 'no-dependencies' },
          i18n.t('card.detail.noDependencies') || 'No dependencies'
        )
      );
      return;
    }
    this.ui.dependenciesList.replaceChildren(
      ...deps
        .map((dep) => {
          const data = store.getCard(dep.id);
          if (!data) return null;

          return el(
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
                class: `dependency-priority priority-${data.card.priority}`,
              }),
              el('span', { class: 'dependency-title' }, data.card.text)
            ),
            el(
              'button',
              {
                type: 'button',
                class: 'dependency-remove-btn',
                dataset: { id: data.card.id },
              },
              '✕'
            )
          );
        })
        .filter(Boolean)
    );
  }

  populateDependencySelect() {
    const currentDeps = store.getCard(this.ctx.cardId)?.card.dependencies || [];
    const currentDepIds = currentDeps.map((d) => d.id);

    const available = store
      .getAllCards()
      .filter(
        (i) =>
          i.card.id !== this.ctx.cardId && !currentDepIds.includes(i.card.id)
      );

    this.ui.dependencySelect.replaceChildren(
      this.ui.dependencySelect.options[0],
      ...available.map((i) =>
        el('option', { value: i.card.id }, `${i.card.text} (${i.columnTitle})`)
      )
    );
  }
}
