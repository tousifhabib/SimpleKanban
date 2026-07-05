// Pure translation lookup: dot-path key resolution over a locale record
// with fallback-locale support, expressed with Maybe. Unifies the
// duplicated t()/fallback() walk from the legacy service.

import { Just, Nothing, isJust } from '../../fp/maybe.js';

// Maybe<string>: the template at a dot-separated key path.
export const lookupKey = (locale) => (key) => {
  let value = locale;
  for (const part of key.split('.')) {
    if (value && value[part]) value = value[part];
    else return Nothing;
  }
  return typeof value === 'string' ? Just(value) : Nothing;
};

export const interpolate = (template, params = {}) =>
  template.replace(/{(\w+)}/g, (_, name) =>
    params[name] !== undefined ? params[name] : name
  );

// Last-resort fallback: a readable phrase from the key's last segment
// ('filters.aging.dueThisWeek' -> 'Due this week') instead of leaking
// the raw dot-path into the UI.
export const humanizeKey = (key) => {
  const last = key.split('.').pop();
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// translate: (locales, fallbackLang) => (lang) => (key, params) => string
// Missing keys fall back to the fallback locale, then to a humanized key.
export const translate =
  (locales, fallbackLang = 'en') =>
  (lang) =>
  (key, params = {}) => {
    const primary = lookupKey(locales[lang])(key);
    if (isJust(primary)) return interpolate(primary.value, params);
    const fallback = lookupKey(locales[fallbackLang])(key);
    if (isJust(fallback)) return interpolate(fallback.value, params);
    return humanizeKey(key);
  };
