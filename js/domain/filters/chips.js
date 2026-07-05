// Active-filter chips as pure data: (filters, labels, t) -> [{type, label}].
// Clearing is the caller's concern (dispatch filters/cleared), not a
// closure smuggled inside the data.

import { DUE_STATUS, COMPLETION_STATUS, AGING_OPTIONS } from './model.js';

const CHIP_CONFIGS = [
  {
    key: 'search',
    test: (f) => f.search.term,
    label: (f, labels, t) => t('filters.chips.search', { term: f.search.term }),
  },
  {
    key: 'labels',
    test: (f) => f.labels.selected.length,
    label: (f, labels) =>
      `Labels (${f.labels.matchMode}): ${f.labels.selected
        .map((id) => labels.find((l) => l.id === id)?.name || id)
        .join(', ')}`,
  },
  {
    key: 'priority',
    test: (f) => f.priority.selected.length,
    label: (f) => `Priority: ${f.priority.selected.join(', ')}`,
  },
  {
    key: 'dueDate',
    test: (f) =>
      f.dueDate.status !== DUE_STATUS.ALL || f.dueDate.from || f.dueDate.to,
    label: (f, labels, t) => {
      const parts = [];
      if (f.dueDate.status !== DUE_STATUS.ALL)
        parts.push(t(`filters.dueStatus.${f.dueDate.status}`));
      if (f.dueDate.from) parts.push(`> ${f.dueDate.from}`);
      if (f.dueDate.to) parts.push(`< ${f.dueDate.to}`);
      return `Due: ${parts.join(' ')}`;
    },
  },
  {
    key: 'startDate',
    test: (f) => f.startDate.from || f.startDate.to,
    label: (f) => `Start: ${f.startDate.from || ''} - ${f.startDate.to || ''}`,
  },
  {
    key: 'completion',
    test: (f) => f.completion !== COMPLETION_STATUS.ALL,
    label: (f, labels, t) => t(`filters.completion.${f.completion}`),
  },
  {
    key: 'effort',
    test: (f) => f.effort.min !== null || f.effort.max !== null,
    label: (f) => `Effort: ${f.effort.min ?? 0}h - ${f.effort.max ?? '∞'}h`,
  },
  {
    key: 'aging',
    test: (f) => f.aging !== AGING_OPTIONS.ALL,
    label: (f, labels, t) => t(`filters.aging.${f.aging}`),
  },
];

export const activeChips = (filters, labels, t) =>
  CHIP_CONFIGS.filter((cfg) => cfg.test(filters)).map((cfg) => ({
    type: cfg.key,
    label: cfg.label(filters, labels, t),
  }));
