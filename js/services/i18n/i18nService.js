import { locales } from './locales.js';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
} from '../localStorageService.js';

const STORAGE_KEY = 'kanban_lang';

class I18nService {
  constructor() {
    this.currentLang = loadFromLocalStorage(STORAGE_KEY) || 'en';
    this.observers = [];
  }

  setLanguage(lang) {
    if (locales[lang]) {
      this.currentLang = lang;
      saveToLocalStorage(STORAGE_KEY, lang);
      this.updatePage();
      this.notify();
    }
  }

  getLanguage() {
    return this.currentLang;
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = locales[this.currentLang];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return this.fallback(key, params);
      }
    }

    if (typeof value !== 'string') return key;

    return value.replace(/{(\w+)}/g, (_, match) => {
      return params[match] !== undefined ? params[match] : match;
    });
  }

  fallback(key, params) {
    const keys = key.split('.');
    let value = locales['en'];
    for (const k of keys) {
      if (value && value[k]) value = value[k];
      else return key;
    }
    if (typeof value !== 'string') return key;
    return value.replace(/{(\w+)}/g, (_, match) => params[match] || match);
  }

  updatePage() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr'); // e.g., "placeholder" or "title"

      if (attr) {
        el.setAttribute(attr, this.t(key));
      } else {
        el.textContent = this.t(key);
      }
    });

    document.documentElement.lang = this.currentLang;
  }

  subscribe(fn) {
    this.observers.push(fn);
  }

  notify() {
    this.observers.forEach((fn) => fn(this.currentLang));
  }
}

export const i18n = new I18nService();
