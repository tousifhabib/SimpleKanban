import FilterManager, {
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
  SEARCH_OPERATORS,
} from '../managers/FilterManager.js';
import { i18n } from '../services/i18n/i18nService.js';

export default class FilterPanel {
  constructor(container, options = {}) {
    this.container = container;
    this.filterManager = options.filterManager || new FilterManager();
    this.labels = options.labels || [];
    this.columns = options.columns || [];
    this.onFilterChange = options.onFilterChange || (() => {});
    this.isExpanded = false;

    this.render();

    i18n.subscribe(() => {
      this.render();
    });

    this.filterManager.subscribe(() => {
      this.renderActiveChips();
      this.updateFilterIndicator();
      this.onFilterChange(this.filterManager.getFilters());
    });
  }

  setLabels(labels) {
    this.labels = labels;
    this.renderLabelFilter();
  }

  setColumns(columns) {
    this.columns = columns;
  }

  render() {
    const currentSearch =
      this.container.querySelector('.filter-search-input')?.value || '';

    this.container.innerHTML = '';
    this.container.className = 'advanced-filter-panel';

    const quickBar = document.createElement('div');
    quickBar.className = 'filter-quick-bar';
    quickBar.innerHTML = `
      <div class="filter-search-container">
        <span class="search-icon">🔍</span>
        <input type="text" class="filter-search-input" placeholder="${i18n.t('filters.searchPlaceholder')}" value="${currentSearch}" />
        <button class="search-options-btn" title="${i18n.t('filters.search.matchType')}">⚙️</button>
      </div>
      <div class="filter-quick-actions">
        <button class="filter-toggle-btn ${this.isExpanded ? 'active' : ''}" title="${i18n.t('filters.advancedFilters')}">
          <span class="filter-icon">🎛️</span>
          <span class="filter-count-badge" style="display: none;">0</span>
        </button>
        <button class="filter-presets-btn" title="${i18n.t('filters.presets')}">📋</button>
        <button class="filter-clear-btn" title="${i18n.t('filters.clear')}" style="display: none;">✕ ${i18n.t('filters.clear')}</button>
      </div>
    `;
    this.container.appendChild(quickBar);

    const searchOptions = document.createElement('div');
    searchOptions.className = 'search-options-dropdown';
    searchOptions.style.display = 'none';
    searchOptions.innerHTML = `
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="text" checked /> ${i18n.t('filters.search.title')}</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="description" checked /> ${i18n.t('filters.search.description')}</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="labels" checked /> ${i18n.t('filters.search.labels')}</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="logs" /> ${i18n.t('filters.search.logs')}</label>
      </div>
      <div class="search-option-divider"></div>
      <div class="search-option">
        <label>
          ${i18n.t('filters.search.matchType')}:
          <select name="searchOperator">
            <option value="${SEARCH_OPERATORS.CONTAINS}">${i18n.t('filters.search.contains')}</option>
            <option value="${SEARCH_OPERATORS.EXACT}">${i18n.t('filters.search.exact')}</option>
            <option value="${SEARCH_OPERATORS.STARTS_WITH}">${i18n.t('filters.search.startsWith')}</option>
            <option value="${SEARCH_OPERATORS.NOT_CONTAINS}">${i18n.t('filters.search.notContains')}</option>
          </select>
        </label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="caseSensitive" /> ${i18n.t('filters.search.caseSensitive')}</label>
      </div>
    `;
    quickBar
      .querySelector('.filter-search-container')
      .appendChild(searchOptions);

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'filter-chips-container';
    chipsContainer.style.display = 'none';
    this.container.appendChild(chipsContainer);

    const advancedPanel = document.createElement('div');
    advancedPanel.className = 'filter-advanced-panel';
    advancedPanel.style.display = this.isExpanded ? 'block' : 'none';
    advancedPanel.innerHTML = `
      <div class="filter-sections">
        <div class="filter-section filter-section-labels">
          <h4 class="filter-section-title">
            <span>🏷️ ${i18n.t('filters.sections.labels')}</span>
            <div class="label-match-mode">
              <button data-mode="${LABEL_MATCH_MODE.ANY}">${i18n.t('filters.labelMatch.any')}</button>
              <button data-mode="${LABEL_MATCH_MODE.ALL}">${i18n.t('filters.labelMatch.all')}</button>
              <button data-mode="${LABEL_MATCH_MODE.NONE}">${i18n.t('filters.labelMatch.none')}</button>
            </div>
          </h4>
          <div class="filter-labels-grid"></div>
        </div>
        
        <div class="filter-section filter-section-priority">
          <h4 class="filter-section-title">🚩 ${i18n.t('filters.sections.priority')}</h4>
          <div class="filter-priority-options">
            <label class="filter-checkbox priority-high"><input type="checkbox" value="high" /> ${i18n.t('card.priorities.high')}</label>
            <label class="filter-checkbox priority-medium"><input type="checkbox" value="medium" /> ${i18n.t('card.priorities.medium')}</label>
            <label class="filter-checkbox priority-low"><input type="checkbox" value="low" /> ${i18n.t('card.priorities.low')}</label>
            <label class="filter-checkbox priority-none"><input type="checkbox" value="none" /> ${i18n.t('card.priorities.none')}</label>
          </div>
        </div>

        <div class="filter-section filter-section-due">
          <h4 class="filter-section-title">🔴 ${i18n.t('filters.sections.dueDate')}</h4>
          <div class="filter-due-status">
            <select class="filter-select filter-due-status-select">
              <option value="${DUE_STATUS.ALL}">${i18n.t('filters.dueStatus.all')}</option>
              <option value="${DUE_STATUS.OVERDUE}">${i18n.t('filters.dueStatus.overdue')}</option>
              <option value="${DUE_STATUS.DUE_TODAY}">${i18n.t('filters.dueStatus.dueToday')}</option>
              <option value="${DUE_STATUS.DUE_SOON}">${i18n.t('filters.dueStatus.dueSoon')}</option>
              <option value="${DUE_STATUS.DUE_THIS_WEEK}">${i18n.t('filters.dueStatus.dueThisWeek')}</option>
              <option value="${DUE_STATUS.HAS_DUE_DATE}">${i18n.t('filters.dueStatus.hasDueDate')}</option>
              <option value="${DUE_STATUS.NO_DUE_DATE}">${i18n.t('filters.dueStatus.noDueDate')}</option>
            </select>
          </div>
          <div class="filter-date-range">
            <input type="date" class="filter-date-input filter-due-from" placeholder="${i18n.t('filters.range.from')}" />
            <span class="date-range-separator">→</span>
            <input type="date" class="filter-date-input filter-due-to" placeholder="${i18n.t('filters.range.to')}" />
          </div>
        </div>

        <div class="filter-section filter-section-start">
          <h4 class="filter-section-title">🟢 ${i18n.t('filters.sections.startDate')}</h4>
          <div class="filter-date-range">
            <input type="date" class="filter-date-input filter-start-from" placeholder="${i18n.t('filters.range.from')}" />
            <span class="date-range-separator">→</span>
            <input type="date" class="filter-date-input filter-start-to" placeholder="${i18n.t('filters.range.to')}" />
          </div>
        </div>

        <div class="filter-section filter-section-status">
          <h4 class="filter-section-title">✅ ${i18n.t('filters.sections.status')}</h4>
          <div class="filter-status-options">
            <label class="filter-radio"><input type="radio" name="completionStatus" value="${COMPLETION_STATUS.ALL}" /> ${i18n.t('filters.completion.all')}</label>
            <label class="filter-radio"><input type="radio" name="completionStatus" value="${COMPLETION_STATUS.INCOMPLETE}" /> ${i18n.t('filters.completion.incomplete')}</label>
            <label class="filter-radio"><input type="radio" name="completionStatus" value="${COMPLETION_STATUS.COMPLETED}" /> ${i18n.t('filters.completion.completed')}</label>
          </div>
        </div>

        <div class="filter-section filter-section-effort">
          <h4 class="filter-section-title">⏱️ ${i18n.t('filters.sections.effort')}</h4>
          <div class="filter-effort-range">
            <input type="number" class="filter-number-input filter-effort-min" placeholder="${i18n.t('filters.range.min')}" min="0" step="0.5" />
            <span class="range-separator">-</span>
            <input type="number" class="filter-number-input filter-effort-max" placeholder="${i18n.t('filters.range.max')}" min="0" step="0.5" />
          </div>
        </div>

        <div class="filter-section filter-section-aging">
          <h4 class="filter-section-title">📅 ${i18n.t('filters.sections.activity')}</h4>
          <div class="filter-aging-options">
            <select class="filter-select filter-aging-select">
              <option value="${AGING_OPTIONS.ALL}">${i18n.t('filters.aging.all')}</option>
              <option value="${AGING_OPTIONS.FRESH}">${i18n.t('filters.aging.fresh')}</option>
              <option value="${AGING_OPTIONS.AGING}">${i18n.t('filters.aging.aging')}</option>
              <option value="${AGING_OPTIONS.STALE}">${i18n.t('filters.aging.stale')}</option>
              <option value="${AGING_OPTIONS.ABANDONED}">${i18n.t('filters.aging.abandoned')}</option>
            </select>
          </div>
        </div>
      </div>
    `;
    this.container.appendChild(advancedPanel);

    const presetsDropdown = document.createElement('div');
    presetsDropdown.className = 'filter-presets-dropdown';
    presetsDropdown.style.display = 'none';
    presetsDropdown.innerHTML = `
      <div class="presets-header">
        <span>${i18n.t('filters.presets')}</span>
        <button class="preset-save-btn">💾 ${i18n.t('filters.savePreset')}</button>
      </div>
      <div class="presets-list"></div>
    `;
    this.container.appendChild(presetsDropdown);

    this.setupEventListeners();
    this.syncFormWithFilters();
    this.renderLabelFilter();
    this.updateFilterIndicator();
    this.renderActiveChips();
  }

  setupEventListeners() {
    const searchInput = this.container.querySelector('.filter-search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filterManager.setSearch(e.target.value.trim());
      }, 300);
    });

    const searchOptionsBtn = this.container.querySelector(
      '.search-options-btn'
    );
    const searchOptionsDropdown = this.container.querySelector(
      '.search-options-dropdown'
    );
    searchOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchOptionsDropdown.style.display =
        searchOptionsDropdown.style.display === 'none' ? 'block' : 'none';
    });

    searchOptionsDropdown.addEventListener('change', () => {
      const fields = Array.from(
        searchOptionsDropdown.querySelectorAll(
          'input[name="searchField"]:checked'
        )
      ).map((cb) => cb.value);
      const operator = searchOptionsDropdown.querySelector(
        'select[name="searchOperator"]'
      ).value;
      const caseSensitive = searchOptionsDropdown.querySelector(
        'input[name="caseSensitive"]'
      ).checked;
      this.filterManager.setSearch(searchInput.value.trim(), {
        fields,
        operator,
        caseSensitive,
      });
    });

    const toggleBtn = this.container.querySelector('.filter-toggle-btn');
    const advancedPanel = this.container.querySelector(
      '.filter-advanced-panel'
    );
    toggleBtn.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      advancedPanel.style.display = this.isExpanded ? 'block' : 'none';
      toggleBtn.classList.toggle('active', this.isExpanded);
    });

    const clearBtn = this.container.querySelector('.filter-clear-btn');
    clearBtn.addEventListener('click', () => {
      this.filterManager.clearAll();
      searchInput.value = '';
      this.syncFormWithFilters();
    });

    const matchModeButtons = this.container.querySelectorAll(
      '.label-match-mode button'
    );
    matchModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterManager.setLabelMatchMode(btn.dataset.mode);
      });
    });

    this.container
      .querySelectorAll('.filter-priority-options input')
      .forEach((cb) => {
        cb.addEventListener('change', () => {
          const selected = Array.from(
            this.container.querySelectorAll(
              '.filter-priority-options input:checked'
            )
          ).map((c) => c.value);
          this.filterManager.setPriorities(selected);
        });
      });

    this.container
      .querySelector('.filter-due-status-select')
      .addEventListener('change', (e) => {
        this.filterManager.setDueDate({ status: e.target.value });
      });

    const dueFromInput = this.container.querySelector('.filter-due-from');
    const dueToInput = this.container.querySelector('.filter-due-to');
    dueFromInput.addEventListener('change', () =>
      this.filterManager.setDueDate({ from: dueFromInput.value || null })
    );
    dueToInput.addEventListener('change', () =>
      this.filterManager.setDueDate({ to: dueToInput.value || null })
    );

    const startFromInput = this.container.querySelector('.filter-start-from');
    const startToInput = this.container.querySelector('.filter-start-to');
    startFromInput.addEventListener('change', () =>
      this.filterManager.setStartDate({ from: startFromInput.value || null })
    );
    startToInput.addEventListener('change', () =>
      this.filterManager.setStartDate({ to: startToInput.value || null })
    );

    this.container
      .querySelectorAll('input[name="completionStatus"]')
      .forEach((radio) => {
        radio.addEventListener('change', () => {
          if (radio.checked) this.filterManager.setCompletion(radio.value);
        });
      });

    const effortMinInput = this.container.querySelector('.filter-effort-min');
    const effortMaxInput = this.container.querySelector('.filter-effort-max');
    const updateEffort = () => {
      const min = effortMinInput.value
        ? parseFloat(effortMinInput.value)
        : null;
      const max = effortMaxInput.value
        ? parseFloat(effortMaxInput.value)
        : null;
      this.filterManager.setEffort(min, max);
    };
    effortMinInput.addEventListener('change', updateEffort);
    effortMaxInput.addEventListener('change', updateEffort);

    this.container
      .querySelector('.filter-aging-select')
      .addEventListener('change', (e) => {
        this.filterManager.setAging(e.target.value);
      });

    const presetsBtn = this.container.querySelector('.filter-presets-btn');
    const presetsDropdown = this.container.querySelector(
      '.filter-presets-dropdown'
    );
    presetsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      presetsDropdown.style.display =
        presetsDropdown.style.display === 'none' ? 'block' : 'none';
      this.renderPresetsList();
    });

    this.container
      .querySelector('.preset-save-btn')
      .addEventListener('click', () => {
        const name = prompt(i18n.t('filters.enterPresetName'));
        if (name && name.trim()) {
          this.filterManager.createPreset(name.trim());
          this.renderPresetsList();
        }
      });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-search-container'))
        searchOptionsDropdown.style.display = 'none';
      if (
        !e.target.closest('.filter-presets-btn') &&
        !e.target.closest('.filter-presets-dropdown')
      )
        presetsDropdown.style.display = 'none';
    });
  }

  renderLabelFilter() {
    const grid = this.container.querySelector('.filter-labels-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const selectedLabels = this.filterManager.getFilters().labels.selected;
    this.labels.forEach((label) => {
      const labelEl = document.createElement('label');
      labelEl.className = `filter-label-chip ${selectedLabels.includes(label.id) ? 'selected' : ''}`;
      labelEl.style.setProperty('--label-color', label.color);
      labelEl.innerHTML = `
        <input type="checkbox" value="${label.id}" ${selectedLabels.includes(label.id) ? 'checked' : ''} />
        <span class="label-color" style="background: ${label.color}"></span>
        <span class="label-name">${label.name}</span>
      `;
      labelEl.querySelector('input').addEventListener('change', () => {
        this.filterManager.toggleLabel(label.id);
        labelEl.classList.toggle('selected');
      });
      grid.appendChild(labelEl);
    });
  }

  renderActiveChips() {
    const container = this.container.querySelector('.filter-chips-container');
    const chips = this.filterManager.getActiveFilterChips(this.labels);
    if (chips.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    container.innerHTML = '';
    chips.forEach((chip) => {
      const chipEl = document.createElement('div');
      chipEl.className = `filter-chip filter-chip-${chip.type}`;
      chipEl.innerHTML = `<span class="chip-label">${chip.label}</span><button class="chip-clear">×</button>`;
      chipEl.querySelector('.chip-clear').addEventListener('click', () => {
        chip.clear();
        this.syncFormWithFilters();
      });
      container.appendChild(chipEl);
    });
  }

  updateFilterIndicator() {
    const badge = this.container.querySelector('.filter-count-badge');
    const clearBtn = this.container.querySelector('.filter-clear-btn');
    const count = this.filterManager.getActiveFilterCount();
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
      clearBtn.style.display = 'block';
    } else {
      badge.style.display = 'none';
      clearBtn.style.display = 'none';
    }
  }

  renderPresetsList() {
    const list = this.container.querySelector('.presets-list');
    const presets = this.filterManager.getPresets();
    if (presets.length === 0) {
      list.innerHTML = `<div class="presets-empty">${i18n.t('filters.noPresets')}</div>`;
      return;
    }
    list.innerHTML = '';
    presets.forEach((preset) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.innerHTML = `
        <span class="preset-name">${preset.name}</span>
        <div class="preset-actions">
          <button class="preset-apply">✓</button>
          <button class="preset-delete">🗑</button>
        </div>
      `;
      item.querySelector('.preset-apply').addEventListener('click', () => {
        this.filterManager.applyPreset(preset.id);
        this.syncFormWithFilters();
      });
      item.querySelector('.preset-delete').addEventListener('click', () => {
        if (confirm(i18n.t('filters.deletePreset'))) {
          this.filterManager.deletePreset(preset.id);
          this.renderPresetsList();
        }
      });
      list.appendChild(item);
    });
  }

  syncFormWithFilters() {
    const filters = this.filterManager.getFilters();
    const searchInput = this.container.querySelector('.filter-search-input');
    if (searchInput) searchInput.value = filters.search.term;

    const matchModeButtons = this.container.querySelectorAll(
      '.label-match-mode button'
    );
    matchModeButtons.forEach((btn) =>
      btn.classList.toggle(
        'active',
        btn.dataset.mode === filters.labels.matchMode
      )
    );

    this.container
      .querySelectorAll('.filter-priority-options input')
      .forEach((cb) => {
        cb.checked = filters.priority.selected.includes(cb.value);
      });

    this.container.querySelector('.filter-due-status-select').value =
      filters.dueDate.status;
    this.container.querySelector('.filter-due-from').value =
      filters.dueDate.from || '';
    this.container.querySelector('.filter-due-to').value =
      filters.dueDate.to || '';
    this.container.querySelector('.filter-start-from').value =
      filters.startDate.from || '';
    this.container.querySelector('.filter-start-to').value =
      filters.startDate.to || '';

    this.container
      .querySelectorAll('input[name="completionStatus"]')
      .forEach((radio) => {
        radio.checked = radio.value === filters.completion;
      });

    this.container.querySelector('.filter-effort-min').value =
      filters.effort.min ?? '';
    this.container.querySelector('.filter-effort-max').value =
      filters.effort.max ?? '';
    this.container.querySelector('.filter-aging-select').value = filters.aging;

    this.renderLabelFilter();
  }

  getFilterManager() {
    return this.filterManager;
  }
}
