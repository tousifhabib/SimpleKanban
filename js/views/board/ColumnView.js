import CardView from './CardView.js';
import { i18n } from '../../services/i18n/i18nService.js';
import { el } from '../../utils/domUtils.js';

export default class ColumnView {
  constructor(columnData) {
    this.columnData = columnData;
  }

  render() {
    const { id, title, cards } = this.columnData;
    const totalEffort = cards.reduce(
      (sum, card) => sum + (Number(card.effort) || 0),
      0
    );
    const t = (k) => i18n.t(k);

    return el(
      'div',
      { class: 'column', draggable: true, dataset: { columnId: id } },
      this.renderHeader(title, totalEffort),
      el(
        'div',
        { class: 'cards' },
        cards.map((cardData) => new CardView(cardData).render())
      ),
      this.renderFooter(t)
    );
  }

  renderHeader(title, totalEffort) {
    return el(
      'div',
      { class: 'column-header' },
      el(
        'div',
        { class: 'column-title-container' },
        el(
          'h2',
          {
            class: 'column-title-text',
            title: 'Click to edit',
            dataset: { action: 'edit-column-title' },
          },
          title,
          totalEffort > 0
            ? el(
                'span',
                {
                  style: {
                    fontSize: '0.85rem',
                    fontWeight: 'normal',
                    opacity: '0.7',
                    marginLeft: '8px',
                  },
                },
                `(⏱️ ${totalEffort}h)`
              )
            : null
        ),
        el('input', {
          type: 'text',
          class: 'column-title-input',
          value: title,
          style: { display: 'none' },
        })
      ),
      el('button', { dataset: { action: 'delete-column' } }, '×')
    );
  }

  renderFooter(t) {
    return [
      el(
        'button',
        { class: 'add-card-btn', dataset: { action: 'toggle-add-card' } },
        `+ ${t('card.addBtnText')}`
      ),
      el(
        'div',
        { class: 'add-card-form' },
        el('textarea', {
          class: 'card-input',
          rows: 3,
          placeholder: t('card.addTitle'),
        }),
        el(
          'div',
          { class: 'button-group' },
          el(
            'button',
            {
              class: 'btn btn-primary',
              dataset: { action: 'confirm-add-card' },
            },
            t('card.btnAdd')
          ),
          el(
            'button',
            {
              class: 'btn btn-secondary',
              dataset: { action: 'cancel-add-card' },
            },
            t('card.btnCancel')
          )
        )
      ),
    ];
  }
}
