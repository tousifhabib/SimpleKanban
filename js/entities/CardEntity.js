import { generateId } from '../utils/idUtils.js';
import {
  getDaysDiff,
  getAgingLevel,
  getDueDateStatus,
} from '../utils/dateUtils.js';

const CARD_DEFAULTS = {
  text: '',
  description: '',
  startDate: null,
  dueDate: null,
  completed: false,
  priority: 'none',
  effort: 0,
  labels: [],
  logs: [],
  dependencies: [],
};

export default class CardEntity {
  constructor(data = {}) {
    const now = new Date().toISOString();
    Object.assign(this, {
      ...CARD_DEFAULTS,
      ...data,
      id: data.id || generateId('card'),
      effort: data.effort !== undefined ? Number(data.effort) : 0,
      labels: data.labels ?? [],
      logs: data.logs ?? [],
      dependencies: data.dependencies ?? [],
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    });
  }

  update(updates) {
    Object.assign(this, updates);
    this.touch();
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }

  getAgeInDays() {
    return getDaysDiff(this.updatedAt);
  }

  getAgingStatus() {
    return getAgingLevel(this.updatedAt, this.completed);
  }

  getDueDateStatus() {
    return getDueDateStatus(this.dueDate, this.completed);
  }
}
