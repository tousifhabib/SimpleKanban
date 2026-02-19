import { el } from '../../utils/domUtils.js';

export const renderLabelModal = () =>
  el(
    'div',
    { class: 'modal', id: 'manageLabelModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'manageLabelOverlay' }),
    el(
      'div',
      {
        class: 'modal-content',
        role: 'dialog',
        'aria-labelledby': 'manageLabelTitle',
        'aria-modal': 'true',
      },
      el(
        'button',
        { class: 'modal-close-btn', id: 'manageLabelCloseBtn' },
        '×'
      ),
      el(
        'h2',
        {
          id: 'manageLabelTitle',
          dataset: { i18n: 'modals.manageLabels.title' },
        },
        'Manage Labels'
      ),
      el('div', { class: 'labels-list', id: 'labelsList' }),
      el(
        'div',
        { class: 'add-label-form' },
        el('input', {
          type: 'text',
          id: 'newLabelName',
          class: 'label-name-input',
          dataset: {
            i18n: 'modals.manageLabels.placeholderName',
            i18nAttr: 'placeholder',
          },
        }),
        el('input', {
          type: 'color',
          id: 'newLabelColor',
          class: 'label-color-input',
          value: '#5e6c84',
        }),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            id: 'addLabelBtn',
            dataset: { i18n: 'modals.manageLabels.btnAdd' },
          },
          'Add'
        )
      )
    )
  );
