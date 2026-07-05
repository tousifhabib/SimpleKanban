// Pure date math. Time is an argument, never an ambient read — every
// function that needs "now" receives it. The i18n-dependent formatters
// live in js/utils/dateUtils.js (shell side).

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

export const getDaysDiff = (d1, now) => {
  if (!d1) return 0;
  return Math.floor((new Date(now) - new Date(d1)) / MS_DAY);
};

export const getDaysUntil = (d, now) => {
  if (!d) return Infinity;
  return Math.ceil((toDate(d) - toDate(now)) / MS_DAY);
};

export const isToday = (date, now) => {
  const d = new Date(date);
  const t = new Date(now);
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

export const getEndOfWeek = (date) => {
  const d = new Date(date);
  // (7 - getDay()) % 7: a Sunday IS the end of its week — previously it
  // mapped to the NEXT Sunday, stretching "this week" by seven days.
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getAgingLevel = (updatedAt, completed, now) => {
  if (completed) return 0;
  const days = getDaysDiff(updatedAt, now);
  if (days >= AGING_THRESHOLDS.STALE) return 3;
  if (days >= AGING_THRESHOLDS.AGING) return 2;
  if (days >= AGING_THRESHOLDS.FRESH) return 1;
  return 0;
};

export const getDueDateStatus = (dueDate, completed, now) => {
  if (!dueDate || completed) return '';
  const days = getDaysUntil(dueDate, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  // Same window as the DUE_SOON filter — the badge and the filter used
  // to disagree (<= 2 here vs <= 3 there).
  if (days <= DUE_SOON_DAYS) return 'due-soon';
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
