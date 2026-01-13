import en from './en.js';
import de from './de.js';
import ja from './ja.js';
import zh from './zh.js';
import es from './es.js';
import ru from './ru.js';
import pt from './pt.js';
import bn from './bn.js';
import hi from './hi.js';
import ar from './ar.js';
import fr from './fr.js';
import it from './it.js';

export const locales = {
  en,
  de,
  ja,
  zh,
  es,
  ru,
  pt,
  bn,
  hi,
  ar,
  fr,
  it,
};

export const supportedLanguages = Object.keys(locales);

export const languageMeta = {
  en: { flag: '🇺🇸', short: 'EN', name: 'English' },
  ar: { flag: '🇸🇦', short: 'AR', name: 'العربية' },
  bn: { flag: '🇧🇩', short: 'BN', name: 'বাংলা' },
  de: { flag: '🇩🇪', short: 'DE', name: 'Deutsch' },
  es: { flag: '🇪🇸', short: 'ES', name: 'Español' },
  fr: { flag: '🇫🇷', short: 'FR', name: 'Français' },
  hi: { flag: '🇮🇳', short: 'HI', name: 'हिन्दी' },
  it: { flag: '🇮🇹', short: 'IT', name: 'Italiano' },
  ja: { flag: '🇯🇵', short: 'JP', name: '日本語' },
  pt: { flag: '🇵🇹', short: 'PT', name: 'Português' },
  ru: { flag: '🇷🇺', short: 'RU', name: 'Русский' },
  zh: { flag: '🇨🇳', short: 'ZH', name: '中文' },
};
