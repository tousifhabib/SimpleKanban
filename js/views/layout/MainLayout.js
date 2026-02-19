import { el } from '../../utils/domUtils.js';

export const renderMainLayout = () => [
  el(
    'div',
    { id: 'kanbanView' },
    el(
      'div',
      { class: 'filter-bar', id: 'filterBar' },
      el(
        'div',
        { class: 'filter-group' },
        el(
          'span',
          { class: 'filter-label', dataset: { i18n: 'filters.label' } },
          'Filter by:'
        ),
        el(
          'select',
          { id: 'filterLabel', class: 'filter-select' },
          el(
            'option',
            { value: 'all', dataset: { i18n: 'filters.allLabels' } },
            'All Labels'
          )
        ),
        el(
          'select',
          { id: 'filterPriority', class: 'filter-select' },
          el(
            'option',
            { value: 'all', dataset: { i18n: 'filters.allPriorities' } },
            'All Priorities'
          ),
          el(
            'option',
            { value: 'high', dataset: { i18n: 'card.priorities.high' } },
            'High'
          ),
          el(
            'option',
            { value: 'medium', dataset: { i18n: 'card.priorities.medium' } },
            'Medium'
          ),
          el(
            'option',
            { value: 'low', dataset: { i18n: 'card.priorities.low' } },
            'Low'
          ),
          el(
            'option',
            { value: 'none', dataset: { i18n: 'card.priorities.none' } },
            'None'
          )
        ),
        el(
          'button',
          {
            id: 'clearFilters',
            class: 'btn-clear-filters',
            dataset: { i18n: 'filters.clear' },
          },
          'Clear'
        )
      )
    ),
    el('div', { class: 'kanban-container', id: 'kanbanContainer' })
  ),
  el('div', { id: 'ganttView', class: 'gantt-view', hidden: true }),
];
