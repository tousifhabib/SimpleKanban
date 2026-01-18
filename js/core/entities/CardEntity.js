import { generateId } from '../../utils/id.js';

export default class CardEntity {
  constructor(data = {}) {
    Object.assign(
      this,
      {
        id: generateId('card'),
        text: '',
        description: '',
        startDate: null,
        dueDate: null,
        completed: false,
        priority: 'none',
        effort: 0,
        labels: [],
        logs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { ...data, effort: data.effort !== undefined ? Number(data.effort) : 0 }
    );
  }

  update(updates) {
    Object.assign(this, updates);
    this.touch();
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }

  toggleComplete() {
    this.completed = !this.completed;
    this.touch();
  }

  addLog(text, columnTitle) {
    this.logs.push({
      id: generateId('log'),
      text,
      columnTitle,
      createdAt: new Date().toISOString(),
    });
    this.touch();
  }

  getAgeInDays() {
    return this.updatedAt
      ? Math.floor((new Date() - new Date(this.updatedAt)) / 86400000)
      : 0;
  }

  getAgingStatus() {
    if (this.completed) return 0;
    const days = this.getAgeInDays();
    return [14, 7, 3].findIndex((limit) => days >= limit) + 1 || 0;
  }

  getDueDateStatus() {
    if (!this.dueDate || this.completed) return '';
    const diff = Math.ceil(
      (new Date(this.dueDate).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
        86400000
    );
    return diff < 0
      ? 'overdue'
      : diff === 0
        ? 'due-today'
        : diff <= 2
          ? 'due-soon'
          : '';
  }
}
