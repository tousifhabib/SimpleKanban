import { el } from '../../utils/domUtils.js';

export const renderHeader = () =>
  el(
    'header',
    {},
    el(
      'div',
      { class: 'header-section' },
      el('h1', { dataset: { i18n: 'header.title' } }, 'Simple Kanban'),
      el(
        'nav',
        { class: 'header-nav' },
        el(
          'button',
          {
            class: 'nav-btn active',
            dataset: { view: 'kanban', i18n: 'nav.kanban' },
          },
          '📋 Kanban'
        ),
        el(
          'button',
          { class: 'nav-btn', dataset: { view: 'gantt', i18n: 'nav.gantt' } },
          '📊 Gantt'
        )
      ),
      el('select', {
        id: 'langSelector',
        class: 'board-select',
        style: { marginLeft: '10px', width: 'auto' },
      }),
      el(
        'div',
        { class: 'board-selector-wrapper' },
        el('select', { id: 'boardSelector', class: 'board-select' }),
        el(
          'button',
          {
            class: 'header-btn-icon',
            id: 'addBoardBtn',
            dataset: { i18n: 'header.titles.addBoard', i18nAttr: 'title' },
          },
          '+'
        ),
        el(
          'button',
          {
            class: 'header-btn-icon',
            id: 'renameBoardBtn',
            dataset: { i18n: 'header.titles.renameBoard', i18nAttr: 'title' },
          },
          '✏️'
        ),
        el(
          'button',
          {
            class: 'header-btn-icon danger',
            id: 'deleteBoardBtn',
            dataset: { i18n: 'header.titles.deleteBoard', i18nAttr: 'title' },
          },
          '🗑'
        )
      )
    ),
    el(
      'div',
      { class: 'header-actions', id: 'kanbanActions' },
      el(
        'button',
        {
          class: 'header-btn randomizer-btn',
          id: 'randomPickerBtn',
          dataset: { i18n: 'header.pickForMe' },
        },
        '🎲 Pick for me'
      ),
      el(
        'button',
        {
          class: 'header-btn-icon',
          id: 'optionsBtn',
          dataset: { i18n: 'header.titles.options', i18nAttr: 'title' },
        },
        '⚙️'
      ),
      el('div', { class: 'divider' }),
      el('input', {
        type: 'file',
        id: 'importFileInput',
        hidden: true,
        accept: '.json',
      }),
      el(
        'button',
        {
          class: 'header-btn',
          id: 'importBtn',
          dataset: { i18n: 'header.import' },
        },
        '📥 Import'
      ),
      el(
        'button',
        {
          class: 'header-btn',
          id: 'exportBtn',
          dataset: { i18n: 'header.export' },
        },
        '📤 Export'
      ),
      el('div', { class: 'divider' }),
      el(
        'button',
        {
          class: 'header-btn',
          id: 'manageLabelBtn',
          dataset: { i18n: 'header.labels' },
        },
        '🏷️ Labels'
      ),
      el(
        'button',
        {
          class: 'add-column-btn',
          id: 'addColumnBtn',
          dataset: { i18n: 'header.addColumn' },
        },
        '+ Add Column'
      )
    )
  );
