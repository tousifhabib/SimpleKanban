export function generateId(type) {
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    return type === 'column' ? `column-${id}` : `card-${id}`;
}

export function saveToLocalStorage(key, state) {
    localStorage.setItem(key, JSON.stringify(state));
}

export function loadFromLocalStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}
