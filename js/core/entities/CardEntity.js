import { generateId } from '../../utils/id.js';

export default class CardEntity {
  constructor(data = {}) {
    this.id = data.id || generateId('card');
    this.text = data.text || '';
    this.description = data.description || '';
    this.startDate = data.startDate || null;
    this.dueDate = data.dueDate || null;
    this.completed = data.completed || false;
    this.priority = data.priority || 'none';
    this.effort = data.effort !== undefined ? Number(data.effort) : 0;
    this.labels = data.labels || [];
    this.logs = data.logs || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  update(updates) {
    Object.assign(this, updates);
    this.touch();
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }
  getAgeInDays() {
    if (!this.updatedAt) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((new Date() - new Date(this.updatedAt)) / msPerDay);
  }

  getAgingStatus() {
    if (this.completed) return 0;
    const days = this.getAgeInDays();
    if (days >= 14) return 3;
    if (days >= 7) return 2;
    if (days >= 3) return 1;
    return 0;
  }

  getDueDateStatus() {
    if (!this.dueDate || this.completed) return '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due - now) / 86400000);

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 2) return 'due-soon';
    return '';
  }
}
