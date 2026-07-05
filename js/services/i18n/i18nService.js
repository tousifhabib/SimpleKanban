// The shared i18n instance. Language is app-global configuration (like
// the locale data itself); static view renderers read `i18n.t` directly,
// while the app layer receives `t` by injection.

import { locales } from './locales/index.js';
import { createI18n } from './createI18n.js';
import { createStorage } from '../../ports/storage.js';

export const i18n = createI18n({
  locales,
  storage: createStorage(globalThis.localStorage),
  doc: globalThis.document,
});
