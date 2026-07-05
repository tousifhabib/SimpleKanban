// Board templates as pure data + a pure instantiation function.
// Localized titles and fresh ids are inputs, not ambient dependencies.

import { mkColumn, mkLabel } from './model.js';

export const TEMPLATE_DEFINITIONS = {
  empty: {
    columns: [],
    labels: [
      { key: 'important', color: '#e53935' },
      { key: 'optional', color: '#43a047' },
    ],
  },

  basic: {
    columns: ['todo', 'doing', 'done'],
    labels: [
      { key: 'highPriority', color: '#e53935' },
      { key: 'blocked', color: '#ff9800' },
      { key: 'waiting', color: '#8e24aa' },
      { key: 'quickWin', color: '#43a047' },
    ],
  },

  software: {
    columns: ['backlog', 'ready', 'inProgress', 'review', 'done'],
    labels: [
      { key: 'bug', color: '#e53935' },
      { key: 'feature', color: '#43a047' },
      { key: 'techDebt', color: '#ff9800' },
      { key: 'blocked', color: '#d32f2f' },
      { key: 'needsReview', color: '#8e24aa' },
      { key: 'documentation', color: '#1976d2' },
    ],
  },

  sales: {
    columns: ['lead', 'contacted', 'proposal', 'closed'],
    labels: [
      { key: 'hotLead', color: '#e53935' },
      { key: 'followUp', color: '#ff9800' },
      { key: 'qualified', color: '#43a047' },
      { key: 'budgetConfirmed', color: '#1976d2' },
      { key: 'stalled', color: '#8e24aa' },
    ],
  },
};

export const DEFAULT_TEMPLATE = 'basic';

export const templateKeys = () => Object.keys(TEMPLATE_DEFINITIONS);

// instantiateTemplate: (type, localeTemplates, newId) -> { columns, labels }
// localeTemplates is the locale's `templates` record; newId mints ids.
export const instantiateTemplate = (templateType, localeTemplates, newId) => {
  const type = TEMPLATE_DEFINITIONS[templateType]
    ? templateType
    : DEFAULT_TEMPLATE;
  const template = TEMPLATE_DEFINITIONS[type];
  const loc = localeTemplates?.[type] || localeTemplates?.[DEFAULT_TEMPLATE];

  return {
    columns: template.columns.map((key) =>
      mkColumn(loc?.columns?.[key] || key, newId('column'))
    ),
    labels: template.labels.map((label) =>
      mkLabel(
        loc?.labels?.[label.key] || label.key,
        label.color,
        newId('label')
      )
    ),
  };
};
