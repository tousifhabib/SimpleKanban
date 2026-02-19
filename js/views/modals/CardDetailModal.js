import { el } from '../../utils/domUtils.js';

export const renderCardDetailModal = () =>
  el(
    'div',
    { class: 'modal', id: 'cardDetailModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'cardDetailOverlay' }),
    el(
      'div',
      {
        class: 'modal-content card-detail-content',
        role: 'dialog',
        'aria-labelledby': 'cardDetailTitle',
        'aria-modal': 'true',
      },
      el('button', { class: 'modal-close-btn', id: 'cardDetailCloseBtn' }, '×'),
      el(
        'form',
        { id: 'cardDetailForm' },
        el(
          'div',
          { class: 'card-detail-header' },
          el(
            'label',
            { class: 'completion-toggle' },
            el('input', {
              type: 'checkbox',
              id: 'cardCompletedInput',
              class: 'completion-checkbox',
            }),
            el('span', { class: 'completion-checkmark' })
          ),
          el('input', {
            type: 'text',
            id: 'cardTitleInput',
            class: 'card-title-input',
            dataset: {
              i18n: 'card.detail.placeholderTitle',
              i18nAttr: 'placeholder',
            },
            required: true,
          })
        ),

        el(
          'div',
          { class: 'card-detail-section' },
          el(
            'label',
            { class: 'card-detail-label' },
            el('span', { class: 'card-detail-icon' }, '🏷️'),
            el('span', { dataset: { i18n: 'card.detail.labels' } }, 'Labels')
          ),
          el('div', { class: 'labels-selector', id: 'labelsSelector' })
        ),

        el(
          'div',
          { class: 'card-detail-row' },
          el(
            'div',
            { class: 'card-detail-field' },
            el(
              'label',
              { for: 'cardStartDateInput', class: 'card-detail-label' },
              el('span', { class: 'card-detail-icon' }, '🟢️'),
              el(
                'span',
                { dataset: { i18n: 'card.detail.startDate' } },
                'Start Date'
              )
            ),
            el('input', {
              type: 'date',
              id: 'cardStartDateInput',
              class: 'date-input',
            })
          ),
          el(
            'div',
            { class: 'card-detail-field' },
            el(
              'label',
              { for: 'cardDueDateInput', class: 'card-detail-label' },
              el('span', { class: 'card-detail-icon' }, '🔴'),
              el(
                'span',
                { dataset: { i18n: 'card.detail.dueDate' } },
                'Due Date'
              )
            ),
            el('input', {
              type: 'date',
              id: 'cardDueDateInput',
              class: 'date-input',
            })
          ),
          el(
            'div',
            { class: 'card-detail-field' },
            el(
              'label',
              { for: 'cardEffortInput', class: 'card-detail-label' },
              el('span', { class: 'card-detail-icon' }, '⏱️'),
              el(
                'span',
                { dataset: { i18n: 'card.detail.effort' } },
                'Effort (h)'
              )
            ),
            el('input', {
              type: 'number',
              id: 'cardEffortInput',
              class: 'date-input',
              step: '0.5',
              min: '0',
              placeholder: '0',
            })
          )
        ),

        el(
          'div',
          { class: 'card-detail-section' },
          el(
            'label',
            { for: 'cardPriorityInput', class: 'card-detail-label' },
            el('span', { class: 'card-detail-icon' }, '🚩'),
            el(
              'span',
              { dataset: { i18n: 'card.detail.priority' } },
              'Priority'
            )
          ),
          el(
            'select',
            { id: 'cardPriorityInput', class: 'priority-select' },
            el(
              'option',
              { value: 'none', dataset: { i18n: 'card.priorities.none' } },
              'None'
            ),
            el(
              'option',
              { value: 'low', dataset: { i18n: 'card.priorities.low' } },
              'Low'
            ),
            el(
              'option',
              { value: 'medium', dataset: { i18n: 'card.priorities.medium' } },
              'Medium'
            ),
            el(
              'option',
              { value: 'high', dataset: { i18n: 'card.priorities.high' } },
              'High'
            )
          )
        ),

        el(
          'div',
          { class: 'card-detail-section' },
          el(
            'label',
            { for: 'cardDescriptionInput', class: 'card-detail-label' },
            el('span', { class: 'card-detail-icon' }, '📝'),
            el(
              'span',
              { dataset: { i18n: 'card.detail.description' } },
              'Description'
            )
          ),
          el('textarea', {
            id: 'cardDescriptionInput',
            class: 'card-description-input',
            dataset: {
              i18n: 'card.detail.placeholderDesc',
              i18nAttr: 'placeholder',
            },
            rows: '4',
          })
        ),

        el(
          'div',
          { class: 'card-detail-section' },
          el(
            'label',
            { class: 'card-detail-label' },
            el('span', { class: 'card-detail-icon' }, '🔗'),
            el(
              'span',
              { dataset: { i18n: 'card.detail.dependencies' } },
              'Dependencies'
            )
          ),
          el(
            'div',
            { class: 'dependencies-section' },
            el('div', { id: 'dependenciesList', class: 'dependencies-list' }),
            el(
              'div',
              { class: 'add-dependency-form' },
              el(
                'select',
                {
                  id: 'dependencySelect',
                  class: 'priority-select',
                  style: { flex: '2' },
                },
                el(
                  'option',
                  { value: '', dataset: { i18n: 'card.detail.selectTask' } },
                  'Select a task...'
                )
              ),
              el(
                'select',
                {
                  id: 'dependencyTypeSelect',
                  class: 'priority-select',
                  style: { flex: '1', marginLeft: '8px' },
                },
                el('option', { value: 'FS' }, 'FS (Finish to Start)'),
                el('option', { value: 'SS' }, 'SS (Start to Start)')
              ),
              el(
                'button',
                {
                  type: 'button',
                  class: 'btn btn-secondary',
                  id: 'addDependencyBtn',
                  dataset: { i18n: 'card.detail.addDependency' },
                },
                'Add'
              )
            )
          )
        ),

        el(
          'div',
          { class: 'card-detail-section' },
          el(
            'label',
            { class: 'card-detail-label' },
            el('span', { class: 'card-detail-icon' }, '📋'),
            el('span', { dataset: { i18n: 'card.detail.workLog' } }, 'Work Log')
          ),
          el('div', { id: 'cardLogList', class: 'card-log-list' }),
          el(
            'div',
            { class: 'card-log-input-container' },
            el('textarea', {
              id: 'newLogInput',
              class: 'card-description-input',
              dataset: {
                i18n: 'card.detail.placeholderLog',
                i18nAttr: 'placeholder',
              },
              rows: '2',
              style: { minHeight: '60px', marginBottom: '8px' },
            }),
            el(
              'button',
              {
                type: 'button',
                class: 'btn btn-secondary',
                id: 'addLogBtn',
                style: { fontSize: '0.85rem' },
                dataset: { i18n: 'card.detail.addEntry' },
              },
              'Add Entry'
            )
          )
        ),

        el(
          'div',
          { class: 'button-group' },
          el(
            'button',
            {
              type: 'submit',
              class: 'btn btn-primary',
              dataset: { i18n: 'card.detail.save' },
            },
            'Save'
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              id: 'cancelCardDetail',
              dataset: { i18n: 'card.detail.cancel' },
            },
            'Cancel'
          )
        )
      )
    )
  );
