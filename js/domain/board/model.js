// Pure constructors for the board domain. All nondeterminism (ids, time)
// arrives as plain values — same inputs, same outputs, always.

// Normalizing card constructor. Field-for-field parity with the legacy
// createCard: supplied id/timestamps win, effort coerces to a number,
// everything else gets an explicit default.
export const mkCard = (data, fallbackId, nowIso) => ({
  text: '',
  description: '',
  startDate: null,
  dueDate: null,
  completed: false,
  priority: 'none',
  labels: [],
  logs: [],
  dependencies: [],
  ...data,
  id: data.id || fallbackId,
  effort: Number(data.effort) || 0,
  createdAt: data.createdAt || nowIso,
  updatedAt: data.updatedAt || nowIso,
});

export const mkLog = (text, columnTitle, id, nowIso) => ({
  id,
  text,
  columnTitle,
  createdAt: nowIso,
});

export const mkColumn = (title, id) => ({ id, title, cards: [] });

export const mkLabel = (name, color, id) => ({ id, name, color });

export const mkBoard = ({ id, name, columns, labels }) => ({
  id,
  name,
  columns,
  labels,
});
