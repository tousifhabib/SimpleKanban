import { el } from '../../utils/domUtils.js';

export const renderRandomPickerModal = () =>
  el(
    'div',
    { class: 'modal', id: 'randomPickerModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'randomPickerOverlay' }),
    el(
      'div',
      {
        class: 'modal-content randomizer-result-content',
        role: 'dialog',
        'aria-labelledby': 'randomPickerTitle',
        'aria-modal': 'true',
      },
      el(
        'button',
        { class: 'modal-close-btn', id: 'randomPickerCloseBtn' },
        '×'
      ),
      el(
        'div',
        { class: 'randomizer-header' },
        el('span', { class: 'randomizer-icon' }, '🎲'),
        el(
          'h2',
          {
            id: 'randomPickerTitle',
            dataset: { i18n: 'modals.randomPicker.title' },
          },
          'Your Next Task'
        )
      ),

      el(
        'div',
        { class: 'randomizer-result', id: 'randomPickerResult' },
        el('div', { class: 'randomizer-card-preview', id: 'randomPickerCard' }),
        el('div', {
          class: 'randomizer-column-info',
          id: 'randomPickerColumnInfo',
        })
      ),

      el(
        'div',
        {
          class: 'randomizer-empty',
          id: 'randomPickerEmpty',
          style: { display: 'none' },
        },
        el('span', { class: 'empty-icon' }, '🎉'),
        el(
          'p',
          { dataset: { i18n: 'modals.randomPicker.noCards' } },
          'No eligible cards found! You might be all caught up.'
        )
      ),

      el('div', { class: 'randomizer-stats', id: 'randomPickerStats' }),

      el(
        'div',
        { class: 'button-group' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            id: 'goToCardBtn',
            dataset: { i18n: 'modals.randomPicker.goToCard' },
          },
          'Open Card'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary',
            id: 'pickAgainBtn',
            dataset: { i18n: 'modals.randomPicker.pickAgain' },
          },
          '🎲 Pick Again'
        )
      )
    )
  );
