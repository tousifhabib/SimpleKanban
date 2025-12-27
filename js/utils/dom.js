export const $ = (idOrSel, root = document) =>
  idOrSel.startsWith("#") || idOrSel.startsWith(".")
    ? root.querySelector(idOrSel)
    : root.getElementById(idOrSel);

export const $$ = (sel, root = document) =>
  Array.from(root.querySelectorAll(sel));

export const on = (el, event, sel, fn, opts) => {
  el.addEventListener(
    event,
    (e) => {
      const t = e.target.closest(sel);
      if (t && el.contains(t)) fn(e, t);
    },
    opts
  );
};
