export const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);

  Object.entries(props).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') Object.assign(node.style, v);
    else if (k === 'class') node.className = v;
    else node[k] = v;
  });

  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
};
