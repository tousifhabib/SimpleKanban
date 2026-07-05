// Shell-side date utilities: ambient-now conveniences over the pure math
// in domain/dates.js, plus the i18n-dependent formatters.

import { i18n } from '../services/i18n/i18nService.js';
import * as dates from '../domain/dates.js';

export const {
  MS_DAY,
  MS_HOUR,
  MS_MINUTE,
  AGING_THRESHOLDS,
  DUE_SOON_DAYS,
  DUE_WEEK_DAYS,
  toDate,
  isWeekend,
  getWeekNumber,
} = dates;

export const getDaysDiff = (d1, d2 = new Date()) => dates.getDaysDiff(d1, d2);

export const getDaysUntil = (d) => dates.getDaysUntil(d, new Date());

export const isToday = (date) => dates.isToday(date, new Date());

export const getEndOfWeek = (date = new Date()) => dates.getEndOfWeek(date);

export const getAgingLevel = (updatedAt, completed) =>
  dates.getAgingLevel(updatedAt, completed, new Date());

export const getDueDateStatus = (dueDate, completed) =>
  dates.getDueDateStatus(dueDate, completed, new Date());

export const formatDate = (
  dateStr,
  options = { month: 'short', day: 'numeric' }
) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(i18n.getLanguage(), options);
};

export const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  const t = (k, v) => i18n.t(k, v);

  if (seconds < 60) return t('card.meta.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('card.meta.minsAgo', { m: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('card.meta.hoursAgo', { h: hours });
  const days = Math.floor(hours / 24);
  return t('card.meta.daysAgo', { d: days });
};
