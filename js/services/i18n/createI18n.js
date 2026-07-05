// i18n runtime: a closure factory around the pure translate lookup.
// Holds the current language, persists it through the storage port, and
// sweeps [data-i18n] attributes on language change.

import { createObservable } from '../../core/Observable.js';
import { translate } from '../../domain/i18n/translate.js';
import { getOrElse } from '../../fp/result.js';

const STORAGE_KEY = 'kanban_lang';

export const createI18n = ({ locales, storage, doc }) => {
  const observable = createObservable();
  let currentLang = getOrElse(null)(storage.load(STORAGE_KEY).run()) || 'en';
  let t = translate(locales)(currentLang);

  const updatePage = () => {
    doc.querySelectorAll('[data-i18n]').forEach((elem) => {
      const key = elem.getAttribute('data-i18n');
      const attr = elem.getAttribute('data-i18n-attr');
      if (attr) elem.setAttribute(attr, t(key));
      else elem.textContent = t(key);
    });
    doc.documentElement.lang = currentLang;
  };

  return Object.freeze({
    t: (key, params) => t(key, params),

    getLanguage: () => currentLang,

    getLocale: () => locales[currentLang] || locales['en'],

    setLanguage(lang) {
      if (!locales[lang]) return;
      currentLang = lang;
      t = translate(locales)(currentLang);
      storage.save(STORAGE_KEY, lang).run();
      updatePage();
      observable.notify(currentLang);
    },

    subscribe: observable.subscribe,
  });
};
