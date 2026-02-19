import { el } from '../../utils/domUtils.js';

export const renderCreateBoardModal = () =>
  el(
    'div',
    { class: 'modal', id: 'createBoardModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'createBoardOverlay' }),
    el(
      'div',
      { class: 'modal-content', role: 'dialog', 'aria-modal': 'true' },
      el(
        'h2',
        { dataset: { i18n: 'modals.createBoard.title' } },
        'Create New Board'
      ),
      el(
        'form',
        { id: 'createBoardForm' },
        el('input', {
          type: 'text',
          id: 'newBoardName',
          class: 'column-input',
          dataset: {
            i18n: 'modals.createBoard.placeholder',
            i18nAttr: 'placeholder',
          },
          required: true,
        }),
        el(
          'label',
          {
            class: 'card-detail-label',
            dataset: { i18n: 'modals.createBoard.templateLabel' },
          },
          'Template'
        ),
        el(
          'select',
          {
            id: 'newBoardTemplate',
            class: 'priority-select',
            style: { marginBottom: '16px' },
          },
          el(
            'option',
            {
              value: 'empty',
              dataset: { i18n: 'modals.createBoard.templates.empty' },
            },
            'Empty Board'
          ),
          el(
            'option',
            {
              value: 'basic',
              selected: true,
              dataset: { i18n: 'modals.createBoard.templates.basic' },
            },
            'Basic Kanban (To Do, Doing, Done)'
          ),
          el(
            'option',
            {
              value: 'software',
              dataset: { i18n: 'modals.createBoard.templates.software' },
            },
            'Software Dev (Backlog, Ready, In Progress, Review, Done)'
          ),
          el(
            'option',
            {
              value: 'sales',
              dataset: { i18n: 'modals.createBoard.templates.sales' },
            },
            'Sales Pipeline (Lead, Contacted, Proposal, Closed)'
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
              dataset: { i18n: 'modals.createBoard.btnCreate' },
            },
            'Create'
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              id: 'cancelCreateBoard',
              dataset: { i18n: 'modals.createBoard.btnCancel' },
            },
            'Cancel'
          )
        )
      )
    )
  );

export const renderRenameBoardModal = () =>
  el(
    'div',
    { class: 'modal', id: 'renameBoardModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'renameBoardOverlay' }),
    el(
      'div',
      { class: 'modal-content', role: 'dialog', 'aria-modal': 'true' },
      el(
        'h2',
        { dataset: { i18n: 'modals.renameBoard.title' } },
        'Rename Board'
      ),
      el(
        'form',
        { id: 'renameBoardForm' },
        el('input', {
          type: 'text',
          id: 'renameBoardName',
          class: 'column-input',
          dataset: {
            i18n: 'modals.renameBoard.placeholder',
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
              dataset: { i18n: 'modals.renameBoard.btnSave' },
            },
            'Save'
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              id: 'cancelRenameBoard',
              dataset: { i18n: 'modals.renameBoard.btnCancel' },
            },
            'Cancel'
          )
        )
      )
    )
  );

export const renderDeleteBoardModal = () =>
  el(
    'div',
    { class: 'modal', id: 'deleteBoardModal', 'aria-hidden': 'true' },
    el('div', { class: 'modal-overlay', id: 'deleteBoardOverlay' }),
    el(
      'div',
      { class: 'modal-content', role: 'dialog', 'aria-modal': 'true' },
      el(
        'h2',
        { dataset: { i18n: 'modals.deleteBoard.title' } },
        'Delete Board'
      ),
      el('p', { style: { marginTop: '0' }, id: 'deleteBoardMessage' }),
      el(
        'div',
        { class: 'button-group' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            id: 'confirmDeleteBoard',
            dataset: { i18n: 'modals.deleteBoard.btnDelete' },
          },
          'Delete'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-secondary',
            id: 'cancelDeleteBoard',
            dataset: { i18n: 'modals.deleteBoard.btnCancel' },
          },
          'Cancel'
        )
      )
    )
  );
