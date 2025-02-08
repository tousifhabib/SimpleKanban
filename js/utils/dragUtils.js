export function getCardAfterElement(container, y) {
    const cards = Array.from(container.querySelectorAll('.card:not(.dragging)'));
    return cards.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}

export function getColumnAfterElement(container, x) {
    const columns = Array.from(container.querySelectorAll('.column:not(.dragging)'));
    return columns.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}

export function addDebugInnerBoxToElement(element, ratio = 0.8) {
    const w = element.offsetWidth * ratio;
    const h = element.offsetHeight * ratio;
    const left = (element.offsetWidth - w) / 2;
    const top = (element.offsetHeight - h) / 2;
    let overlay = element.querySelector('.debug-inner-box');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'debug-inner-box';
        overlay.style.position = 'absolute';
        overlay.style.border = '2px dashed red';
        overlay.style.pointerEvents = 'none';
        if (window.getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        element.appendChild(overlay);
    }
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
}