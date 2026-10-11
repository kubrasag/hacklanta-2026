// Toasts.js
// Little pop-up messages at the top ("New word: perro 🐶") and big centered banners.

import { el, uiRoot } from './dom';

let box = null;

function container() {
  if (!box) {
    box = el('div', 'toasts passive');
    uiRoot().appendChild(box);
  }
  return box;
}

export function toast({ icon = '✨', kicker = '', text = '', big = false, time = 2600 }) {
  const node = el('div', `toast panel${big ? ' big' : ''}`, [
    el('span', 'ic', icon),
    el('div', '', [kicker ? el('span', 'k', kicker) : null, el('span', '', text)]),
  ]);
  const list = container();
  list.appendChild(node);
  while (list.children.length > 4) list.firstChild.remove();
  setTimeout(() => node.classList.add('out'), time);
  setTimeout(() => node.remove(), time + 450);
}

export function banner(big, small = '', time = 2600) {
  const node = el('div', 'banner', [el('div', 'big', big), small ? el('div', 'small', small) : null]);
  uiRoot().appendChild(node);
  setTimeout(() => node.classList.add('out'), time);
  setTimeout(() => node.remove(), time + 900);
}
