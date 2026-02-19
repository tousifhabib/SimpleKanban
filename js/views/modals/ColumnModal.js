import { el } from '../../utils/domUtils.js';

export const renderColumnModal = () =>
  el(
    'div',
    { class: 'modal', id: 'addColumnModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'modalOverlay' }),
    el(
      'div',
      {
        class: 'modal-content',
        role: 'dialog',
        'aria-labelledby': 'modalTitle',
        'aria-modal': 'true',
      },
      el(
        'h2',
        { id: 'modalTitle', dataset: { i18n: 'modals.addColumn.title' } },
        'Add New Column'
      ),
      el(
        'form',
        { id: 'addColumnForm' },
        el('input', {
          type: 'text',
          id: 'columnTitleInput',
          class: 'column-input',
          dataset: {
            i18n: 'modals.addColumn.placeholder',
            i18nAttr: 'placeholder',
          },
          required: true,
        }),
        el(
          'div',
          { class: 'button-group' },
          el(
            'button',
            {
              type: 'submit',
              class: 'btn btn-primary',
              dataset: { i18n: 'modals.addColumn.btnAdd' },
            },
            'Add Column'
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              id: 'cancelAddColumn',
              dataset: { i18n: 'modals.addColumn.btnCancel' },
            },
            'Cancel'
          )
        )
      )
    )
  );
