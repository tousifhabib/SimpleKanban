import { generateId } from '../utils/id.js';

const BOARD_TEMPLATES = {
  empty: {
    columns: [],
    labels: [
      { name: 'Important', color: '#e53935' },
      { name: 'Optional', color: '#43a047' },
    ],
  },

  basic: {
    columns: ['To Do', 'Doing', 'Done'],
    labels: [
      { name: 'High Priority', color: '#e53935' },
      { name: 'Blocked', color: '#ff9800' },
      { name: 'Waiting', color: '#8e24aa' },
      { name: 'Quick Win', color: '#43a047' },
    ],
  },

  software: {
    columns: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
    labels: [
      { name: 'Bug', color: '#e53935' },
      { name: 'Feature', color: '#43a047' },
      { name: 'Tech Debt', color: '#ff9800' },
      { name: 'Blocked', color: '#d32f2f' },
      { name: 'Needs Review', color: '#8e24aa' },
      { name: 'Documentation', color: '#1976d2' },
    ],
  },

  sales: {
    columns: ['Lead', 'Contacted', 'Proposal', 'Closed'],
    labels: [
      { name: 'Hot Lead', color: '#e53935' },
      { name: 'Follow-up', color: '#ff9800' },
      { name: 'Qualified', color: '#43a047' },
      { name: 'Budget Confirmed', color: '#1976d2' },
      { name: 'Stalled', color: '#8e24aa' },
    ],
  },
};

export const DEFAULT_TEMPLATE = 'basic';

export function createBoardFromTemplate(templateType = DEFAULT_TEMPLATE) {
  const template =
    BOARD_TEMPLATES[templateType] || BOARD_TEMPLATES[DEFAULT_TEMPLATE];

  const columns = template.columns.map((title) => ({
    id: generateId('column'),
    title,
    cards: [],
  }));

  const labels = template.labels.map((label) => ({
    id: generateId('label'),
    name: label.name,
    color: label.color,
  }));

  return { columns, labels };
}

export function getTemplateKeys() {
  return Object.keys(BOARD_TEMPLATES);
}
