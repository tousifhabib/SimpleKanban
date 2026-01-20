import { generateId } from '../utils/idUtils.js';
import { i18n } from '../services/i18n/i18nService.js';

const TEMPLATE_DEFINITIONS = {
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

export function createBoardFromTemplate(templateType = DEFAULT_TEMPLATE) {
  const template =
    TEMPLATE_DEFINITIONS[templateType] ||
    TEMPLATE_DEFINITIONS[DEFAULT_TEMPLATE];

  const locale = i18n.getLocale();
  const templateLocale =
    locale.templates[templateType] || locale.templates[DEFAULT_TEMPLATE];

  const columns = template.columns.map((columnKey) => ({
    id: generateId('column'),
    title: templateLocale?.columns?.[columnKey] || columnKey,
    cards: [],
  }));

  const labels = template.labels.map((label) => ({
    id: generateId('label'),
    name: templateLocale?.labels?.[label.key] || label.key,
    color: label.color,
  }));

  return { columns, labels };
}

export function getTemplateKeys() {
  return Object.keys(TEMPLATE_DEFINITIONS);
}
