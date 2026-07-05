// Pure view: the manage-labels list.

import { el } from '../../utils/domUtils.js';

export const renderLabelsList = (labels) =>
  labels.map((label) =>
    el(
      'div',
      { class: 'label-item' },
      el(
        'span',
        { class: 'label-preview', style: { background: label.color } },
        label.name
      ),
      el(
        'div',
        { class: 'label-actions' },
        el(
          'button',
          { class: 'label-edit-btn', dataset: { id: label.id } },
          '✏️'
        ),
        el(
          'button',
          { class: 'label-delete-btn', dataset: { id: label.id } },
          '🗑️'
        )
      )
    )
  );
