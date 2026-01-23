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
    this.container.className = 'advanced-filter-panel';
    this.init();
  }

  setLabels(labels) {
    this.labels = labels;
    this.renderAdvanced();
  }

  init() {
    this.render();
    this.fm.subscribe(() => {
      this.syncUI();
      this.onFilterChange(this.fm.getFilters());
    });
    i18n.subscribe(() => this.render());
    this.bindEvents();
  }

  t = (k, p) => i18n.t(k, p);

  render() {
    this.container.replaceChildren(
      this.renderQuickBar(),
      el('div', { class: 'filter-chips-container', hidden: true }),
      el('div', { class: 'filter-advanced-panel', hidden: true })
    );
    this.renderAdvanced();
    this.renderChips();
    this.updateBadge();
  }

  renderQuickBar() {
    const f = this.fm.getFilters();
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
          { class: 'search-options-btn', dataset: { toggle: 'searchOpts' } },
          '⚙️'
        ),
        this.renderSearchDropdown(f)
      ),
      el(
        'div',
        { class: 'filter-quick-actions' },
        el(
          'button',
          { class: 'filter-toggle-btn', dataset: { toggle: 'expanded' } },
          '🎛️'
        ),
        el(
          'button',
          { class: 'filter-presets-btn', dataset: { toggle: 'presets' } },
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
          `💾`
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
        content: this.renderLabels(f),
      },
      {
        title: `🚩 ${this.t('filters.sections.priority')}`,
        content: this.renderPriorities(f),
      },
      {
        title: `🔴 ${this.t('filters.sections.dueDate')}`,
        content: this.renderDate(f, 'due'),
      },
      {
        title: `🟢 ${this.t('filters.sections.startDate')}`,
        content: this.renderDate(f, 'start'),
      },
      {
        title: `✅ ${this.t('filters.sections.status')}`,
        content: this.renderStatus(f),
      },
      {
        title: `⏱️ ${this.t('filters.sections.effort')}`,
        content: this.renderEffort(f),
      },
      {
        title: `📅 ${this.t('filters.sections.activity')}`,
        content: this.renderAging(f),
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

  renderLabels(f) {
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

  renderPriorities(f) {
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

  renderDate(f, type) {
    const k = type === 'due' ? 'dueDate' : 'startDate';
    const hasStatus = type === 'due';
    return el(
      'div',
      {},
      hasStatus
        ? el(
            'select',
            { class: 'filter-select', dataset: { action: 'dueStatus' } },
            ...Object.values(DUE_STATUS).map((s) =>
              el(
                'option',
                { value: s, selected: f[k].status === s },
                this.t(`filters.dueStatus.${s}`)
              )
            )
          )
        : null,
      el(
        'div',
        { class: 'filter-date-range' },
        el('input', {
          type: 'date',
          class: 'filter-date-input',
          dataset: { input: `${type}From` },
          value: f[k].from || '',
          placeholder: this.t('filters.range.from'),
        }),
        el('span', { class: 'date-range-separator' }, '→'),
        el('input', {
          type: 'date',
          class: 'filter-date-input',
          dataset: { input: `${type}To` },
          value: f[k].to || '',
          placeholder: this.t('filters.range.to'),
        })
      )
    );
  }

  renderStatus(f) {
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

  renderEffort(f) {
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

  renderAging(f) {
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
    this.container.querySelector('.filter-clear-btn').hidden =
      !this.fm.getActiveFilterCount();
  }

  syncUI() {
    if (this.state.expanded) this.renderAdvanced();
    this.renderChips();
    this.updateBadge();
    const searchInput = this.container.querySelector('[data-input="search"]');
    if (searchInput && document.activeElement !== searchInput)
      searchInput.value = this.fm.getFilters().search.term ?? '';
  }

  bindEvents() {
    let searchTimer;
    this.container.addEventListener('input', (e) => {
      const { input } = e.target.dataset;
      const val = e.target.value;
      const handlers = {
        search: () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(() => this.fm.setSearch(val.trim()), 300);
        },
        dueFrom: () => this.fm.setDueDate({ from: val || null }),
        dueTo: () => this.fm.setDueDate({ to: val || null }),
        startFrom: () => this.fm.setStartDate({ from: val || null }),
        startTo: () => this.fm.setStartDate({ to: val || null }),
        effortMin: () => this.fm.setEffort(val ? parseFloat(val) : null, null),
        effortMax: () => this.fm.setEffort(null, val ? parseFloat(val) : null),
      };
      handlers[input]?.();
    });

    this.container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action], [data-toggle]');
      if (!el) {
        if (
          !e.target.closest(
            '.search-options-dropdown, .filter-presets-dropdown'
          )
        )
          this.container
            .querySelectorAll(
              '.search-options-dropdown, .filter-presets-dropdown'
            )
            .forEach((d) => (d.hidden = true));
        return;
      }
      const { action, toggle } = el.dataset;

      if (toggle) {
        if (toggle === 'expanded') {
          this.state.expanded = !this.state.expanded;
          this.renderAdvanced();
        } else {
          const t = this.container.querySelector(`#dropdown-${toggle}`);
          t.hidden = !t.hidden;
          if (toggle === 'presets' && !t.hidden) this.renderPresets();
        }
        return;
      }

      const actions = {
        clearAll: () => {
          this.fm.clearAll();
          this.container.querySelector('[data-input="search"]').value = '';
        },
        toggleLabel: () => this.fm.toggleLabel(el.value),
        labelMode: () => this.fm.setLabelMatchMode(el.value),
        togglePriority: () =>
          this.fm.setPriorities(
            Array.from(
              this.container.querySelectorAll(
                '[data-action="togglePriority"]:checked'
              )
            ).map((c) => c.value)
          ),
        savePreset: () => {
          const n = prompt(this.t('filters.enterPresetName'));
          if (n?.trim()) {
            this.fm.createPreset(n.trim());
            this.renderPresets();
          }
        },
        applyPreset: () => this.fm.applyPreset(el.dataset.id),
        deletePreset: () => {
          if (confirm(this.t('filters.deletePreset'))) {
            this.fm.deletePreset(el.dataset.id);
            this.renderPresets();
          }
        },
      };
      actions[action]?.();
    });

    this.container.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.action === 'dueStatus')
        this.fm.setDueDate({ status: t.value });
      else if (t.dataset.action === 'aging') this.fm.setAging(t.value);
      else if (t.dataset.action === 'completion')
        this.fm.setCompletion(t.value);
      else if (
        ['searchField', 'searchOp', 'searchCase'].includes(t.dataset.action)
      ) {
        this.fm.setSearch(
          this.container.querySelector('[data-input="search"]').value.trim(),
          {
            fields: Array.from(
              this.container.querySelectorAll(
                '[data-action="searchField"]:checked'
              )
            ).map((c) => c.value),
            operator: this.container.querySelector('[data-action="searchOp"]')
              .value,
            caseSensitive: this.container.querySelector(
              '[data-action="searchCase"]'
            ).checked,
          }
        );
      }
    });
  }
}
