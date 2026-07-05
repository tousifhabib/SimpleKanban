// Pure translation lookup.

import { describe, it, expect } from 'vitest';
import {
  lookupKey,
  interpolate,
  humanizeKey,
  translate,
} from '../../js/domain/i18n/translate.js';
import { Just, Nothing } from '../../js/fp/maybe.js';

const locales = {
  en: {
    a: { b: { c: 'hello {name}' } },
    count: '{n} items',
    onlyEn: 'english only',
  },
  de: {
    a: { b: { c: 'hallo {name}' } },
  },
};

describe('lookupKey', () => {
  it('resolves dot paths to Just(string), Nothing otherwise', () => {
    expect(lookupKey(locales.en)('a.b.c')).toEqual(Just('hello {name}'));
    expect(lookupKey(locales.en)('a.b.missing')).toEqual(Nothing);
    // non-string terminal (an object) is Nothing
    expect(lookupKey(locales.en)('a.b')).toEqual(Nothing);
  });
});

describe('interpolate', () => {
  it('substitutes named params, keeps unknown placeholders as their name', () => {
    expect(interpolate('hi {x} and {y}', { x: 'a' })).toBe('hi a and y');
  });

  it('substitutes falsy values (0) correctly', () => {
    expect(interpolate('{n} items', { n: 0 })).toBe('0 items');
  });
});

describe('translate', () => {
  const t = translate(locales);

  it('uses the active language when the key exists', () => {
    expect(t('de')('a.b.c', { name: 'X' })).toBe('hallo X');
  });

  it('falls back to English for keys missing in the active language', () => {
    expect(t('de')('onlyEn')).toBe('english only');
  });

  it('humanizes keys missing everywhere instead of leaking the dot path', () => {
    expect(t('en')('filters.aging.dueThisWeek')).toBe('Due this week');
    expect(t('de')('some.missing.stale')).toBe('Stale');
  });
});

describe('humanizeKey', () => {
  it('un-camelCases the last segment and capitalizes it', () => {
    expect(humanizeKey('a.b.dueThisWeek')).toBe('Due this week');
    expect(humanizeKey('noDueDate')).toBe('No due date');
    expect(humanizeKey('plain')).toBe('Plain');
  });
});
