import { el } from '../../utils/domUtils.js';

export const renderOptionsModal = () =>
  el(
    'div',
    { class: 'modal', id: 'optionsModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'optionsOverlay' }),
    el(
      'div',
      {
        class: 'modal-content',
        role: 'dialog',
        'aria-labelledby': 'optionsTitle',
        'aria-modal': 'true',
      },
      el('button', { class: 'modal-close-btn', id: 'optionsCloseBtn' }, '×'),
      el(
        'h2',
        { id: 'optionsTitle', dataset: { i18n: 'modals.options.title' } },
        'Options'
      ),

      el(
        'div',
        { class: 'options-section' },
        el(
          'h3',
          { dataset: { i18n: 'modals.options.randomizer.title' } },
          '🎲 Random Picker Settings'
        ),
        el(
          'p',
          {
            class: 'options-description',
            dataset: { i18n: 'modals.options.randomizer.description' },
          },
          'Configure how "Pick for me" selects your next task.'
        ),

        el(
          'div',
          { class: 'options-group' },
          el(
            'label',
            { class: 'options-checkbox' },
            el('input', {
              type: 'checkbox',
              id: 'optFactorPriority',
              checked: true,
            }),
            el(
              'span',
              { dataset: { i18n: 'modals.options.randomizer.factorPriority' } },
              'Weight by priority'
            )
          ),
          el(
            'span',
            {
              class: 'options-hint',
              dataset: { i18n: 'modals.options.randomizer.factorPriorityHint' },
            },
            'High priority cards are more likely to be picked'
          )
        ),

        el(
          'div',
          { class: 'options-group' },
          el(
            'label',
            { class: 'options-checkbox' },
            el('input', {
              type: 'checkbox',
              id: 'optFactorDueDate',
              checked: true,
            }),
            el(
              'span',
              { dataset: { i18n: 'modals.options.randomizer.factorDueDate' } },
              'Weight by due date'
            )
          ),
          el(
            'span',
            {
              class: 'options-hint',
              dataset: { i18n: 'modals.options.randomizer.factorDueDateHint' },
            },
            'Cards due sooner are more likely to be picked'
          )
        ),

        el(
          'div',
          { class: 'options-group' },
          el(
            'label',
            { class: 'options-checkbox' },
            el('input', {
              type: 'checkbox',
              id: 'optFactorAging',
              checked: true,
            }),
            el(
              'span',
              { dataset: { i18n: 'modals.options.randomizer.factorAging' } },
              'Weight by age'
            )
          ),
          el(
            'span',
            {
              class: 'options-hint',
              dataset: { i18n: 'modals.options.randomizer.factorAgingHint' },
            },
            'Older cards are more likely to be picked to prevent neglect'
          )
        ),

        el(
          'div',
          { class: 'options-group' },
          el(
            'label',
            { class: 'options-checkbox' },
            el('input', {
              type: 'checkbox',
              id: 'optExcludeCompleted',
              checked: true,
            }),
            el(
              'span',
              {
                dataset: { i18n: 'modals.options.randomizer.excludeCompleted' },
              },
              'Exclude completed cards'
            )
          )
        ),

        el(
          'div',
          { class: 'options-group' },
          el(
            'label',
            {
              class: 'card-detail-label',
              dataset: { i18n: 'modals.options.randomizer.includeColumns' },
            },
            'Include only these columns (leave empty for all):'
          ),
          el('div', { class: 'options-columns-list', id: 'optColumnsSelector' })
        )
      ),

      el(
        'div',
        { class: 'button-group', style: { marginTop: '24px' } },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            id: 'saveOptionsBtn',
            dataset: { i18n: 'modals.options.btnSave' },
          },
          'Save'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary',
            id: 'resetOptionsBtn',
            dataset: { i18n: 'modals.options.btnReset' },
          },
          'Reset to Defaults'
        )
      )
    )
  );
