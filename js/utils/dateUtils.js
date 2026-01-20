import { i18n } from '../services/i18n/i18nService.js';

export const MS_DAY = 86400000;

export const toDate = (d, end = false) => {
  if (!d) return null;
  const x = new Date(d);
  x.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, 999);
  return x;
};

export const getDaysDiff = (d1, d2 = new Date()) => {
  if (!d1) return 0;
  return Math.floor((new Date(d2) - new Date(d1)) / MS_DAY);
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

export const formatDate = (
  dateStr,
  options = { month: 'short', day: 'numeric' }
) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(i18n.getLanguage(), options);
};

export const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const t = (k, v) => i18n.t(k, v);

  if (seconds < 60) return t('card.meta.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('card.meta.minsAgo', { m: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('card.meta.hoursAgo', { h: hours });
  const days = Math.floor(hours / 24);
  return t('card.meta.daysAgo', { d: days });
};
