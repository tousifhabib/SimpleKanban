// Random-picker controller: `picked` is view-local closure state; the
// pick itself is a pure function — the rng port supplies u, the clock
// supplies now, and the result panel renders from data.

import { el } from '../utils/domUtils.js';
import * as sel from '../domain/board/selectors.js';
import { pickRandomCard, poolStats } from '../domain/picker/weights.js';

const renderPickedCard = (pick, labels) => {
  const cardLabels = labels.filter((l) => pick.card.labels?.includes(l.id));
  return [
    cardLabels.length
      ? el(
          'div',
          { class: 'randomizer-card-labels' },
          ...cardLabels.map((l) =>
            el(
              'span',
              { class: 'card-label', style: { background: l.color } },
              l.name
            )
          )
        )
      : null,
    el('div', { class: 'randomizer-card-title' }, pick.card.text),
  ];
};

export const createRandomPicker = ({
  ui,
  modals,
  pickerOptions,
  query,
  fx,
  t,
}) => {
  let picked = null;

  const populateOptions = () => {
    const options = pickerOptions.get();
    ['Priority', 'DueDate', 'Aging'].forEach((key) => {
      ui[`optFactor${key}`].checked = options[`factor${key}`];
    });
    ui.optExcludeCompleted.checked = options.excludeCompleted;
    ui.optColumnsSelector.replaceChildren(
      ...(sel.activeBoard(query())?.columns || []).map((col) =>
        el(
          'label',
          { class: 'options-column-checkbox' },
          el('input', {
            type: 'checkbox',
            value: col.id,
            checked:
              !options.includeColumns.length ||
              options.includeColumns.includes(col.id),
          }),
          el('span', {}, col.title)
        )
      )
    );
  };

  const saveOptions = () => {
    const checked = Array.from(
      ui.optColumnsSelector.querySelectorAll('input:checked')
    ).map((input) => input.value);
    pickerOptions.set({
      factorPriority: ui.optFactorPriority.checked,
      factorDueDate: ui.optFactorDueDate.checked,
      factorAging: ui.optFactorAging.checked,
      excludeCompleted: ui.optExcludeCompleted.checked,
      includeColumns:
        checked.length < ui.optColumnsSelector.children.length ? checked : [],
    });
  };

  const pickRandom = () => {
    const board = sel.activeBoard(query());
    picked = pickRandomCard(board, pickerOptions.get(), fx.now(), fx.random());

    ui.randomPickerResult.style.display = picked ? 'block' : 'none';
    ui.randomPickerEmpty.style.display = picked ? 'none' : 'block';
    ui.goToCardBtn.style.display = picked ? 'inline-block' : 'none';

    if (picked) {
      ui.randomPickerCard.replaceChildren(
        ...renderPickedCard(picked, sel.labels(query())).filter(Boolean)
      );
      ui.randomPickerColumnInfo.replaceChildren(
        el(
          'span',
          { class: 'column-indicator' },
          t('modals.randomPicker.inColumn')
        ),
        el('span', { class: 'column-name' }, picked.column.title)
      );
    }

    ui.randomPickerStats.replaceChildren(
      el(
        'div',
        { class: 'stats-text' },
        t('modals.randomPicker.stats', poolStats(pickerOptions.get())(board))
      )
    );
    modals.open('randomPicker');
  };

  return Object.freeze({
    pickRandom,
    populateOptions,
    saveOptions,
    picked: () => picked,
    clearPicked: () => {
      picked = null;
    },
  });
};
