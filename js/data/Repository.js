import { loadFromLocalStorage, saveToLocalStorage } from './LocalStorage.js';

const STORAGE_KEY = 'flexibleKanbanState';

export default class Repository {
  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  load() {
    return loadFromLocalStorage(this.key);
  }

  save(state) {
    saveToLocalStorage(this.key, state);
  }
}
