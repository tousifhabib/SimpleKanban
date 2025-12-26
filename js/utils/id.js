export const generateId = (prefix) =>
    `${prefix}-${(crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11))}`;
