import {
  SEARCH_OPERATORS,
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
} from '../managers/FilterManager.js';
import { i18n } from '../services/i18n/i18nService.js';

export default class FilterPanel {
  constructor(
    container,
    { filterManager, labels = [], onFilterChange = () => {} }
  ) {
    this.container = container;
    this.fm = filterManager;
    this.labels = labels;
    this.onFilterChange = onFilterChange;
    this.state = { expanded: false, activeDropdown: null };

    this.init();
  }

  setLabels(labels) {
    this.labels = labels;
    this.renderAdvanced();
  }

  setColumns() {}

  init() {
    this.container.className = 'advanced-filter-panel';
    this.renderFrame();

    this.fm.subscribe(() => {
      this.syncUI();
      this.renderChips();
      this.updateBadge();
      this.onFilterChange(this.fm.getFilters());
    });

    i18n.subscribe(() => {
      this.renderFrame();
      this.syncUI();
    });

    this.bindEvents();
  }

  renderFrame() {
    const t = (k, p) => i18n.t(k, p);
    const f = this.fm.getFilters();

    this.container.innerHTML = `
      <div class="filter-quick-bar">
        <div class="filter-search-container">
          <span class="search-icon">🔍</span>
          <input type="text" class="filter-search-input" data-input="search" placeholder="${t('filters.searchPlaceholder')}" value="${f.search.term}">
          <button class="search-options-btn" data-toggle="searchOpts" title="${t('filters.search.matchType')}">⚙️</button>
          <div class="search-options-dropdown" id="dropdown-searchOpts" hidden>
            ${['text', 'description', 'labels', 'logs']
              .map(
                (field) =>
                  `<label><input type="checkbox" data-action="searchField" value="${field}" ${f.search.fields.includes(field) ? 'checked' : ''}> ${t(`filters.search.${field}`)}</label>`
              )
              .join('')}
            <div class="search-option-divider"></div>
            <label>${t('filters.search.matchType')}: <select data-action="searchOp">
              ${Object.values(SEARCH_OPERATORS)
                .map(
                  (op) =>
                    `<option value="${op}" ${f.search.operator === op ? 'selected' : ''}>${t(`filters.search.${op}`)}</option>`
                )
                .join('')}
            </select></label>
            <label><input type="checkbox" data-action="searchCase" ${f.search.caseSensitive ? 'checked' : ''}> ${t('filters.search.caseSensitive')}</label>
          </div>
        </div>
        <div class="filter-quick-actions">
          <button class="filter-toggle-btn" data-toggle="expanded" title="${t('filters.advancedFilters')}">
            <span class="filter-icon">🎛️</span>
          </button>
          <button class="filter-presets-btn" data-toggle="presets" title="${t('filters.presets')}">📋</button>
          <button class="filter-clear-btn" data-action="clearAll" hidden>✕ ${t('filters.clear')}</button>
        </div>
        <div class="filter-presets-dropdown" id="dropdown-presets" hidden>
          <div class="presets-header"><span>${t('filters.presets')}</span><button class="preset-save-btn" data-action="savePreset">💾 ${t('filters.savePreset')}</button></div>
          <div class="presets-list"></div>
        </div>
      </div>
      <div class="filter-chips-container" hidden></div>
      <div class="filter-advanced-panel" hidden></div>
    `;
    this.renderAdvanced();
    this.renderChips();
    this.updateBadge();
  }

  renderAdvanced() {
    const t = (k, p) => i18n.t(k, p);
    const f = this.fm.getFilters();
    const panel = this.container.querySelector('.filter-advanced-panel');
    if (!panel) return;

    panel.hidden = !this.state.expanded;
    this.container
      .querySelector('[data-toggle="expanded"]')
      .classList.toggle('active', this.state.expanded);

    const sections = [
      {
        title: `🏷️ ${t('filters.sections.labels')}`,
        html: `
          <div class="label-match-mode">
            ${Object.values(LABEL_MATCH_MODE)
              .map(
                (m) =>
                  `<button data-action="labelMode" value="${m}" class="${f.labels.matchMode === m ? 'active' : ''}">${t(`filters.labelMatch.${m}`)}</button>`
              )
              .join('')}
          </div>
          <div class="filter-labels-grid">
            ${this.labels
              .map((l) => {
                const selected = f.labels.selected.includes(l.id);
                return `<label class="filter-label-chip ${selected ? 'selected' : ''}" style="--label-color:${l.color}">
                <input type="checkbox" data-action="toggleLabel" value="${l.id}" ${selected ? 'checked' : ''} hidden>
                <span class="label-color" style="background:${l.color}"></span><span class="label-name">${l.name}</span>
              </label>`;
              })
              .join('')}
          </div>`,
      },
      {
        title: `🚩 ${t('filters.sections.priority')}`,
        html: `<div class="filter-priority-options">
          ${['high', 'medium', 'low', 'none'].map((p) => `<label class="filter-checkbox priority-${p}"><input type="checkbox" data-action="togglePriority" value="${p}" ${f.priority.selected.includes(p) ? 'checked' : ''}> ${t(`card.priorities.${p}`)}</label>`).join('')}
        </div>`,
      },
      {
        title: `🔴 ${t('filters.sections.dueDate')}`,
        html: `<select class="filter-select" data-action="dueStatus">
            ${Object.values(DUE_STATUS)
              .map(
                (s) =>
                  `<option value="${s}" ${f.dueDate.status === s ? 'selected' : ''}>${t(`filters.dueStatus.${s}`)}</option>`
              )
              .join('')}
          </select>
          <div class="filter-date-range">
            <input type="date" class="filter-date-input" data-input="dueFrom" value="${f.dueDate.from || ''}" placeholder="${t('filters.range.from')}">
            <span class="date-range-separator">→</span>
            <input type="date" class="filter-date-input" data-input="dueTo" value="${f.dueDate.to || ''}" placeholder="${t('filters.range.to')}">
          </div>`,
      },
      {
        title: `🟢 ${t('filters.sections.startDate')}`,
        html: `<div class="filter-date-range">
          <input type="date" class="filter-date-input" data-input="startFrom" value="${f.startDate.from || ''}" placeholder="${t('filters.range.from')}">
          <span class="date-range-separator">→</span>
          <input type="date" class="filter-date-input" data-input="startTo" value="${f.startDate.to || ''}" placeholder="${t('filters.range.to')}">
        </div>`,
      },
      {
        title: `✅ ${t('filters.sections.status')}`,
        html: `<div class="filter-status-options">
          ${Object.values(COMPLETION_STATUS)
            .map(
              (s) =>
                `<label class="filter-radio"><input type="radio" name="comp" data-action="completion" value="${s}" ${f.completion === s ? 'checked' : ''}> ${t(`filters.completion.${s}`)}</label>`
            )
            .join('')}
        </div>`,
      },
      {
        title: `⏱️ ${t('filters.sections.effort')}`,
        html: `<div class="filter-effort-range">
          <input type="number" class="filter-number-input" data-input="effortMin" placeholder="${t('filters.range.min')}" min="0" step="0.5" value="${f.effort.min ?? ''}">
          <span class="range-separator">-</span>
          <input type="number" class="filter-number-input" data-input="effortMax" placeholder="${t('filters.range.max')}" min="0" step="0.5" value="${f.effort.max ?? ''}">
        </div>`,
      },
      {
        title: `📅 ${t('filters.sections.activity')}`,
        html: `<select class="filter-select" data-action="aging">
          ${Object.values(AGING_OPTIONS)
            .map(
              (o) =>
                `<option value="${o}" ${f.aging === o ? 'selected' : ''}>${t(`filters.aging.${o}`)}</option>`
            )
            .join('')}
        </select>`,
      },
    ];

    panel.innerHTML = `<div class="filter-sections">${sections.map((s) => `<div class="filter-section"><h4 class="filter-section-title">${s.title}</h4>${s.html}</div>`).join('')}</div>`;
  }

  renderChips() {
    const chips = this.fm.getActiveFilterChips(this.labels);
    const container = this.container.querySelector('.filter-chips-container');
    container.hidden = !chips.length;
    container.innerHTML = chips
      .map(
        (c, i) =>
          `<div class="filter-chip filter-chip-${c.type}"><span class="chip-label">${c.label}</span><button class="chip-clear" data-action="clearChip" data-index="${i}">×</button></div>`
      )
      .join('');
    container
      .querySelectorAll('.chip-clear')
      .forEach((b) => (b.onclick = () => chips[b.dataset.index].clear()));
  }

  renderPresets() {
    const list = this.container.querySelector('.presets-list');
    const presets = this.fm.getPresets();
    list.innerHTML = presets.length
      ? presets
          .map(
            (p) =>
              `<div class="preset-item"><span class="preset-name">${p.name}</span><div class="preset-actions"><button class="preset-apply" data-action="applyPreset" data-id="${p.id}">✓</button><button class="preset-delete" data-action="deletePreset" data-id="${p.id}">🗑</button></div></div>`
          )
          .join('')
      : `<div class="presets-empty">${i18n.t('filters.noPresets')}</div>`;
  }

  updateBadge() {
    const count = this.fm.getActiveFilterCount();
    const clear = this.container.querySelector('.filter-clear-btn');
    clear.hidden = !count;
    if (count > 0) clear.style.display = 'block';
  }

  syncUI() {
    if (!this.state.expanded) return;
    const f = this.fm.getFilters();
    const setVal = (sel, val) => {
      const el = this.container.querySelector(sel);
      if (el && document.activeElement !== el) el.value = val ?? '';
    };

    setVal('[data-input="search"]', f.search.term);
    this.renderAdvanced();
  }

  bindEvents() {
    let searchTimer;

    this.container.addEventListener('input', (e) => {
      const t = e.target;
      const val = t.value;
      const act = t.dataset.input;

      if (act === 'search') {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => this.fm.setSearch(val.trim()), 300);
      } else if (['dueFrom', 'dueTo'].includes(act)) {
        this.fm.setDueDate({
          [act === 'dueFrom' ? 'from' : 'to']: val || null,
        });
      } else if (['startFrom', 'startTo'].includes(act)) {
        this.fm.setStartDate({
          [act === 'startFrom' ? 'from' : 'to']: val || null,
        });
      } else if (['effortMin', 'effortMax'].includes(act)) {
        const min = this.container.querySelector(
          '[data-input="effortMin"]'
        ).value;
        const max = this.container.querySelector(
          '[data-input="effortMax"]'
        ).value;
        this.fm.setEffort(
          min ? parseFloat(min) : null,
          max ? parseFloat(max) : null
        );
      }
    });

    this.container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action], [data-toggle]');
      if (!el) {
        if (
          !e.target.closest('.search-options-dropdown') &&
          !e.target.closest('.filter-presets-dropdown')
        ) {
          this.container
            .querySelectorAll(
              '.search-options-dropdown, .filter-presets-dropdown'
            )
            .forEach((d) => (d.hidden = true));
        }
        return;
      }

      if (el.tagName === 'SELECT') return;

      const action = el.dataset.action;
      const toggle = el.dataset.toggle;
      const val = el.value || el.dataset.val;

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
        togglePriority: () => {
          const selected = Array.from(
            this.container.querySelectorAll(
              '[data-action="togglePriority"]:checked'
            )
          ).map((c) => c.value);
          this.fm.setPriorities(selected);
        },
        savePreset: () => {
          const name = prompt(i18n.t('filters.enterPresetName'));
          if (name?.trim()) {
            this.fm.createPreset(name.trim());
            this.renderPresets();
          }
        },
        applyPreset: () => this.fm.applyPreset(el.dataset.id),
        deletePreset: () => {
          if (confirm(i18n.t('filters.deletePreset'))) {
            this.fm.deletePreset(el.dataset.id);
            this.renderPresets();
          }
        },
      };

      if (actions[action]) actions[action]();
    });

    this.container.addEventListener('change', (e) => {
      const t = e.target;
      const action = t.dataset.action;
      const val = t.value;

      if (action === 'dueStatus') {
        this.fm.setDueDate({ status: val });
      } else if (action === 'aging') {
        this.fm.setAging(val);
      } else if (action === 'completion') {
        this.fm.setCompletion(val);
      } else if (['searchField', 'searchOp', 'searchCase'].includes(action)) {
        this.updateSearchOpts();
      }
    });
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
