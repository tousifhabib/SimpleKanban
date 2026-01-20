import { el } from '../../utils/domUtils.js';
import {
  SEARCH_OPERATORS,
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
} from '../../managers/FilterManager.js';
import { i18n } from '../../services/i18n/i18nService.js';

export default class FilterPanel {
  constructor(
    container,
    { filterManager, labels = [], onFilterChange = () => {} }
  ) {
    this.container = container;
    this.fm = filterManager;
    this.labels = labels;
    this.onFilterChange = onFilterChange;
    this.state = { expanded: false };
    this.init();
  }

  setLabels(labels) {
    this.labels = labels;
    this.renderAdvanced();
  }

  init() {
    this.container.className = 'advanced-filter-panel';
    this.render();
    this.fm.subscribe(() => {
      this.syncUI();
      this.renderChips();
      this.updateBadge();
      this.onFilterChange(this.fm.getFilters());
    });
    i18n.subscribe(() => this.render());
  }

  t = (k, p) => i18n.t(k, p);

  render() {
    const f = this.fm.getFilters();

    this.container.replaceChildren(
      this.renderQuickBar(f),
      el('div', { class: 'filter-chips-container', hidden: true }),
      el('div', { class: 'filter-advanced-panel', hidden: true })
    );

    this.renderAdvanced();
    this.renderChips();
    this.updateBadge();
    this.bindEvents();
  }

  renderQuickBar(f) {
    return el(
      'div',
      { class: 'filter-quick-bar' },
      el(
        'div',
        { class: 'filter-search-container' },
        el('span', { class: 'search-icon' }, '🔍'),
        el('input', {
          type: 'text',
          class: 'filter-search-input',
          dataset: { input: 'search' },
          placeholder: this.t('filters.searchPlaceholder'),
          value: f.search.term,
        }),
        el(
          'button',
          {
            class: 'search-options-btn',
            dataset: { toggle: 'searchOpts' },
            title: this.t('filters.search.matchType'),
          },
          '⚙️'
        ),
        this.renderSearchDropdown(f)
      ),
      el(
        'div',
        { class: 'filter-quick-actions' },
        el(
          'button',
          {
            class: 'filter-toggle-btn',
            dataset: { toggle: 'expanded' },
            title: this.t('filters.advancedFilters'),
          },
          el('span', { class: 'filter-icon' }, '🎛️')
        ),
        el(
          'button',
          {
            class: 'filter-presets-btn',
            dataset: { toggle: 'presets' },
            title: this.t('filters.presets'),
          },
          '📋'
        ),
        el(
          'button',
          {
            class: 'filter-clear-btn',
            dataset: { action: 'clearAll' },
            hidden: true,
          },
          `✕ ${this.t('filters.clear')}`
        )
      ),
      this.renderPresetsDropdown()
    );
  }

  renderSearchDropdown(f) {
    return el(
      'div',
      {
        class: 'search-options-dropdown',
        id: 'dropdown-searchOpts',
        hidden: true,
      },
      ...['text', 'description', 'labels', 'logs'].map((field) =>
        el(
          'label',
          {},
          el('input', {
            type: 'checkbox',
            dataset: { action: 'searchField' },
            value: field,
            checked: f.search.fields.includes(field),
          }),
          ` ${this.t(`filters.search.${field}`)}`
        )
      ),
      el('div', { class: 'search-option-divider' }),
      el(
        'label',
        {},
        `${this.t('filters.search.matchType')}: `,
        el(
          'select',
          { dataset: { action: 'searchOp' } },
          ...Object.values(SEARCH_OPERATORS).map((op) =>
            el(
              'option',
              { value: op, selected: f.search.operator === op },
              this.t(`filters.search.${op}`)
            )
          )
        )
      ),
      el(
        'label',
        {},
        el('input', {
          type: 'checkbox',
          dataset: { action: 'searchCase' },
          checked: f.search.caseSensitive,
        }),
        ` ${this.t('filters.search.caseSensitive')}`
      )
    );
  }

  renderPresetsDropdown() {
    return el(
      'div',
      {
        class: 'filter-presets-dropdown',
        id: 'dropdown-presets',
        hidden: true,
      },
      el(
        'div',
        { class: 'presets-header' },
        el('span', {}, this.t('filters.presets')),
        el(
          'button',
          { class: 'preset-save-btn', dataset: { action: 'savePreset' } },
          `💾 ${this.t('filters.savePreset')}`
        )
      ),
      el('div', { class: 'presets-list' })
    );
  }

  renderAdvanced() {
    const f = this.fm.getFilters();
    const panel = this.container.querySelector('.filter-advanced-panel');
    if (!panel) return;

    panel.hidden = !this.state.expanded;
    this.container
      .querySelector('[data-toggle="expanded"]')
      ?.classList.toggle('active', this.state.expanded);

    const sections = [
      {
        title: `🏷️ ${this.t('filters.sections.labels')}`,
        content: this.renderLabelSection(f),
      },
      {
        title: `🚩 ${this.t('filters.sections.priority')}`,
        content: this.renderPrioritySection(f),
      },
      {
        title: `🔴 ${this.t('filters.sections.dueDate')}`,
        content: this.renderDueDateSection(f),
      },
      {
        title: `🟢 ${this.t('filters.sections.startDate')}`,
        content: this.renderStartDateSection(f),
      },
      {
        title: `✅ ${this.t('filters.sections.status')}`,
        content: this.renderStatusSection(f),
      },
      {
        title: `⏱️ ${this.t('filters.sections.effort')}`,
        content: this.renderEffortSection(f),
      },
      {
        title: `📅 ${this.t('filters.sections.activity')}`,
        content: this.renderAgingSection(f),
      },
    ];

    panel.replaceChildren(
      el(
        'div',
        { class: 'filter-sections' },
        ...sections.map((s) =>
          el(
            'div',
            { class: 'filter-section' },
            el('h4', { class: 'filter-section-title' }, s.title),
            s.content
          )
        )
      )
    );
  }

  renderLabelSection(f) {
    return el(
      'div',
      {},
      el(
        'div',
        { class: 'label-match-mode' },
        ...Object.values(LABEL_MATCH_MODE).map((m) =>
          el(
            'button',
            {
              dataset: { action: 'labelMode' },
              value: m,
              class: f.labels.matchMode === m ? 'active' : '',
            },
            this.t(`filters.labelMatch.${m}`)
          )
        )
      ),
      el(
        'div',
        { class: 'filter-labels-grid' },
        ...this.labels.map((l) => {
          const selected = f.labels.selected.includes(l.id);
          return el(
            'label',
            {
              class: `filter-label-chip ${selected ? 'selected' : ''}`,
              style: { '--label-color': l.color },
            },
            el('input', {
              type: 'checkbox',
              dataset: { action: 'toggleLabel' },
              value: l.id,
              checked: selected,
              hidden: true,
            }),
            el('span', {
              class: 'label-color',
              style: { background: l.color },
            }),
            el('span', { class: 'label-name' }, l.name)
          );
        })
      )
    );
  }

  renderPrioritySection(f) {
    return el(
      'div',
      { class: 'filter-priority-options' },
      ...['high', 'medium', 'low', 'none'].map((p) =>
        el(
          'label',
          { class: `filter-checkbox priority-${p}` },
          el('input', {
            type: 'checkbox',
            dataset: { action: 'togglePriority' },
            value: p,
            checked: f.priority.selected.includes(p),
          }),
          ` ${this.t(`card.priorities.${p}`)}`
        )
      )
    );
  }

  renderDueDateSection(f) {
    return el(
      'div',
      {},
      el(
        'select',
        { class: 'filter-select', dataset: { action: 'dueStatus' } },
        ...Object.values(DUE_STATUS).map((s) =>
          el(
            'option',
            { value: s, selected: f.dueDate.status === s },
            this.t(`filters.dueStatus.${s}`)
          )
        )
      ),
      el(
        'div',
        { class: 'filter-date-range' },
        el('input', {
          type: 'date',
          class: 'filter-date-input',
          dataset: { input: 'dueFrom' },
          value: f.dueDate.from || '',
          placeholder: this.t('filters.range.from'),
        }),
        el('span', { class: 'date-range-separator' }, '→'),
        el('input', {
          type: 'date',
          class: 'filter-date-input',
          dataset: { input: 'dueTo' },
          value: f.dueDate.to || '',
          placeholder: this.t('filters.range.to'),
        })
      )
    );
  }

  renderStartDateSection(f) {
    return el(
      'div',
      { class: 'filter-date-range' },
      el('input', {
        type: 'date',
        class: 'filter-date-input',
        dataset: { input: 'startFrom' },
        value: f.startDate.from || '',
        placeholder: this.t('filters.range.from'),
      }),
      el('span', { class: 'date-range-separator' }, '→'),
      el('input', {
        type: 'date',
        class: 'filter-date-input',
        dataset: { input: 'startTo' },
        value: f.startDate.to || '',
        placeholder: this.t('filters.range.to'),
      })
    );
  }

  renderStatusSection(f) {
    return el(
      'div',
      { class: 'filter-status-options' },
      ...Object.values(COMPLETION_STATUS).map((s) =>
        el(
          'label',
          { class: 'filter-radio' },
          el('input', {
            type: 'radio',
            name: 'comp',
            dataset: { action: 'completion' },
            value: s,
            checked: f.completion === s,
          }),
          ` ${this.t(`filters.completion.${s}`)}`
        )
      )
    );
  }

  renderEffortSection(f) {
    return el(
      'div',
      { class: 'filter-effort-range' },
      el('input', {
        type: 'number',
        class: 'filter-number-input',
        dataset: { input: 'effortMin' },
        placeholder: this.t('filters.range.min'),
        min: 0,
        step: 0.5,
        value: f.effort.min ?? '',
      }),
      el('span', { class: 'range-separator' }, '-'),
      el('input', {
        type: 'number',
        class: 'filter-number-input',
        dataset: { input: 'effortMax' },
        placeholder: this.t('filters.range.max'),
        min: 0,
        step: 0.5,
        value: f.effort.max ?? '',
      })
    );
  }

  renderAgingSection(f) {
    return el(
      'select',
      { class: 'filter-select', dataset: { action: 'aging' } },
      ...Object.values(AGING_OPTIONS).map((o) =>
        el(
          'option',
          { value: o, selected: f.aging === o },
          this.t(`filters.aging.${o}`)
        )
      )
    );
  }

  renderChips() {
    const chips = this.fm.getActiveFilterChips(this.labels);
    const container = this.container.querySelector('.filter-chips-container');
    container.hidden = !chips.length;
    container.replaceChildren(
      ...chips.map((c) =>
        el(
          'div',
          { class: `filter-chip filter-chip-${c.type}` },
          el('span', { class: 'chip-label' }, c.label),
          el('button', { class: 'chip-clear', onClick: () => c.clear() }, '×')
        )
      )
    );
  }

  renderPresets() {
    const list = this.container.querySelector('.presets-list');
    const presets = this.fm.getPresets();
    list.replaceChildren(
      presets.length
        ? presets.map((p) =>
            el(
              'div',
              { class: 'preset-item' },
              el('span', { class: 'preset-name' }, p.name),
              el(
                'div',
                { class: 'preset-actions' },
                el(
                  'button',
                  {
                    class: 'preset-apply',
                    dataset: { action: 'applyPreset', id: p.id },
                  },
                  '✓'
                ),
                el(
                  'button',
                  {
                    class: 'preset-delete',
                    dataset: { action: 'deletePreset', id: p.id },
                  },
                  '🗑'
                )
              )
            )
          )
        : el('div', { class: 'presets-empty' }, this.t('filters.noPresets'))
    );
  }

  updateBadge() {
    const count = this.fm.getActiveFilterCount();
    const clear = this.container.querySelector('.filter-clear-btn');
    clear.hidden = !count;
  }

  syncUI() {
    if (!this.state.expanded) return;
    const f = this.fm.getFilters();
    const searchInput = this.container.querySelector('[data-input="search"]');
    if (searchInput && document.activeElement !== searchInput)
      searchInput.value = f.search.term ?? '';
    this.renderAdvanced();
  }

  bindEvents() {
    let searchTimer;

    this.container.addEventListener('input', (e) => {
      const t = e.target;
      const val = t.value;
      const act = t.dataset.input;

      const handlers = {
        search: () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(() => this.fm.setSearch(val.trim()), 300);
        },
        dueFrom: () => this.fm.setDueDate({ from: val || null }),
        dueTo: () => this.fm.setDueDate({ to: val || null }),
        startFrom: () => this.fm.setStartDate({ from: val || null }),
        startTo: () => this.fm.setStartDate({ to: val || null }),
        effortMin: () => this.updateEffort(),
        effortMax: () => this.updateEffort(),
      };

      handlers[act]?.();
    });

    this.container.addEventListener('click', (e) => {
      const elem = e.target.closest('[data-action], [data-toggle]');
      if (!elem) {
        if (
          !e.target.closest(
            '.search-options-dropdown, .filter-presets-dropdown'
          )
        ) {
          this.container
            .querySelectorAll(
              '.search-options-dropdown, .filter-presets-dropdown'
            )
            .forEach((d) => (d.hidden = true));
        }
        return;
      }

      if (elem.tagName === 'SELECT') return;

      const { action, toggle } = elem.dataset;
      const val = elem.value || elem.dataset.val;

      if (toggle) {
        if (toggle === 'expanded') {
          this.state.expanded = !this.state.expanded;
          this.renderAdvanced();
        } else {
          const target = this.container.querySelector(`#dropdown-${toggle}`);
          target.hidden = !target.hidden;
          if (toggle === 'presets' && !target.hidden) this.renderPresets();
        }
        return;
      }

      const actions = {
        clearAll: () => {
          this.fm.clearAll();
          this.container.querySelector('[data-input="search"]').value = '';
        },
        toggleLabel: () => this.fm.toggleLabel(val),
        labelMode: () => this.fm.setLabelMatchMode(val),
        togglePriority: () =>
          this.fm.setPriorities(
            Array.from(
              this.container.querySelectorAll(
                '[data-action="togglePriority"]:checked'
              )
            ).map((c) => c.value)
          ),
        savePreset: () => {
          const name = prompt(this.t('filters.enterPresetName'));
          if (name?.trim()) {
            this.fm.createPreset(name.trim());
            this.renderPresets();
          }
        },
        applyPreset: () => this.fm.applyPreset(elem.dataset.id),
        deletePreset: () => {
          if (confirm(this.t('filters.deletePreset'))) {
            this.fm.deletePreset(elem.dataset.id);
            this.renderPresets();
          }
        },
      };

      actions[action]?.();
    });

    this.container.addEventListener('change', (e) => {
      const t = e.target;
      const { action } = t.dataset;

      const handlers = {
        dueStatus: () => this.fm.setDueDate({ status: t.value }),
        aging: () => this.fm.setAging(t.value),
        completion: () => this.fm.setCompletion(t.value),
        searchField: () => this.updateSearchOpts(),
        searchOp: () => this.updateSearchOpts(),
        searchCase: () => this.updateSearchOpts(),
      };

      handlers[action]?.();
    });
  }

  updateEffort() {
    const min = this.container.querySelector('[data-input="effortMin"]').value;
    const max = this.container.querySelector('[data-input="effortMax"]').value;
    this.fm.setEffort(
      min ? parseFloat(min) : null,
      max ? parseFloat(max) : null
    );
  }

  updateSearchOpts() {
    const fields = Array.from(
      this.container.querySelectorAll('[data-action="searchField"]:checked')
    ).map((c) => c.value);
    const operator = this.container.querySelector(
      '[data-action="searchOp"]'
    ).value;
    const caseSensitive = this.container.querySelector(
      '[data-action="searchCase"]'
    ).checked;
    this.fm.setSearch(
      this.container.querySelector('[data-input="search"]').value.trim(),
      { fields, operator, caseSensitive }
    );
  }
}
