export const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);

  for (const k of Object.keys(props)) {
    const v = props[k];

    if (v == null || v === false) continue;

    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k === 'class' || k === 'className') {
      node.className = String(v);
    } else if (k in node && typeof v !== 'string') {
      node[k] = v;
    } else {
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }

  node.append(
    ...children.flat(Infinity).filter((c) => c != null && c !== false)
  );

  return node;
};
