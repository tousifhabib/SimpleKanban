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
    this.container.innerHTML = '';
    this.container.className = 'advanced-filter-panel';

    const quickBar = document.createElement('div');
    quickBar.className = 'filter-quick-bar';
    quickBar.innerHTML = `
      <div class="filter-search-container">
        <span class="search-icon">🔍</span>
        <input type="text" class="filter-search-input" placeholder="${i18n.t('filters.searchPlaceholder') || 'Search cards...'}" />
        <button class="search-options-btn" title="Search options">⚙️</button>
      </div>
      <div class="filter-quick-actions">
        <button class="filter-toggle-btn" title="Advanced filters">
          <span class="filter-icon">🎛️</span>
          <span class="filter-count-badge" style="display: none;">0</span>
        </button>
        <button class="filter-presets-btn" title="Filter presets">📋</button>
        <button class="filter-clear-btn" title="Clear all filters" style="display: none;">✕ Clear</button>
      </div>
    `;
    this.container.appendChild(quickBar);

    const searchOptions = document.createElement('div');
    searchOptions.className = 'search-options-dropdown';
    searchOptions.style.display = 'none';
    searchOptions.innerHTML = `
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="text" checked /> Title</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="description" checked /> Description</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="labels" checked /> Labels</label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="searchField" value="logs" /> Work Logs</label>
      </div>
      <div class="search-option-divider"></div>
      <div class="search-option">
        <label>
          Match type:
          <select name="searchOperator">
            <option value="${SEARCH_OPERATORS.CONTAINS}">Contains</option>
            <option value="${SEARCH_OPERATORS.EXACT}">Exact match</option>
            <option value="${SEARCH_OPERATORS.STARTS_WITH}">Starts with</option>
            <option value="${SEARCH_OPERATORS.NOT_CONTAINS}">Does not contain</option>
          </select>
        </label>
      </div>
      <div class="search-option">
        <label><input type="checkbox" name="caseSensitive" /> Case sensitive</label>
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
    advancedPanel.style.display = 'none';
    advancedPanel.innerHTML = `
      <div class="filter-sections">
        <div class="filter-section filter-section-labels">
          <h4 class="filter-section-title">
            <span>🏷️ Labels</span>
            <div class="label-match-mode">
              <button data-mode="${LABEL_MATCH_MODE.ANY}" class="active" title="Match ANY label">Any</button>
              <button data-mode="${LABEL_MATCH_MODE.ALL}" title="Match ALL labels">All</button>
              <button data-mode="${LABEL_MATCH_MODE.NONE}" title="Match NONE">None</button>
            </div>
          </h4>
          <div class="filter-labels-grid"></div>
        </div>
        
        <div class="filter-section filter-section-priority">
          <h4 class="filter-section-title">🚩 Priority</h4>
          <div class="filter-priority-options">
            <label class="filter-checkbox priority-high">
              <input type="checkbox" value="high" /> High
            </label>
            <label class="filter-checkbox priority-medium">
              <input type="checkbox" value="medium" /> Medium
            </label>
            <label class="filter-checkbox priority-low">
              <input type="checkbox" value="low" /> Low
            </label>
            <label class="filter-checkbox priority-none">
              <input type="checkbox" value="none" /> None
            </label>
          </div>
        </div>

        <div class="filter-section filter-section-due">
          <h4 class="filter-section-title">🔴 Due Date</h4>
          <div class="filter-due-status">
            <select class="filter-select filter-due-status-select">
              <option value="${DUE_STATUS.ALL}">All</option>
              <option value="${DUE_STATUS.OVERDUE}">Overdue</option>
              <option value="${DUE_STATUS.DUE_TODAY}">Due Today</option>
              <option value="${DUE_STATUS.DUE_SOON}">Due Soon (3 days)</option>
              <option value="${DUE_STATUS.DUE_THIS_WEEK}">Due This Week</option>
              <option value="${DUE_STATUS.HAS_DUE_DATE}">Has Due Date</option>
              <option value="${DUE_STATUS.NO_DUE_DATE}">No Due Date</option>
            </select>
          </div>
          <div class="filter-date-range">
            <input type="date" class="filter-date-input filter-due-from" placeholder="From" />
            <span class="date-range-separator">→</span>
            <input type="date" class="filter-date-input filter-due-to" placeholder="To" />
          </div>
        </div>

        <div class="filter-section filter-section-start">
          <h4 class="filter-section-title">🟢 Start Date</h4>
          <div class="filter-date-range">
            <input type="date" class="filter-date-input filter-start-from" placeholder="From" />
            <span class="date-range-separator">→</span>
            <input type="date" class="filter-date-input filter-start-to" placeholder="To" />
          </div>
        </div>

        <div class="filter-section filter-section-status">
          <h4 class="filter-section-title">✅ Status</h4>
          <div class="filter-status-options">
            <label class="filter-radio">
              <input type="radio" name="completionStatus" value="${COMPLETION_STATUS.ALL}" checked /> All
            </label>
            <label class="filter-radio">
              <input type="radio" name="completionStatus" value="${COMPLETION_STATUS.INCOMPLETE}" /> Incomplete
            </label>
            <label class="filter-radio">
              <input type="radio" name="completionStatus" value="${COMPLETION_STATUS.COMPLETED}" /> Completed
            </label>
          </div>
        </div>

        <div class="filter-section filter-section-effort">
          <h4 class="filter-section-title">⏱️ Effort (hours)</h4>
          <div class="filter-effort-range">
            <input type="number" class="filter-number-input filter-effort-min" placeholder="Min" min="0" step="0.5" />
            <span class="range-separator">-</span>
            <input type="number" class="filter-number-input filter-effort-max" placeholder="Max" min="0" step="0.5" />
          </div>
        </div>

        <div class="filter-section filter-section-aging">
          <h4 class="filter-section-title">📅 Last Activity</h4>
          <div class="filter-aging-options">
            <select class="filter-select filter-aging-select">
              <option value="${AGING_OPTIONS.ALL}">All</option>
              <option value="${AGING_OPTIONS.FRESH}">Fresh (< 3 days)</option>
              <option value="${AGING_OPTIONS.AGING}">Aging (3-7 days)</option>
              <option value="${AGING_OPTIONS.STALE}">Stale (7-14 days)</option>
              <option value="${AGING_OPTIONS.ABANDONED}">Abandoned (14+ days)</option>
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
        <span>Saved Filters</span>
        <button class="preset-save-btn" title="Save current filters">💾 Save</button>
      </div>
      <div class="presets-list"></div>
    `;
    this.container.appendChild(presetsDropdown);

    this.setupEventListeners();
    this.renderLabelFilter();
    this.updateFilterIndicator();
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
      this.resetFormInputs();
    });

    const matchModeButtons = this.container.querySelectorAll(
      '.label-match-mode button'
    );
    matchModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        matchModeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterManager.setLabelMatchMode(btn.dataset.mode);
      });
    });

    const priorityCheckboxes = this.container.querySelectorAll(
      '.filter-priority-options input'
    );
    priorityCheckboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        const selected = Array.from(priorityCheckboxes)
          .filter((c) => c.checked)
          .map((c) => c.value);
        this.filterManager.setPriorities(selected);
      });
    });

    const dueStatusSelect = this.container.querySelector(
      '.filter-due-status-select'
    );
    dueStatusSelect.addEventListener('change', () => {
      this.filterManager.setDueDate({ status: dueStatusSelect.value });
    });

    const dueFromInput = this.container.querySelector('.filter-due-from');
    const dueToInput = this.container.querySelector('.filter-due-to');
    dueFromInput.addEventListener('change', () => {
      this.filterManager.setDueDate({ from: dueFromInput.value || null });
    });
    dueToInput.addEventListener('change', () => {
      this.filterManager.setDueDate({ to: dueToInput.value || null });
    });

    const startFromInput = this.container.querySelector('.filter-start-from');
    const startToInput = this.container.querySelector('.filter-start-to');
    startFromInput.addEventListener('change', () => {
      this.filterManager.setStartDate({ from: startFromInput.value || null });
    });
    startToInput.addEventListener('change', () => {
      this.filterManager.setStartDate({ to: startToInput.value || null });
    });

    const completionRadios = this.container.querySelectorAll(
      'input[name="completionStatus"]'
    );
    completionRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.filterManager.setCompletion(radio.value);
        }
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

    const agingSelect = this.container.querySelector('.filter-aging-select');
    agingSelect.addEventListener('change', () => {
      this.filterManager.setAging(agingSelect.value);
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

    const savePresetBtn = this.container.querySelector('.preset-save-btn');
    savePresetBtn.addEventListener('click', () => {
      const name = prompt('Enter preset name:');
      if (name && name.trim()) {
        this.filterManager.createPreset(name.trim());
        this.renderPresetsList();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-search-container')) {
        searchOptionsDropdown.style.display = 'none';
      }
      if (
        !e.target.closest('.filter-presets-btn') &&
        !e.target.closest('.filter-presets-dropdown')
      ) {
        presetsDropdown.style.display = 'none';
      }
    });
  }

  renderLabelFilter() {
    const grid = this.container.querySelector('.filter-labels-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const selectedLabels = this.filterManager.getFilters().labels.selected;

    this.labels.forEach((label) => {
      const labelEl = document.createElement('label');
      labelEl.className = 'filter-label-chip';
      labelEl.style.setProperty('--label-color', label.color);

      const isSelected = selectedLabels.includes(label.id);
      if (isSelected) {
        labelEl.classList.add('selected');
      }

      labelEl.innerHTML = `
        <input type="checkbox" value="${label.id}" ${isSelected ? 'checked' : ''} />
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
      chipEl.innerHTML = `
        <span class="chip-label">${chip.label}</span>
        <button class="chip-clear" title="Remove filter">×</button>
      `;

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
      list.innerHTML = '<div class="presets-empty">No saved filters</div>';
      return;
    }

    list.innerHTML = '';
    presets.forEach((preset) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.innerHTML = `
        <span class="preset-name">${preset.name}</span>
        <div class="preset-actions">
          <button class="preset-apply" title="Apply">✓</button>
          <button class="preset-delete" title="Delete">🗑</button>
        </div>
      `;

      item.querySelector('.preset-apply').addEventListener('click', () => {
        this.filterManager.applyPreset(preset.id);
        this.syncFormWithFilters();
      });

      item.querySelector('.preset-delete').addEventListener('click', () => {
        if (confirm('Delete this preset?')) {
          this.filterManager.deletePreset(preset.id);
          this.renderPresetsList();
        }
      });

      list.appendChild(item);
    });
  }

  syncFormWithFilters() {
    const filters = this.filterManager.getFilters();

    this.container.querySelector('.filter-search-input').value =
      filters.search.term;

    this.renderLabelFilter();
    const matchModeButtons = this.container.querySelectorAll(
      '.label-match-mode button'
    );
    matchModeButtons.forEach((btn) => {
      btn.classList.toggle(
        'active',
        btn.dataset.mode === filters.labels.matchMode
      );
    });

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
  }

  resetFormInputs() {
    this.syncFormWithFilters();
  }

  getFilterManager() {
    return this.filterManager;
  }
}
