export const el = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);

  Object.entries(props).forEach(([key, val]) => {
    if (key.startsWith('on') && typeof val === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), val);
    } else if (key === 'dataset') {
      Object.assign(element.dataset, val);
    } else if (key === 'style') {
      Object.assign(element.style, val);
    } else if (key === 'class') {
      element.className = val;
    } else if (val !== null && val !== undefined && val !== false) {
      element[key] = val;
    }
  });

  children.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    element.append(
      typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(child)
        : child
    );
  });

  return element;
};
