import { i18n } from '../services/i18n/i18nService.js';

export const MS_DAY = 86400000;
export const MS_HOUR = 3600000;
export const MS_MINUTE = 60000;

export const AGING_THRESHOLDS = {
  FRESH: 3,
  AGING: 7,
  STALE: 14,
};

export const DUE_SOON_DAYS = 3;
export const DUE_WEEK_DAYS = 7;

export const toDate = (d, end = false) => {
  if (!d) return null;
  const x = new Date(d);
  x.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return x;
};

export const getDaysDiff = (d1, d2 = new Date()) => {
  if (!d1) return 0;
  return Math.floor((new Date(d2) - new Date(d1)) / MS_DAY);
};

export const getDaysUntil = (d) => {
  if (!d) return Infinity;
  const target = toDate(d);
  const now = toDate(new Date());
  return Math.ceil((target - now) / MS_DAY);
};

export const isToday = (date) => {
  const d = new Date(date);
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
};

export const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

export const getEndOfWeek = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() + (7 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d;
};

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

export const getAgingLevel = (updatedAt, completed) => {
  if (completed) return 0;
  const days = getDaysDiff(updatedAt);
  if (days >= AGING_THRESHOLDS.STALE) return 3;
  if (days >= AGING_THRESHOLDS.AGING) return 2;
  if (days >= AGING_THRESHOLDS.FRESH) return 1;
  return 0;
};

export const getDueDateStatus = (dueDate, completed) => {
  if (!dueDate || completed) return '';
  const days = getDaysUntil(dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days <= 2) return 'due-soon';
  return '';
};

export const getWeekNumber = (date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / MS_DAY + 1) / 7);
};
