// dom.js
// Tiny helpers to build menus with plain HTML.
//   el('div', 'panel', [child, 'text'])

export function el(tag, className = '', children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return node;
}

export function uiRoot() {
  return document.getElementById('ui');
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// True while the player is typing in a text box (the game should not react to keys then)
export function typing() {
  const a = document.activeElement;
  return Boolean(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
}
