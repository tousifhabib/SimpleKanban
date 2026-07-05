// Filter panel as a closure factory. All render helpers are pure
// functions of (filters, deps); interaction handlers dispatch to the
// filter store. Behavior preserved verbatim from the legacy panel,
// including the 300ms search debounce and the skip-sync-while-focused
// guard on the search input.

import { el } from '../utils/domUtils.js';
import {
  SEARCH_OPERATORS,
  LABEL_MATCH_MODE,
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
} from '../domain/filters/model.js';
import { isActive, activeFilterCount } from '../domain/filters/predicates.js';
import { activeChips } from '../domain/filters/chips.js';
import { fold as foldMaybe } from '../fp/maybe.js';

const renderSearchDropdown = (f, t) =>
  el(
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
        ` ${t(`filters.search.${field}`)}`
      )
    ),
    el('div', { class: 'search-option-divider' }),
    el(
      'label',
      {},
      `${t('filters.search.matchType')}: `,
      el(
        'select',
        { dataset: { action: 'searchOp' } },
        ...Object.values(SEARCH_OPERATORS).map((op) =>
          el(
            'option',
            { value: op, selected: f.search.operator === op },
            t(`filters.search.${op}`)
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
      ` ${t('filters.search.caseSensitive')}`
    )
  );

const renderPresetsDropdown = (t) =>
  el(
    'div',
    {
      class: 'filter-presets-dropdown',
      id: 'dropdown-presets',
      hidden: true,
    },
    el(
      'div',
      { class: 'presets-header' },
      el('span', {}, t('filters.presets')),
      el(
        'button',
        { class: 'preset-save-btn', dataset: { action: 'savePreset' } },
        `💾`
      )
    ),
    el('div', { class: 'presets-list' })
  );

const renderQuickBar = (f, t) =>
  el(
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
        placeholder: t('filters.searchPlaceholder'),
        value: f.search.term,
      }),
      el(
        'button',
        { class: 'search-options-btn', dataset: { toggle: 'searchOpts' } },
        '⚙️'
      ),
      renderSearchDropdown(f, t)
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
        `✕ ${t('filters.clear')}`
      )
    ),
    renderPresetsDropdown(t)
  );

const renderLabelsSection = (f, labels, t) =>
  el(
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
          t(`filters.labelMatch.${m}`)
        )
      )
    ),
    el(
      'div',
      { class: 'filter-labels-grid' },
      ...labels.map((l) => {
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

const renderPriorities = (f, t) =>
  el(
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
        ` ${t(`card.priorities.${p}`)}`
      )
    )
  );

const renderDate = (f, type, t) => {
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
              t(`filters.dueStatus.${s}`)
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
        placeholder: t('filters.range.from'),
      }),
      el('span', { class: 'date-range-separator' }, '→'),
      el('input', {
        type: 'date',
        class: 'filter-date-input',
        dataset: { input: `${type}To` },
        value: f[k].to || '',
        placeholder: t('filters.range.to'),
      })
    )
  );
};

const renderStatus = (f, t) =>
  el(
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
        ` ${t(`filters.completion.${s}`)}`
      )
    )
  );

const renderEffort = (f, t) =>
  el(
    'div',
    { class: 'filter-effort-range' },
    el('input', {
      type: 'number',
      class: 'filter-number-input',
      dataset: { input: 'effortMin' },
      placeholder: t('filters.range.min'),
      min: 0,
      step: 0.5,
      value: f.effort.min ?? '',
    }),
    el('span', { class: 'range-separator' }, '-'),
    el('input', {
      type: 'number',
      class: 'filter-number-input',
      dataset: { input: 'effortMax' },
      placeholder: t('filters.range.max'),
      min: 0,
      step: 0.5,
      value: f.effort.max ?? '',
    })
  );

const renderAging = (f, t) =>
  el(
    'select',
    { class: 'filter-select', dataset: { action: 'aging' } },
    ...Object.values(AGING_OPTIONS).map((o) =>
      el(
        'option',
        { value: o, selected: f.aging === o },
        t(`filters.aging.${o}`)
      )
    )
  );

const renderPresetsList = (presets, t) =>
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
    : el('div', { class: 'presets-empty' }, t('filters.noPresets'));

export const createFilterPanel = (
  container,
  {
    uiStore,
    labels: initialLabels = [],
    onFilterChange = () => {},
    t,
    ask,
    fx,
    subscribeI18n,
  }
) => {
  let labels = initialLabels;
  let expanded = false;

  const filters = () => uiStore.getState().filters;
  const dispatch = uiStore.dispatch;

  container.className = 'advanced-filter-panel';

  const renderAdvanced = () => {
    const f = filters();
    const panel = container.querySelector('.filter-advanced-panel');
    if (!panel) return;
    panel.hidden = !expanded;
    container
      .querySelector('[data-toggle="expanded"]')
      ?.classList.toggle('active', expanded);

    const sections = [
      {
        title: `🏷️ ${t('filters.sections.labels')}`,
        content: renderLabelsSection(f, labels, t),
      },
      {
        title: `🚩 ${t('filters.sections.priority')}`,
        content: renderPriorities(f, t),
      },
      {
        title: `🔴 ${t('filters.sections.dueDate')}`,
        content: renderDate(f, 'due', t),
      },
      {
        title: `🟢 ${t('filters.sections.startDate')}`,
        content: renderDate(f, 'start', t),
      },
      {
        title: `✅ ${t('filters.sections.status')}`,
        content: renderStatus(f, t),
      },
      {
        title: `⏱️ ${t('filters.sections.effort')}`,
        content: renderEffort(f, t),
      },
      {
        title: `📅 ${t('filters.sections.activity')}`,
        content: renderAging(f, t),
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
  };

  const renderChips = () => {
    const chips = activeChips(filters(), labels, t);
    const chipContainer = container.querySelector('.filter-chips-container');
    chipContainer.hidden = !chips.length;
    chipContainer.replaceChildren(
      ...chips.map((c) =>
        el(
          'div',
          { class: `filter-chip filter-chip-${c.type}` },
          el('span', { class: 'chip-label' }, c.label),
          el(
            'button',
            {
              class: 'chip-clear',
              onClick: () =>
                dispatch({ type: 'filters/cleared', payload: { key: c.type } }),
            },
            '×'
          )
        )
      )
    );
  };

  const renderPresets = () => {
    const list = container.querySelector('.presets-list');
    list.replaceChildren(renderPresetsList(uiStore.getState().presets, t));
  };

  const updateBadge = () => {
    container.querySelector('.filter-clear-btn').hidden =
      !activeFilterCount(filters());
  };

  const render = () => {
    container.replaceChildren(
      renderQuickBar(filters(), t),
      el('div', { class: 'filter-chips-container', hidden: true }),
      el('div', { class: 'filter-advanced-panel', hidden: true })
    );
    renderAdvanced();
    renderChips();
    updateBadge();
  };

  const syncUI = () => {
    if (expanded) renderAdvanced();
    renderChips();
    updateBadge();
    const searchInput = container.querySelector('[data-input="search"]');
    if (searchInput && document.activeElement !== searchInput)
      searchInput.value = filters().search.term ?? '';
  };

  const bindEvents = () => {
    let searchTimer;
    container.addEventListener('input', (e) => {
      const { input } = e.target.dataset;
      const val = e.target.value;
      const handlers = {
        search: () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(
            () =>
              dispatch({
                type: 'filters/searchSet',
                payload: { term: val.trim() },
              }),
            300
          );
        },
        dueFrom: () =>
          dispatch({
            type: 'filters/dueDateSet',
            payload: { patch: { from: val || null } },
          }),
        dueTo: () =>
          dispatch({
            type: 'filters/dueDateSet',
            payload: { patch: { to: val || null } },
          }),
        startFrom: () =>
          dispatch({
            type: 'filters/startDateSet',
            payload: { patch: { from: val || null } },
          }),
        startTo: () =>
          dispatch({
            type: 'filters/startDateSet',
            payload: { patch: { to: val || null } },
          }),
        // Each bound preserves the other — the legacy panel reset max
        // when min was typed (and vice versa), so both could never be set.
        effortMin: () =>
          dispatch({
            type: 'filters/effortSet',
            payload: {
              min: val ? parseFloat(val) : null,
              max: filters().effort.max,
            },
          }),
        effortMax: () =>
          dispatch({
            type: 'filters/effortSet',
            payload: {
              min: filters().effort.min,
              max: val ? parseFloat(val) : null,
            },
          }),
      };
      handlers[input]?.();
    });

    container.addEventListener('click', (e) => {
      const elem = e.target.closest('[data-action], [data-toggle]');
      if (!elem) {
        if (
          !e.target.closest(
            '.search-options-dropdown, .filter-presets-dropdown'
          )
        )
          container
            .querySelectorAll(
              '.search-options-dropdown, .filter-presets-dropdown'
            )
            .forEach((d) => (d.hidden = true));
        return;
      }
      const { action, toggle } = elem.dataset;

      if (toggle) {
        if (toggle === 'expanded') {
          expanded = !expanded;
          renderAdvanced();
        } else {
          const dropdown = container.querySelector(`#dropdown-${toggle}`);
          dropdown.hidden = !dropdown.hidden;
          if (toggle === 'presets' && !dropdown.hidden) renderPresets();
        }
        return;
      }

      const actions = {
        clearAll: () => {
          dispatch({ type: 'filters/allCleared', payload: {} });
          container.querySelector('[data-input="search"]').value = '';
        },
        toggleLabel: () =>
          dispatch({
            type: 'filters/labelToggled',
            payload: { id: elem.value },
          }),
        labelMode: () =>
          dispatch({
            type: 'filters/labelModeSet',
            payload: { mode: elem.value },
          }),
        togglePriority: () =>
          dispatch({
            type: 'filters/prioritiesSet',
            payload: {
              selected: Array.from(
                container.querySelectorAll(
                  '[data-action="togglePriority"]:checked'
                )
              ).map((c) => c.value),
            },
          }),
        savePreset: () =>
          foldMaybe(
            () => {},
            (name) => {
              dispatch({
                type: 'filters/presetCreated',
                payload: { id: fx.newId('p'), name: name.trim() },
              });
              renderPresets();
            }
          )(ask.prompt(t('filters.enterPresetName'))),
        applyPreset: () =>
          dispatch({
            type: 'filters/presetApplied',
            payload: { id: elem.dataset.id },
          }),
        deletePreset: () => {
          if (ask.confirm(t('filters.deletePreset'))) {
            dispatch({
              type: 'filters/presetDeleted',
              payload: { id: elem.dataset.id },
            });
            renderPresets();
          }
        },
      };
      actions[action]?.();
    });

    container.addEventListener('change', (e) => {
      const target = e.target;
      if (target.dataset.action === 'dueStatus')
        dispatch({
          type: 'filters/dueDateSet',
          payload: { patch: { status: target.value } },
        });
      else if (target.dataset.action === 'aging')
        dispatch({
          type: 'filters/agingSet',
          payload: { status: target.value },
        });
      else if (target.dataset.action === 'completion')
        dispatch({
          type: 'filters/completionSet',
          payload: { status: target.value },
        });
      else if (
        ['searchField', 'searchOp', 'searchCase'].includes(
          target.dataset.action
        )
      ) {
        dispatch({
          type: 'filters/searchSet',
          payload: {
            term: container.querySelector('[data-input="search"]').value.trim(),
            opts: {
              fields: Array.from(
                container.querySelectorAll(
                  '[data-action="searchField"]:checked'
                )
              ).map((c) => c.value),
              operator: container.querySelector('[data-action="searchOp"]')
                .value,
              caseSensitive: container.querySelector(
                '[data-action="searchCase"]'
              ).checked,
            },
          },
        });
      }
    });
  };

  render();
  uiStore.subscribe((state) => {
    syncUI();
    onFilterChange(state.filters);
  });
  subscribeI18n?.(() => render());
  bindEvents();

  return Object.freeze({
    setLabels(next) {
      labels = next;
      renderAdvanced();
    },
    isActive: () => isActive(filters()),
  });
};
